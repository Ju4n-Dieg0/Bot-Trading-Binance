export * from "./entity-id.vo";
export * from "./symbol.vo";
export * from "./price.vo";
export * from "./quantity.vo";
export * from "./percentage.vo";
export * from "./probability.vo";
export * from "./timestamp.vo";

export class Timeframe {
	public readonly value: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

	constructor(value: "1m" | "5m" | "15m" | "1h" | "4h" | "1d") {
		this.value = value;
	}

	equals(other: Timeframe): boolean {
		return this.value === other.value;
	}
}

export type TradeSide = "buy" | "sell";
export type SignalAction = TradeSide | "hold";
export type PositionStatus = "open" | "closed";
export type TradeStatus = "pending" | "executed" | "rejected" | "cancelled";
