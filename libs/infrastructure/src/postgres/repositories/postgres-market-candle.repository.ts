import {
  type MarketCandleRepository,
  MarketCandle,
  Price,
  QuantityVO,
  Symbol,
  Timeframe,
  TimestampVO
} from "@libs/domain";
import { type Pool } from "pg";

interface CandleRow {
  symbol: string;
  timeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  open_time: Date;
  close_time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class PostgresMarketCandleRepository implements MarketCandleRepository {
  constructor(private readonly pool: Pool) {}

  async saveMany(candles: MarketCandle[]): Promise<void> {
    if (candles.length === 0) {
      return;
    }

    const values: unknown[] = [];
    const placeholders: string[] = [];

    candles.forEach((candle, index) => {
      const offset = index * 9;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
      );
      values.push(
        candle.symbol.value,
        candle.timeframe.value,
        candle.openTime.value,
        candle.closeTime.value,
        candle.open.value,
        candle.high.value,
        candle.low.value,
        candle.close.value,
        candle.volume.value
      );
    });

    await this.pool.query(
      `insert into market_candles_cache (
         symbol, timeframe, open_time, close_time, open, high, low, close, volume
       )
       values ${placeholders.join(",")}
       on conflict (symbol, timeframe, open_time)
       do update set
         close_time = excluded.close_time,
         open = excluded.open,
         high = excluded.high,
         low = excluded.low,
         close = excluded.close,
         volume = excluded.volume`,
      values
    );
  }

  async findRecent(symbol: Symbol, from: TimestampVO, to: TimestampVO): Promise<MarketCandle[]> {
    const result = await this.pool.query<CandleRow>(
      `select symbol, timeframe, open_time, close_time, open, high, low, close, volume
       from market_candles_cache
       where symbol = $1 and open_time between $2 and $3
       order by open_time asc`,
      [symbol.value, from.value, to.value]
    );

    return result.rows.map((row: CandleRow) =>
      new MarketCandle(
        new Symbol(row.symbol),
        new Timeframe(row.timeframe),
        new TimestampVO(new Date(row.open_time)),
        new TimestampVO(new Date(row.close_time)),
        new Price(Number(row.open)),
        new Price(Number(row.high)),
        new Price(Number(row.low)),
        new Price(Number(row.close)),
        new QuantityVO(Number(row.volume))
      )
    );
  }
}
