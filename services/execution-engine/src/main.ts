import Redis from "ioredis";
import { Pool } from "pg";
import axios from "axios";
import { createHmac, randomUUID } from "node:crypto";
import { getEnv } from "@libs/config";
import { type TradeConfirmation } from "@libs/shared";

interface ExecutionResult {
  status: "executed" | "rejected";
  orderId?: string;
  executedPrice?: number;
  executedQty?: number;
  reason?: string;
  errorMessage?: string;
}

interface BinanceOrderResponse {
  symbol: string;
  orderId: number;
  executedQty: string;
  cummulativeQuoteQty: string;
}

function normalizeTradingMode(mode: string): "paper" | "real" {
  return mode === "real" || mode === "live" ? "real" : "paper";
}

function resolveExecutionErrorReason(error: unknown): { reason: string; errorMessage: string } {
  if (axios.isAxiosError(error)) {
    const axiosError = error as {
      response?: { data?: { code?: number; msg?: string } };
      message?: string;
    };
    const responseData = axiosError.response?.data as { code?: number; msg?: string } | undefined;
    const code = responseData?.code;
    const message = responseData?.msg || axiosError.message || "axios-request-failed";

    if (code === -2010 || code === -2019 || /insufficient/i.test(message)) {
      return {
        reason: "insufficient-funds",
        errorMessage: message
      };
    }

    return {
      reason: "binance-api-error",
      errorMessage: message
    };
  }

  if (error instanceof Error) {
    return {
      reason: "internal-error",
      errorMessage: error.message
    };
  }

  return {
    reason: "internal-error",
    errorMessage: "unknown-error"
  };
}

async function simulatePaperOrder(confirmation: TradeConfirmation): Promise<ExecutionResult> {
  const env = getEnv();
  const estimatedPrice = Number(((confirmation.stopLoss + confirmation.takeProfit) / 2).toFixed(2));

  return {
    status: "executed",
    orderId: `paper-${randomUUID()}`,
    executedPrice: estimatedPrice,
    executedQty: Number(env.PAPER_ORDER_QUANTITY.toFixed(6)),
    reason: `paper-simulated-${confirmation.action}`
  };
}

async function executeBinanceSpotOrder(confirmation: TradeConfirmation): Promise<ExecutionResult> {
  const env = getEnv();
  const side = confirmation.action === "buy" ? "BUY" : "SELL";
  const timestamp = Date.now();

  const params = new URLSearchParams({
    symbol: confirmation.symbol,
    side,
    type: "MARKET",
    quantity: "0.001",
    timestamp: String(timestamp),
    recvWindow: "5000"
  });

  const signature = createHmac("sha256", env.BINANCE_API_SECRET)
    .update(params.toString())
    .digest("hex");

  const response = await axios.post<BinanceOrderResponse>(
    `${env.BINANCE_BASE_URL}/api/v3/order`,
    `${params.toString()}&signature=${signature}`,
    {
      headers: {
        "X-MBX-APIKEY": env.BINANCE_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 10_000
    }
  );

  const executedQty = Number(response.data.executedQty || "0");
  const quoteQty = Number(response.data.cummulativeQuoteQty || "0");
  const executedPrice = executedQty > 0 ? quoteQty / executedQty : 0;

  return {
    status: "executed",
    orderId: String(response.data.orderId),
    executedPrice,
    executedQty,
    reason: "binance-spot-executed"
  };
}

async function executeTrade(confirmation: TradeConfirmation, mode: string): Promise<ExecutionResult> {
  if (!confirmation.approved || confirmation.action === "hold") {
    return { status: "rejected", reason: "not-approved-or-hold" };
  }

  const normalizedMode = normalizeTradingMode(mode);
  if (normalizedMode === "paper") {
    return simulatePaperOrder(confirmation);
  }

  return executeBinanceSpotOrder(confirmation);
}

async function publishExecutionEvent(
  publisher: Redis,
  confirmation: TradeConfirmation,
  result: ExecutionResult,
  mode: string
): Promise<void> {
  await publisher.publish(
    "order_executed",
    JSON.stringify({
      signalId: confirmation.signalId,
      symbol: confirmation.symbol,
      action: confirmation.action,
      status: result.status,
      orderId: result.orderId ?? null,
      executedPrice: result.executedPrice ?? null,
      executedQty: result.executedQty ?? null,
      tradingMode: normalizeTradingMode(mode),
      reason: result.reason ?? "ok",
      errorMessage: result.errorMessage ?? null,
      createdAt: new Date().toISOString()
    })
  );

  await publisher.publish(
    "execution.completed",
    JSON.stringify({
      ...confirmation,
      status: result.status,
      executedPrice: result.executedPrice ?? null,
      executedQty: result.executedQty ?? null,
      reason: result.reason ?? "ok",
      errorMessage: result.errorMessage ?? null,
      createdAt: new Date().toISOString()
    })
  );
}

async function bootstrap(): Promise<void> {
  const env = getEnv();

  const subscriber = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined
  });
  const publisher = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined
  });

  const db = new Pool({ connectionString: env.DATABASE_URL });

  await subscriber.ping();
  await db.query("select 1");
  await subscriber.subscribe("trade_confirmed", "trade.confirmed");

  subscriber.on("message", async (_channel: string, message: string) => {
    try {
      const confirmation = JSON.parse(message) as TradeConfirmation;
      const result = await executeTrade(confirmation, env.TRADING_MODE);

      await db.query(
        `insert into orders (tenant_id, symbol, side, status, trading_mode)
         values (
           (select id from tenants limit 1),
           $1,
           $2,
           $3,
           $4
         )`,
        [confirmation.symbol, confirmation.action, result.status, env.TRADING_MODE]
      );

      await publishExecutionEvent(publisher, confirmation, result, env.TRADING_MODE);

      if (result.status === "executed" && confirmation.action === "sell") {
        await publisher.publish(
          "position_closed",
          JSON.stringify({
            signalId: confirmation.signalId,
            symbol: confirmation.symbol,
            closeReason: "manual_sell",
            createdAt: new Date().toISOString()
          })
        );
      }
    } catch (error: unknown) {
      const failedConfirmation = JSON.parse(message) as TradeConfirmation;
      const normalizedError = resolveExecutionErrorReason(error);

      await db.query(
        `insert into orders (tenant_id, symbol, side, status, trading_mode)
         values (
           (select id from tenants limit 1),
           $1,
           $2,
           $3,
           $4
         )`,
        [failedConfirmation.symbol, failedConfirmation.action, "rejected", env.TRADING_MODE]
      );

      await publisher.publish(
        "order_executed",
        JSON.stringify({
          signalId: failedConfirmation.signalId,
          symbol: failedConfirmation.symbol,
          action: failedConfirmation.action,
          status: "rejected",
          orderId: null,
          executedPrice: null,
          executedQty: null,
          tradingMode: normalizeTradingMode(env.TRADING_MODE),
          reason: normalizedError.reason,
          errorMessage: normalizedError.errorMessage,
          createdAt: new Date().toISOString()
        })
      );

      await publisher.publish(
        "execution.completed",
        JSON.stringify({
          ...failedConfirmation,
          status: "rejected",
          executedPrice: null,
          executedQty: null,
          reason: normalizedError.reason,
          errorMessage: normalizedError.errorMessage,
          createdAt: new Date().toISOString()
        })
      );

      console.error("execution-engine message error", error);
    }
  });

}

void bootstrap();
