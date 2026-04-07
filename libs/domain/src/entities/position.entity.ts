import {
  EntityId,
  PositionStatus,
  Price,
  QuantityVO,
  Symbol,
  TimestampVO,
  TradeSide
} from "../value-objects";

export class Position {
  constructor(
    public readonly id: EntityId,
    public readonly symbol: Symbol,
    public readonly side: TradeSide,
    public readonly entryPrice: Price,
    public readonly quantity: QuantityVO,
    public readonly openedAt: TimestampVO,
    public status: PositionStatus = "open",
    public stopLoss?: Price,
    public takeProfit?: Price,
    public closedAt?: TimestampVO,
    public exitPrice?: Price
  ) {}

  close(exitPrice: Price, closedAt: TimestampVO): void {
    if (this.status === "closed") {
      throw new Error("Position is already closed");
    }
    this.status = "closed";
    this.exitPrice = exitPrice;
    this.closedAt = closedAt;
  }
}
