import Redis from "ioredis";
import { getEnv } from "@libs/config";
import { type RiskDecision, type TradeSignal } from "@libs/shared";

interface ExecutionCompletedEvent {
  action: "buy" | "sell" | "hold";
  status: "executed" | "rejected";
}

function calculateSuggestedPositionSizePct(signal: TradeSignal, maxRiskPerTradePct: number): number {
  const inferredEntry = (signal.stopLoss + signal.takeProfit) / 2;
  if (inferredEntry <= 0) {
    return 0;
  }

  const stopDistancePct = Math.abs((inferredEntry - signal.stopLoss) / inferredEntry) * 100;
  if (stopDistancePct <= 0) {
    return 0;
  }

  const suggested = maxRiskPerTradePct / stopDistancePct;
  const bounded = Math.min(Math.max(suggested * 100, 0), 100);
  return Number(bounded.toFixed(4));
}

function evaluateSignal(
  signal: TradeSignal,
  maxRiskPerTradePct: number,
  maxOpenPositions: number,
  currentOpenPositions: number
): RiskDecision {
  const confidence = Math.abs(signal.probabilityUp - 0.5) * 2;
  const riskScore = 1 - confidence;
  const suggestedPositionSizePct = calculateSuggestedPositionSizePct(signal, maxRiskPerTradePct);
  const hasPositionCapacity = currentOpenPositions < maxOpenPositions;
  const hasOpenPositions = currentOpenPositions > 0;

  const riskLimit = maxRiskPerTradePct / 100;

  let approved = false;
  let reason = "hold-signal";

  if (signal.action === "buy") {
    if (!hasPositionCapacity) {
      reason = "max-open-positions-reached";
    } else if (riskScore > riskLimit) {
      reason = "risk-too-high";
    } else {
      approved = true;
      reason = "within-risk-limits";
    }
  } else if (signal.action === "sell") {
    if (!hasOpenPositions) {
      reason = "no-open-position-to-close";
    } else {
      approved = true;
      reason = "close-signal-approved";
    }
  }

  return {
    signal,
    approved,
    reason,
    suggestedPositionSizePct,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    maxOpenPositions,
    currentOpenPositions,
    createdAt: new Date().toISOString()
  };
}

async function bootstrap(): Promise<void> {
  const env = getEnv();
  let currentOpenPositions = 0;

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

  await subscriber.subscribe("signal_generated", "signal.generated");
  await subscriber.subscribe("execution.completed");

  subscriber.on("message", async (channel, message) => {
    try {
      if (channel === "execution.completed") {
        const execution = JSON.parse(message) as ExecutionCompletedEvent;
        if (execution.status === "executed" && execution.action === "buy") {
          currentOpenPositions += 1;
        } else if (execution.status === "executed" && execution.action === "sell") {
          currentOpenPositions = Math.max(0, currentOpenPositions - 1);
        }
        return;
      }

      const signal = JSON.parse(message) as TradeSignal;
      const decision = evaluateSignal(
        signal,
        env.MAX_RISK_PER_TRADE,
        env.MAX_OPEN_POSITIONS,
        currentOpenPositions
      );
      await publisher.publish("risk_evaluated", JSON.stringify(decision));
      await publisher.publish("risk.evaluated", JSON.stringify(decision));
    } catch (error: unknown) {
      console.error("risk-engine message error", error);
    }
  });
}

void bootstrap();
