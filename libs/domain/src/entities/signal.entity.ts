import { EntityId, Probability, Price, SignalAction, Symbol, TimestampVO } from "../value-objects";

export class Signal {
  constructor(
    public readonly id: EntityId,
    public readonly symbol: Symbol,
    public readonly action: SignalAction,
    public readonly probabilityUp: Probability,
    public readonly stopLoss: Price,
    public readonly takeProfit: Price,
    public readonly createdAt: TimestampVO
  ) {
    if (action === "hold" && probabilityUp.value !== 0.5) {
      throw new Error("Hold signals should be neutral (0.5 probability)");
    }
  }
}
