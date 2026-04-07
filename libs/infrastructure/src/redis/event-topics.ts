export const REDIS_EVENT_TOPICS = {
  MARKET_CANDLES_UPDATED: "market_candles_updated",
  SIGNAL_GENERATED: "signal_generated",
  RISK_EVALUATED: "risk_evaluated",
  TRADE_CONFIRMED: "trade_confirmed",
  ORDER_EXECUTED: "order_executed",
  POSITION_CLOSED: "position_closed"
} as const;

export type RedisEventTopic = (typeof REDIS_EVENT_TOPICS)[keyof typeof REDIS_EVENT_TOPICS];

export interface RedisEventPayloadMap {
  market_candles_updated: {
    eventName: "market_candles_updated";
    occurredAt: string;
    items: Array<{ symbol: string; interval: string; candles: unknown[] }>;
  };
  signal_generated: {
    signalId: string;
    symbol: string;
    action: "buy" | "sell" | "hold";
    probabilityUp: number;
    stopLoss: number;
    takeProfit: number;
    createdAt: string;
  };
  risk_evaluated: {
    approved: boolean;
    reason: string;
    suggestedPositionSizePct: number;
    stopLoss: number;
    takeProfit: number;
    createdAt: string;
  };
  trade_confirmed: {
    signalId: string;
    approved: boolean;
    symbol: string;
    action: "buy" | "sell" | "hold";
    createdAt: string;
  };
  order_executed: {
    signalId: string;
    symbol: string;
    action: "buy" | "sell" | "hold";
    status: "executed";
    orderId: string | null;
    executedPrice: number | null;
    executedQty: number | null;
    tradingMode: "paper" | "real";
    reason: string;
    createdAt: string;
  };
  position_closed: {
    signalId: string;
    symbol: string;
    closeReason: "manual_sell" | "stop_loss" | "take_profit" | "risk_rule";
    createdAt: string;
  };
}
