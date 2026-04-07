import {
  EntityId,
  Price,
  QuantityVO,
  TimestampVO,
  TradeSide,
  TradeStatus,
  Symbol
} from "../value-objects";

export class Trade {
  constructor(
    public readonly id: EntityId,
    public readonly signalId: EntityId,
    public readonly symbol: Symbol,
    public readonly side: TradeSide,
    public readonly quantity: QuantityVO,
    public readonly requestedPrice: Price,
    public readonly createdAt: TimestampVO,
    public status: TradeStatus = "pending",
    public executedPrice?: Price,
    public executedAt?: TimestampVO,
    public rejectionReason?: string,
    public exchangeOrderId?: string
  ) {}

  markExecuted(executedPrice: Price, executedAt: TimestampVO, exchangeOrderId: string): void {
    if (this.status !== "pending") {
      throw new Error("Only pending trades can be executed");
    }
    this.status = "executed";
    this.executedPrice = executedPrice;
    this.executedAt = executedAt;
    this.exchangeOrderId = exchangeOrderId;
  }

  markRejected(reason: string): void {
    if (this.status !== "pending") {
      throw new Error("Only pending trades can be rejected");
    }
    if (!reason.trim()) {
      throw new Error("Rejection reason is required");
    }
    this.status = "rejected";
    this.rejectionReason = reason.trim();
  }
}
