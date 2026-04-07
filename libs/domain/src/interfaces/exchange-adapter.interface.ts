import { MarketCandle } from "../entities";
import { Price, QuantityVO, Symbol, Timeframe, TradeSide } from "../value-objects";

export interface PlaceOrderRequest {
  symbol: Symbol;
  side: TradeSide;
  quantity: QuantityVO;
  requestedPrice?: Price;
}

export interface PlaceOrderResult {
  orderId: string;
  symbol: Symbol;
  side: TradeSide;
  filledPrice: Price;
  filledQuantity: QuantityVO;
  executedAt: Date;
}

export interface ExchangeInterface {
  fetchCandles(symbol: Symbol, timeframe: Timeframe, limit: number): Promise<MarketCandle[]>;
  getCurrentPrice(symbol: Symbol): Promise<Price>;
  placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult>;
  cancelOrder(orderId: string, symbol: Symbol): Promise<void>;
}

export type ExchangeAdapter = ExchangeInterface;
