# Environment Variables Guide

All runtime settings are loaded from `.env` and validated at startup.

## Setup Steps

1. Copy the template.
2. Fill secrets (Binance and Telegram).
3. Select trading mode.
4. Start services.

```bash
cp .env.example .env
```

## Environment Variables Reference

### Core Connectivity

- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_HOST`: Redis host.
- `REDIS_PORT`: Redis port.

Example:

```env
DATABASE_URL=postgresql://trading:trading@localhost:5432/trading
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Exchange and Messaging Secrets

- `BINANCE_API_KEY`: Binance Spot API key.
- `BINANCE_API_SECRET`: Binance Spot API secret.
- `TELEGRAM_BOT_TOKEN`: Telegram bot token from BotFather.

Example:

```env
BINANCE_API_KEY=abc123_real_key
BINANCE_API_SECRET=xyz456_real_secret
TELEGRAM_BOT_TOKEN=789123456:AAE-example-token
```

### Trading Controls

- `TRADING_MODE`: `paper` or `real`.
- `MAX_RISK_PER_TRADE`: max percent risk per trade.
- `DEFAULT_TIMEFRAME`: default timeframe for market context.

Example:

```env
TRADING_MODE=paper
MAX_RISK_PER_TRADE=1.0
DEFAULT_TIMEFRAME=1m
```

## Full Minimal Example

```env
BINANCE_API_KEY=replace_with_key
BINANCE_API_SECRET=replace_with_secret
TELEGRAM_BOT_TOKEN=replace_with_telegram_token
DATABASE_URL=postgresql://trading:trading@localhost:5432/trading
REDIS_HOST=localhost
REDIS_PORT=6379
TRADING_MODE=paper
MAX_RISK_PER_TRADE=1.0
DEFAULT_TIMEFRAME=1m
```

## Validation Behavior

If required values are missing, services fail fast on startup.

Example error:

```text
TELEGRAM_BOT_TOKEN is required to start telegram-bot
```
