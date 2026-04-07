import { z } from "zod";

export const envSchema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  TRADING_API_PORT: z.coerce.number().int().positive().default(3000),
  TELEGRAM_BOT_PORT: z.coerce.number().int().positive().default(3100),
  MARKET_DATA_SERVICE_PORT: z.coerce.number().int().positive().default(3200),
  SIGNAL_ENGINE_PORT: z.coerce.number().int().positive().default(3250),
  RISK_ENGINE_PORT: z.coerce.number().int().positive().default(3300),
  EXECUTION_ENGINE_PORT: z.coerce.number().int().positive().default(3400),
  DATABASE_URL: z.string().min(1),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(""),
  BINANCE_API_KEY: z.string().min(1),
  BINANCE_API_SECRET: z.string().min(1),
  BINANCE_BASE_URL: z.string().url().default("https://api.binance.com"),
  TRADING_SYMBOL: z.string().default("BTCUSDT"),
  DEFAULT_TIMEFRAME: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]),
  CANDLE_INTERVAL: z.string().default("1m"),
  CANDLE_LIMIT: z.coerce.number().int().positive().default(60),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_DEFAULT_CHAT_ID: z.string().optional().default(""),
  TRADING_MODE: z.enum(["paper", "real", "live"]).default("paper"),
  DEFAULT_QUOTE_ASSET: z.string().default("USDT"),
  SIGNAL_BUY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
  SIGNAL_SELL_THRESHOLD: z.coerce.number().min(0).max(1).default(0.4),
  DEFAULT_STOP_LOSS_PCT: z.coerce.number().positive().default(1.5),
  DEFAULT_TAKE_PROFIT_PCT: z.coerce.number().positive().default(3),
  MAX_RISK_PER_TRADE: z.coerce.number().positive().default(1),
  MAX_OPEN_POSITIONS: z.coerce.number().int().positive().default(3),
  MAX_DAILY_LOSS: z.coerce.number().positive().default(5),
  JWT_SECRET: z.string().min(8),
  TENANT_ISOLATION_MODE: z.enum(["row-level", "schema-level"]).default("row-level")
});

export type AppEnv = z.infer<typeof envSchema>;
