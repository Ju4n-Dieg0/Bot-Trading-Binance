import { Probability, Symbol } from "../value-objects";

export interface FeatureInput {
  symbol: Symbol;
  rsi: number;
  macd: number;
  ema: number;
  relativeVolume: number;
  volatility: number;
}

export interface AiPrediction {
  symbol: Symbol;
  probabilityUp: Probability;
  modelName: string;
  generatedAt: Date;
}

export interface AIEngineInterface {
  predictProbabilityUp(input: FeatureInput): Promise<AiPrediction>;
}

export type AiEngineAdapter = AIEngineInterface;
