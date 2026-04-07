# System Architecture

This project is an event-driven, multi-service trading platform for Binance Spot trading with Telegram human-in-the-loop confirmation and AI-assisted signal generation.

## Architecture Goals

- Clean separation between domain, application, infrastructure, and interfaces.
- Async communication through Redis Pub/Sub.
- Fast local bootstrap with Docker Compose.
- Safe mode split between paper and real trading.

## High-Level Components

- `apps/trading-api`: API entry point (NestJS).
- `apps/telegram-bot`: operator interface (Telegraf).
- `services/market-data-service`: candles ingestion + feature engineering trigger.
- `services/ai-engine`: ML inference service (FastAPI + scikit-learn).
- `services/signal-engine`: probability thresholding into trade signals.
- `services/risk-engine`: risk validation and position constraints.
- `services/execution-engine`: paper execution or Binance real order execution.
- `postgres`: persistent storage.
- `redis`: event bus.

## Layered Monorepo Structure Explained

```text
apps/
  trading-api/           # HTTP API for integrations and future dashboards
  telegram-bot/          # Telegram commands + manual confirmation

services/
  ai-engine/             # Python ML inference service
  market-data-service/   # Binance candles fetch + feature event publication
  signal-engine/         # Converts probabilities into BUY signals
  risk-engine/           # Applies risk policy to signals
  execution-engine/      # Places paper/real orders and stores execution result

libs/
  domain/                # Entities, value objects, repository interfaces
  application/           # Use cases and orchestration abstractions
  infrastructure/        # Redis bus and Postgres adapters
  config/                # Env schema validation and typed config service
  shared/                # Shared event contracts and DTOs

infra/
  docker/                # Docker Compose for local/dev environment
  postgres/init/         # SQL bootstrap scripts
  redis/                 # Redis config
```

## Deployment Topology (Logical)

```text
[Binance REST API] ---> [market-data-service] ---->
                                             Redis Pub/Sub ----> [ai-engine] ---->
                                                                  [signal-engine] ---->
                                                                  [risk-engine] ---->
[Telegram User] <---- [telegram-bot] <--------------------------- [signal_generated]
    |                                                            |
    +---- confirmation ----> [trade_confirmed] ----> [execution-engine] ---> [Binance Order API]
                                                                      |
                                                                      +--> [PostgreSQL]
```

## Typical Request/Decision Path

1. Market service pulls candles for BTCUSDT, ETHUSDT, SOLUSDT in `15m`, `1h`, `4h`.
2. AI engine receives features and computes `probabilityUpNext1h`.
3. Signal engine emits `signal_generated` if probability is above threshold.
4. Telegram bot asks for approval.
5. Execution engine executes in paper or real mode.
6. Results are stored and published as execution events.

## Example Event Payload (Signal)

```json
{
  "signalId": "3d53cb24-fdb6-4f6d-b6f5-dfd6eac57b78",
  "symbol": "BTCUSDT",
  "action": "buy",
  "probabilityUp": 0.7421,
  "stopLoss": 63250.15,
  "takeProfit": 64990.40,
  "createdAt": "2026-04-06T21:08:12.102Z"
}
```
