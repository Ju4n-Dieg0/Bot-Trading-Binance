import { Injectable } from "@nestjs/common";
import { getEnv } from "./env";
import { type AppEnv } from "./env.schema";

@Injectable()
export class ConfigService {
  private readonly envInternal: AppEnv;

  constructor() {
    this.envInternal = getEnv();
  }

  get env(): AppEnv {
    return this.envInternal;
  }

  get BINANCE_API_KEY(): string {
    return this.envInternal.BINANCE_API_KEY;
  }

  get BINANCE_API_SECRET(): string {
    return this.envInternal.BINANCE_API_SECRET;
  }

  get TELEGRAM_BOT_TOKEN(): string {
    return this.envInternal.TELEGRAM_BOT_TOKEN;
  }

  get DATABASE_URL(): string {
    return this.envInternal.DATABASE_URL;
  }

  get REDIS_HOST(): string {
    return this.envInternal.REDIS_HOST;
  }

  get TRADING_MODE(): AppEnv["TRADING_MODE"] {
    return this.envInternal.TRADING_MODE;
  }

  get MAX_RISK_PER_TRADE(): number {
    return this.envInternal.MAX_RISK_PER_TRADE;
  }

  get DEFAULT_TIMEFRAME(): AppEnv["DEFAULT_TIMEFRAME"] {
    return this.envInternal.DEFAULT_TIMEFRAME;
  }
}
