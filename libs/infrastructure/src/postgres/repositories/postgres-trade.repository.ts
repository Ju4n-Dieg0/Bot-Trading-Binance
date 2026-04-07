import {
  EntityId,
  Price,
  QuantityVO,
  Symbol,
  TimestampVO,
  Trade,
  type TradeRepository,
  type TradeSide,
  type TradeStatus
} from "@libs/domain";
import { type Pool } from "pg";

interface TradeRow {
  id: string;
  signal_id: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  requested_price: number;
  status: TradeStatus;
  executed_price: number | null;
  executed_at: Date | null;
  rejection_reason: string | null;
  exchange_order_id: string | null;
  created_at: Date;
}

export class PostgresTradeRepository implements TradeRepository {
  constructor(private readonly pool: Pool) {}

  async save(trade: Trade): Promise<void> {
    await this.pool.query(
      `insert into trades (
         id, signal_id, symbol, side, quantity, requested_price,
         status, executed_price, executed_at, rejection_reason, exchange_order_id, created_at
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (id)
       do update set
         signal_id = excluded.signal_id,
         symbol = excluded.symbol,
         side = excluded.side,
         quantity = excluded.quantity,
         requested_price = excluded.requested_price,
         status = excluded.status,
         executed_price = excluded.executed_price,
         executed_at = excluded.executed_at,
         rejection_reason = excluded.rejection_reason,
         exchange_order_id = excluded.exchange_order_id,
         created_at = excluded.created_at`,
      [
        trade.id.value,
        trade.signalId.value,
        trade.symbol.value,
        trade.side,
        trade.quantity.value,
        trade.requestedPrice.value,
        trade.status,
        trade.executedPrice?.value ?? null,
        trade.executedAt?.value ?? null,
        trade.rejectionReason ?? null,
        trade.exchangeOrderId ?? null,
        trade.createdAt.value
      ]
    );
  }

  async findById(id: EntityId): Promise<Trade | null> {
    const result = await this.pool.query<TradeRow>(
      `select id, signal_id, symbol, side, quantity, requested_price, status,
              executed_price, executed_at, rejection_reason, exchange_order_id, created_at
       from trades
       where id = $1`,
      [id.value]
    );

    return result.rows[0] ? this.mapRowToTrade(result.rows[0]) : null;
  }

  async findPendingBySymbol(symbol: Symbol): Promise<Trade[]> {
    const result = await this.pool.query<TradeRow>(
      `select id, signal_id, symbol, side, quantity, requested_price, status,
              executed_price, executed_at, rejection_reason, exchange_order_id, created_at
       from trades
       where symbol = $1 and status = 'pending'
       order by created_at desc`,
      [symbol.value]
    );

    return result.rows.map((row: TradeRow) => this.mapRowToTrade(row));
  }

  private mapRowToTrade(row: TradeRow): Trade {
    return new Trade(
      new EntityId(row.id),
      new EntityId(row.signal_id),
      new Symbol(row.symbol),
      row.side,
      new QuantityVO(Number(row.quantity)),
      new Price(Number(row.requested_price)),
      new TimestampVO(new Date(row.created_at)),
      row.status,
      row.executed_price != null ? new Price(Number(row.executed_price)) : undefined,
      row.executed_at != null ? new TimestampVO(new Date(row.executed_at)) : undefined,
      row.rejection_reason ?? undefined,
      row.exchange_order_id ?? undefined
    );
  }
}
