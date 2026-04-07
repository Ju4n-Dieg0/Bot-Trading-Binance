# Paper Trading Execution Guide

Paper mode simulates execution without sending real orders to Binance.

## When to Use

- Initial strategy validation.
- Integration testing end-to-end.
- Safe demo environments.

## 1. Configure Paper Mode

```env
TRADING_MODE=paper
```

## 2. Start Infrastructure

```bash
cd infra/docker
docker compose up -d postgres redis
```

## 3. Start Core Services

```bash
pnpm start:trading-api
pnpm start:telegram-bot
pnpm start:market-data
pnpm --filter @services/signal-engine dev
pnpm --filter @services/risk-engine dev
pnpm --filter @services/execution-engine dev
```

And AI engine:

```bash
cd services/ai-engine
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

## 4. Validate Simulation

Expected behavior:

- `trade_confirmed` arrives to execution engine.
- Execution engine publishes `order_executed` with reason like `paper-simulated-buy`.

Example response payload:

```json
{
  "signalId": "6a46f194-dcf6-4ef2-95a2-f9b5b9cd6408",
  "symbol": "BTCUSDT",
  "action": "buy",
  "status": "executed",
  "tradingMode": "paper",
  "reason": "paper-simulated-buy"
}
```
