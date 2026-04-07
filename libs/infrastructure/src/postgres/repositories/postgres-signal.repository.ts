import {
  EntityId,
  type SignalRepository,
  Probability,
  Price,
  Signal,
  type SignalAction,
  Symbol,
  TimestampVO
} from "@libs/domain";
import { type Pool } from "pg";

interface SignalRow {
  id: string;
  symbol: string;
  action: SignalAction;
  probability_up: number;
  stop_loss: number;
  take_profit: number;
  created_at: Date;
}

export class PostgresSignalRepository implements SignalRepository {
  constructor(private readonly pool: Pool) {}

  async save(signal: Signal): Promise<void> {
    await this.pool.query(
      `insert into signals (id, symbol, action, probability_up, stop_loss, take_profit, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id)
       do update set
         symbol = excluded.symbol,
         action = excluded.action,
         probability_up = excluded.probability_up,
         stop_loss = excluded.stop_loss,
         take_profit = excluded.take_profit,
         created_at = excluded.created_at`,
      [
        signal.id.value,
        signal.symbol.value,
        signal.action,
        signal.probabilityUp.value,
        signal.stopLoss.value,
        signal.takeProfit.value,
        signal.createdAt.value
      ]
    );
  }

  async findById(id: EntityId): Promise<Signal | null> {
    const result = await this.pool.query<SignalRow>(
      `select id, symbol, action, probability_up, stop_loss, take_profit, created_at
       from signals
       where id = $1`,
      [id.value]
    );

    return result.rows[0] ? this.mapRowToSignal(result.rows[0]) : null;
  }

  async findLatestBySymbol(symbol: Symbol): Promise<Signal | null> {
    const result = await this.pool.query<SignalRow>(
      `select id, symbol, action, probability_up, stop_loss, take_profit, created_at
       from signals
       where symbol = $1
       order by created_at desc
       limit 1`,
      [symbol.value]
    );

    return result.rows[0] ? this.mapRowToSignal(result.rows[0]) : null;
  }

  private mapRowToSignal(row: SignalRow): Signal {
    return new Signal(
      new EntityId(row.id),
      new Symbol(row.symbol),
      row.action,
      new Probability(Number(row.probability_up)),
      new Price(Number(row.stop_loss)),
      new Price(Number(row.take_profit)),
      new TimestampVO(new Date(row.created_at))
    );
  }
}
