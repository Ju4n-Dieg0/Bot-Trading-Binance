# AI Trading Agent

AI Trading Agent is an event-driven algorithmic trading system that connects Binance Spot market data, AI probability inference, Telegram human confirmation, and execution logic across a distributed architecture.

Core stack:

- NestJS (API)
- Python FastAPI + scikit-learn (AI engine)
- Redis (event bus)
- PostgreSQL (persistence)
- Docker Compose (deployment)

## Who This Is For

- Engineers building production-grade trading automation.
- Quant developers prototyping AI-assisted execution.
- Open-source contributors interested in distributed systems and event-driven orchestration.

## What The System Does

1. Ingests Binance candles for major symbols and multiple timeframes.
2. Generates technical feature vectors.
3. Predicts short-term movement probability with AI.
4. Creates trade signals when confidence is high enough.
5. Applies risk controls.
6. Requests Telegram approval.
7. Executes paper or real orders.
8. Persists execution outcomes.

## Quick Start

### 1. Install Dependencies

```bash
npm install -g pnpm
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Set required secrets in `.env`:

- `BINANCE_API_KEY`
- `BINANCE_API_SECRET`
- `TELEGRAM_BOT_TOKEN`

### 3. Start with Docker

```bash
cd infra/docker
docker compose up -d
```

### 4. Verify Services

```bash
curl http://localhost:8000/health
```

## System Modes

### Paper Trading

- No real Binance order is sent.
- Execution engine simulates fills and emits execution events.
- Recommended for all first runs and regression tests.

### Real Trading

- Execution engine calls Binance Spot order endpoint.
- Requires valid API key and strict risk controls.
- Must be activated only after paper validation.

Mode switch:

```env
TRADING_MODE=paper
# or
TRADING_MODE=real
```

## Data Sources

### Market Candles

Source: Binance REST API `GET /api/v3/klines`.

Current symbols/timeframes used in market service:

- Symbols: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`
- Timeframes: `15m`, `1h`, `4h`

### Technical Indicators

Computed internally from candles:

- RSI
- MACD
- EMA 9/21/50
- Relative Volume
- Volatility(10)

### AI Training Data

Current bootstrap model is initialized with synthetic seed examples in the AI engine for immediate development usage.

Planned production path:

- Historical candle-derived dataset
- Time-based train/validation split
- Versioned model artifacts

### Binance API Usage Limits

Primary endpoints:

- `GET /api/v3/klines` (market data)
- `POST /api/v3/order` (real execution)

Respect Binance request-weight and order-rate limits. Use conservative polling and avoid request bursts.

## Security Best Practices

- Never enable Binance withdrawal permissions.
- Restrict Binance API keys by trusted IP.
- Keep `.env` out of version control.
- Rotate credentials periodically.
- Separate keys for dev/staging/production.

## Environment Variables Reference

### `BINANCE_API_KEY`

Binance Spot trading API key used by execution engine in real mode.

Example:

```env
BINANCE_API_KEY=your_real_key
```

### `BINANCE_API_SECRET`

Secret used for HMAC signing Binance private endpoints.

Example:

```env
BINANCE_API_SECRET=your_real_secret
```

### `TELEGRAM_BOT_TOKEN`

Telegram bot token generated via BotFather.

Example:

```env
TELEGRAM_BOT_TOKEN=123456789:AAExampleToken
```

### `DATABASE_URL`

PostgreSQL connection string for persistence.

Example:

```env
DATABASE_URL=postgresql://trading:trading@localhost:5432/trading
```

### `REDIS_HOST`

Redis hostname used by all event-driven services.

Example:

```env
REDIS_HOST=localhost
```

### `REDIS_PORT`

Redis TCP port.

Example:

```env
REDIS_PORT=6379
```

### `TRADING_MODE`

Execution mode selector.

Allowed values:

- `paper`
- `real`

Example:

```env
TRADING_MODE=paper
```

### `MAX_RISK_PER_TRADE`

Maximum risk budget per trade, expressed in percent.

Example:

```env
MAX_RISK_PER_TRADE=0.25
```

### `DEFAULT_TIMEFRAME`

Default timeframe reference for market context.

Example:

```env
DEFAULT_TIMEFRAME=1m
```

### `PAPER_INITIAL_BALANCE`

Starting simulated balance used in paper trading confirmations.

Example:

```env
PAPER_INITIAL_BALANCE=1000
```

### `PAPER_ORDER_QUANTITY`

Fixed simulated quantity used by paper execution.

Example:

```env
PAPER_ORDER_QUANTITY=0.001
```

## How To Test

```bash
pnpm build
pnpm test
```

AI endpoint test:

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","rsi":56.1,"macd":0.18,"ema_crossover":1,"relative_volume":1.24,"recent_volatility":0.009}'
```

## How To Deploy

- Local Docker deployment: see [docs/docker-deployment.md](docs/docker-deployment.md)
- VPS production deployment: see [docs/production-deployment.md](docs/production-deployment.md)

## Documentation Index

- [Architecture](docs/architecture.md)
- [Installation](docs/installation.md)
- [Environment Configuration](docs/environment.md)
- [Binance Setup](docs/binance-setup.md)
- [Telegram Setup](docs/telegram-setup.md)
- [Paper Trading](docs/paper-trading.md)
- [Real Trading](docs/real-trading.md)
- [AI Training](docs/ai-training.md)
- [AI Model](docs/model.md)
- [API Reference](docs/api-reference.md)
- [Event Flow](docs/event-flow.md)
- [Docker Deployment](docs/docker-deployment.md)
- [Production Deployment](docs/production-deployment.md)
- [Telegram Commands](docs/telegram-commands.md)
- [Security](docs/security.md)
- [Security Checklist](docs/security-checklist.md)
- [Testing](docs/testing.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Roadmap](docs/roadmap.md)

## Project Status

Current status: active development with working end-to-end event pipeline and paper/real execution modes. Production hardening and testing coverage expansion are in progress.
