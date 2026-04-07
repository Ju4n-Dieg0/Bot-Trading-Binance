import Redis from "ioredis";
import { randomUUID } from "node:crypto";
import { getEnv } from "@libs/config";
import { type ProbabilitySignal, type TradeSignal } from "@libs/shared";

function resolveSignalAction(
  probabilityUp: number,
  buyThreshold: number,
  sellThreshold: number
): "buy" | "sell" | "hold" {
  if (probabilityUp >= buyThreshold) {
    return "buy";
  }

  if (probabilityUp <= sellThreshold) {
    return "sell";
  }

  return "hold";
}

function buildSignal(
  probability: ProbabilitySignal,
  action: "buy" | "sell",
  stopLossPct: number,
  takeProfitPct: number
): TradeSignal {

  const lastClose = probability.features.lastClose;
  const stopLoss =
    action === "buy"
      ? Number((lastClose * (1 - stopLossPct / 100)).toFixed(2))
      : Number((lastClose * (1 + stopLossPct / 100)).toFixed(2));

  const takeProfit =
    action === "buy"
      ? Number((lastClose * (1 + takeProfitPct / 100)).toFixed(2))
      : Number((lastClose * (1 - takeProfitPct / 100)).toFixed(2));

  return {
    signalId: randomUUID(),
    symbol: probability.symbol,
    action,
    probabilityUp: probability.probabilityUp,
    stopLoss,
    takeProfit,
    createdAt: new Date().toISOString()
  };
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

  await subscriber.subscribe("ai.probability.generated");

  subscriber.on("message", async (_channel, message) => {
    try {
      const probability = JSON.parse(message) as ProbabilitySignal;

      const action = resolveSignalAction(
        probability.probabilityUp,
        env.SIGNAL_BUY_THRESHOLD,
        env.SIGNAL_SELL_THRESHOLD
      );

      if (action === "hold") {
        return;
      }

      const signal = buildSignal(
        probability,
        action,
        env.DEFAULT_STOP_LOSS_PCT,
        env.DEFAULT_TAKE_PROFIT_PCT
      );
      await publisher.publish("signal_generated", JSON.stringify(signal));
      await publisher.publish("signal.generated", JSON.stringify(signal));
    } catch (error: unknown) {
      console.error("signal-engine message error", error);
    }
  });
}

void bootstrap();
