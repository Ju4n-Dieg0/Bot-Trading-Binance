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

async function simulatePaperOrder(confirmation: TradeConfirmation): Promise<ExecutionResult> {
  return {
    status: "executed",
    orderId: `paper-${randomUUID()}`,
    executedPrice: 0,
    executedQty: 0,
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

  subscriber.on("message", async (_channel, message) => {
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

      if (result.status === "executed") {
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
            tradingMode: normalizeTradingMode(env.TRADING_MODE),
            reason: result.reason ?? "ok",
            createdAt: new Date().toISOString()
          })
        );

        if (confirmation.action === "sell") {
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
      }

      await publisher.publish(
        "execution.completed",
        JSON.stringify({
          ...confirmation,
          status: result.status,
          reason: result.reason ?? "ok",
          createdAt: new Date().toISOString()
        })
      );
    } catch (error: unknown) {
      console.error("execution-engine message error", error);
    }
  });

}

void bootstrap();
