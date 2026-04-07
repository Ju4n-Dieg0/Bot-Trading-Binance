import { Price, QuantityVO, Symbol, Timeframe, TimestampVO } from "../value-objects";

export class MarketCandle {
  constructor(
    public readonly symbol: Symbol,
    public readonly timeframe: Timeframe,
    public readonly openTime: TimestampVO,
    public readonly closeTime: TimestampVO,
    public readonly open: Price,
    public readonly high: Price,
    public readonly low: Price,
    public readonly close: Price,
    public readonly volume: QuantityVO
  ) {
    if (high.value < Math.max(open.value, close.value)) {
      throw new Error("Candle high cannot be below open/close");
    }
    if (low.value > Math.min(open.value, close.value)) {
      throw new Error("Candle low cannot be above open/close");
    }
    if (closeTime.value.getTime() <= openTime.value.getTime()) {
      throw new Error("Candle close time must be after open time");
    }
  }
}
