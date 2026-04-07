import { MarketCandle, Position, RiskProfile, Signal, Trade } from "../entities";
import { EntityId, Symbol, TimestampVO } from "../value-objects";

export interface TradeRepository {
  save(trade: Trade): Promise<void>;
  findById(id: EntityId): Promise<Trade | null>;
  findPendingBySymbol(symbol: Symbol): Promise<Trade[]>;
}

export interface SignalRepository {
  save(signal: Signal): Promise<void>;
  findById(id: EntityId): Promise<Signal | null>;
  findLatestBySymbol(symbol: Symbol): Promise<Signal | null>;
}

export interface PositionRepository {
  save(position: Position): Promise<void>;
  findById(id: EntityId): Promise<Position | null>;
  findOpenBySymbol(symbol: Symbol): Promise<Position[]>;
}

export interface RiskProfileRepository {
  save(profile: RiskProfile): Promise<void>;
  findByTenantId(tenantId: EntityId): Promise<RiskProfile | null>;
}

export interface MarketCandleRepository {
  saveMany(candles: MarketCandle[]): Promise<void>;
  findRecent(symbol: Symbol, from: TimestampVO, to: TimestampVO): Promise<MarketCandle[]>;
}
