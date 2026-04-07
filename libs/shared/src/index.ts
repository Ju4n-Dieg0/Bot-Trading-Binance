export type TradingMode = "paper" | "live";

export interface DomainEvent<TPayload = unknown> {
  eventName: string;
  occurredAt: string;
  payload: TPayload;
}

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FeatureVector {
  symbol: string;
  interval: string;
  rsi: number;
  macd: number;
  ema9: number;
  ema21: number;
  ema50: number;
  ema: number;
  relativeVolume: number;
  volatility10: number;
  volatility: number;
  lastClose: number;
  createdAt: string;
}

export interface ProbabilitySignal {
  symbol: string;
  probabilityUp: number;
  features: FeatureVector;
  modelName: string;
  createdAt: string;
}

export interface TradeSignal {
  signalId: string;
  symbol: string;
  action: "buy" | "sell" | "hold";
  probabilityUp: number;
  stopLoss: number;
  takeProfit: number;
  createdAt: string;
}

export interface RiskDecision {
  signal: TradeSignal;
  approved: boolean;
  reason: string;
  suggestedPositionSizePct: number;
  stopLoss: number;
  takeProfit: number;
  maxOpenPositions: number;
  currentOpenPositions: number;
  createdAt: string;
}

export interface TradeConfirmation {
  signalId: string;
  approved: boolean;
  symbol: string;
  action: "buy" | "sell" | "hold";
  createdAt: string;
}
