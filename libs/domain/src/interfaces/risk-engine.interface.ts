import { RiskProfile, Signal } from "../entities";

export interface RiskDecision {
  approved: boolean;
  reason: string;
  evaluatedAt: Date;
}

export interface RiskEngineInterface {
  evaluateSignal(signal: Signal, profile: RiskProfile): Promise<RiskDecision>;
}
