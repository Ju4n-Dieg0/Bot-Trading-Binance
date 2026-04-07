import {
  EntityId,
  Position,
  type PositionRepository,
  Price,
  QuantityVO,
  type Symbol,
  Symbol as SymbolVO,
  TimestampVO,
  type TradeSide,
  type PositionStatus
} from "@libs/domain";
import { type Pool } from "pg";

interface PositionRow {
  id: string;
  symbol: string;
  side: TradeSide;
  entry_price: number;
  quantity: number;
  status: PositionStatus;
  stop_loss: number | null;
  take_profit: number | null;
  opened_at: Date;
  closed_at: Date | null;
  exit_price: number | null;
}

export class PostgresPositionRepository implements PositionRepository {
  constructor(private readonly pool: Pool) {}

  async save(position: Position): Promise<void> {
    await this.pool.query(
      `insert into positions (
         id, symbol, side, entry_price, quantity, status,
         stop_loss, take_profit, opened_at, closed_at, exit_price
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (id)
       do update set
         symbol = excluded.symbol,
         side = excluded.side,
         entry_price = excluded.entry_price,
         quantity = excluded.quantity,
         status = excluded.status,
         stop_loss = excluded.stop_loss,
         take_profit = excluded.take_profit,
         opened_at = excluded.opened_at,
         closed_at = excluded.closed_at,
         exit_price = excluded.exit_price`,
      [
        position.id.value,
        position.symbol.value,
        position.side,
        position.entryPrice.value,
        position.quantity.value,
        position.status,
        position.stopLoss?.value ?? null,
        position.takeProfit?.value ?? null,
        position.openedAt.value,
        position.closedAt?.value ?? null,
        position.exitPrice?.value ?? null
      ]
    );
  }

  async findById(id: EntityId): Promise<Position | null> {
    const result = await this.pool.query<PositionRow>(
      `select id, symbol, side, entry_price, quantity, status,
              stop_loss, take_profit, opened_at, closed_at, exit_price
       from positions
       where id = $1`,
      [id.value]
    );

    return result.rows[0] ? this.mapRowToPosition(result.rows[0]) : null;
  }

  async findOpenBySymbol(symbol: Symbol): Promise<Position[]> {
    const result = await this.pool.query<PositionRow>(
      `select id, symbol, side, entry_price, quantity, status,
              stop_loss, take_profit, opened_at, closed_at, exit_price
       from positions
       where symbol = $1 and status = 'open'
       order by opened_at desc`,
      [symbol.value]
    );

    return result.rows.map((row: PositionRow) => this.mapRowToPosition(row));
  }

  private mapRowToPosition(row: PositionRow): Position {
    return new Position(
      new EntityId(row.id),
      new SymbolVO(row.symbol),
      row.side,
      new Price(Number(row.entry_price)),
      new QuantityVO(Number(row.quantity)),
      new TimestampVO(new Date(row.opened_at)),
      row.status,
      row.stop_loss != null ? new Price(Number(row.stop_loss)) : undefined,
      row.take_profit != null ? new Price(Number(row.take_profit)) : undefined,
      row.closed_at != null ? new TimestampVO(new Date(row.closed_at)) : undefined,
      row.exit_price != null ? new Price(Number(row.exit_price)) : undefined
    );
  }
}
