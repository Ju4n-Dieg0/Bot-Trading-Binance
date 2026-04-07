import { EntityId, Percentage, Probability } from "../value-objects";

export class RiskProfile {
  constructor(
    public readonly id: EntityId,
    public readonly tenantId: EntityId,
    public readonly maxRiskPerTradePct: Percentage,
    public readonly maxDailyLossPct: Percentage,
    public readonly minSignalConfidence: Probability,
    public readonly maxOpenPositions: number
  ) {
    if (!Number.isInteger(maxOpenPositions) || maxOpenPositions <= 0) {
      throw new Error("maxOpenPositions must be a positive integer");
    }
  }
}
