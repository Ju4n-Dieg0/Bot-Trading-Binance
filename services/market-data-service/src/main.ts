import Redis from "ioredis";
import axios from "axios";
import { getEnv } from "@libs/config";
import { type Candle, type FeatureVector } from "@libs/shared";
import { buildFeatureVector } from "./application/feature-engineering.module";

type SupportedInterval = "15m" | "1h" | "4h";

interface MarketCandlesUpdatedItem {
  symbol: string;
  interval: SupportedInterval;
  candles: Candle[];
}

interface MarketCandlesUpdatedEvent {
  eventName: "market_candles_updated";
  occurredAt: string;
  items: MarketCandlesUpdatedItem[];
}

interface MarketFeaturesEngineeredEvent {
  eventName: "market_features_engineered";
  occurredAt: string;
  items: FeatureVector[];
}

const SYMBOLS: ReadonlyArray<string> = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const INTERVALS: ReadonlyArray<SupportedInterval> = ["15m", "1h", "4h"];

function mapKlinesToCandles(klines: unknown[]): Candle[] {
  return klines.map((kline) => {
    const row = kline as [number, string, string, string, string, string];
    return {
      openTime: row[0],
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5])
    };
  });
}

async function fetchCandles(baseUrl: string, symbol: string, interval: string, limit: number): Promise<Candle[]> {
  const response = await axios.get<unknown[]>(`${baseUrl}/api/v3/klines`, {
    params: { symbol, interval, limit }
  });
  const payload = response.data;
  return mapKlinesToCandles(payload);
}

async function fetchAllRequiredCandles(baseUrl: string, limit: number): Promise<MarketCandlesUpdatedItem[]> {
  const jobs: Array<Promise<MarketCandlesUpdatedItem>> = [];

  for (const symbol of SYMBOLS) {
    for (const interval of INTERVALS) {
      jobs.push(
        fetchCandles(baseUrl, symbol, interval, limit).then((candles) => ({
          symbol,
          interval,
          candles
        }))
      );
    }
  }

  return Promise.all(jobs);
}

async function bootstrap(): Promise<void> {
  const env = getEnv();

  const redis = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined
  });

  await redis.ping();

  const run = async (): Promise<void> => {
    const items = await fetchAllRequiredCandles(env.BINANCE_BASE_URL, env.CANDLE_LIMIT);
    const features = items.map((item) => buildFeatureVector(item.candles, item.symbol, item.interval));

    const eventPayload: MarketCandlesUpdatedEvent = {
      eventName: "market_candles_updated",
      occurredAt: new Date().toISOString(),
      items
    };

    const featureEventPayload: MarketFeaturesEngineeredEvent = {
      eventName: "market_features_engineered",
      occurredAt: new Date().toISOString(),
      items: features
    };

    await redis.publish("market_candles_updated", JSON.stringify(eventPayload));
    await redis.publish("market_features_engineered", JSON.stringify(featureEventPayload));

    for (const feature of features) {
      await redis.publish("market.features.calculated", JSON.stringify(feature));
    }
  };

  await run();
  setInterval(() => {
    void run().catch((error: unknown) => {
      console.error("market-data-service loop error", error);
    });
  }, 15_000);
}

void bootstrap();
