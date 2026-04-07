# API Reference

This document describes the internal interfaces exposed by the system: HTTP endpoints, Redis events, decision logic, and Telegram commands.

## Scope

Covered components:

- market-data-service
- ai-engine
- execution-engine
- signal-engine
- risk-engine
- telegram-bot

## 1. market-data-service

### Responsibility

Fetch Binance candles, build feature vectors, and publish market events to Redis.

### External Data Access

The service consumes Binance public market data.

#### Binance Endpoint

- `GET /api/v3/klines`

#### Example Request

```bash
curl "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=60"
```

#### Example Response

```json
[
  [1775527200000, "63810.12", "63890.50", "63790.00", "63820.33", "12.4821", 1775530799999, "796682.77", 312, "6.2210", "397000.12", "0"],
  [1775530800000, "63820.33", "63910.10", "63795.44", "63875.22", "9.1032", 1775534399999, "581223.44", 276, "4.5621", "291430.18", "0"]
]
```

### Internal Event Publication

The service publishes these Redis topics:

- `market_candles_updated`
- `market_features_engineered`
- `market.features.calculated`  
  Compatibility topic used by the current AI engine subscription.

### Payload Schema: `market_candles_updated`

```json
{
  "eventName": "market_candles_updated",
  "occurredAt": "2026-04-06T22:12:52.501Z",
  "items": [
    {
      "symbol": "BTCUSDT",
      "interval": "1h",
      "candles": [
        {
          "openTime": 1775527200000,
          "open": 63810.12,
          "high": 63890.5,
          "low": 63790,
          "close": 63820.33,
          "volume": 12.4821
        }
      ]
    }
  ]
}
```

### Payload Schema: feature vector

```json
{
  "symbol": "BTCUSDT",
  "interval": "1h",
  "rsi": 57.2391,
  "macd": 12.441232,
  "ema9": 63855.2231,
  "ema21": 63790.9144,
  "ema50": 63688.5122,
  "ema": 63790.9144,
  "relativeVolume": 1.1824,
  "volatility10": 0.008412,
  "volatility": 0.008412,
  "lastClose": 63820.33,
  "createdAt": "2026-04-06T22:12:52.501Z"
}
```

### Error Cases

- Binance rate limit reached.
- Invalid or missing `BINANCE_BASE_URL`.
- Redis unavailable.
- Empty candle response from Binance.

### Example Service Error

```text
market-data-service loop error Error: Request failed with status code 429
```

## 2. ai-engine

### Responsibility

Transform engineered features into a probability prediction for the next 1h move.

### Base URL

- `http://localhost:8000`

### Health Endpoint

#### Request

```bash
curl http://localhost:8000/health
```

#### Response

```json
{
  "status": "ok",
  "mode": "paper"
}
```

### Prediction Endpoint

#### `POST /predict`

#### Request Schema

```json
{
  "symbol": "BTCUSDT",
  "rsi": 56.1,
  "macd": 0.18,
  "ema_crossover": 1,
  "relative_volume": 1.24,
  "recent_volatility": 0.009
}
```

Field rules:

- `symbol`: trading pair, for example `BTCUSDT`.
- `rsi`: numeric RSI value.
- `macd`: MACD value.
- `ema_crossover`: `1`, `0`, or `-1`.
- `relative_volume`: volume ratio against baseline.
- `recent_volatility`: recent return volatility.

#### Example Request

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "rsi": 56.1,
    "macd": 0.18,
    "ema_crossover": 1,
    "relative_volume": 1.24,
    "recent_volatility": 0.009
  }'
```

#### Example Response

```json
{
  "symbol": "BTCUSDT",
  "probability_up_next_1h": 0.7421,
  "model_name": "RandomForestClassifier",
  "horizon": "1h"
}
```

### Redis Consumption and Publication

The service subscribes to:

- `market.features.calculated`

It publishes:

- `ai.probability.generated`

### Event Schema: `ai.probability.generated`

```json
{
  "symbol": "BTCUSDT",
  "probabilityUp": 0.7421,
  "probabilityUpNext1h": 0.7421,
  "horizon": "1h",
  "features": {
    "symbol": "BTCUSDT",
    "interval": "1h",
    "rsi": 56.1,
    "macd": 0.18,
    "ema9": 63855.2231,
    "ema21": 63790.9144,
    "ema50": 63688.5122,
    "ema": 63790.9144,
    "relativeVolume": 1.24,
    "volatility10": 0.009,
    "volatility": 0.009,
    "lastClose": 63820.33,
    "createdAt": "2026-04-06T22:12:52.501Z"
  },
  "modelName": "RandomForest",
  "createdAt": "2026-04-06T22:12:52.501Z"
}
```

### Error Cases

- Redis unavailable during startup.
- Invalid `TRADING_MODE` in environment.
- Malformed feature payload on Redis stream.

### Example Service Error

```text
ValueError: TRADING_MODE must be paper or live
```

## 3. signal-engine

### Responsibility

Convert probability output into a tradable signal when confidence is above threshold.

### Input Event

- `ai.probability.generated`

### Output Events

- `signal_generated`
- `signal.generated`  
  Compatibility topic.

### Decision Rule

A signal is generated only when:

- `probabilityUp > 0.65`

The current implementation always emits a `buy` signal for qualifying probabilities.

### Signal Payload Schema

```json
{
  "signalId": "6a46f194-dcf6-4ef2-95a2-f9b5b9cd6408",
  "symbol": "BTCUSDT",
  "action": "buy",
  "probabilityUp": 0.7421,
  "stopLoss": 63250.15,
  "takeProfit": 64990.4,
  "createdAt": "2026-04-06T22:12:52.501Z"
}
```

### Example Decision Flow

```text
probabilityUp = 0.7421
threshold = 0.65
result = generate signal
```

### Error Cases

- Invalid JSON payload.
- Missing `features.lastClose` required to compute stop-loss and take-profit.
- Redis unavailable.

### Example Error

```text
signal-engine message error SyntaxError: Unexpected token o in JSON at position 1
```

## 4. risk-engine

### Responsibility

Validate a trade signal against risk policy and current open position count.

### Input Events

- `signal_generated`
- `signal.generated`  
  Compatibility topic.
- `execution.completed`  
  Used to update current open position count.

### Output Events

- `risk_evaluated`
- `risk.evaluated`  
  Compatibility topic.

### Decision Logic

From current implementation:

- Reject if signal action is `hold`.
- Reject if estimated risk score is above `MAX_RISK_PER_TRADE / 100`.
- Reject if current open positions are already at or above `MAX_OPEN_POSITIONS`.
- Approve otherwise.

### Risk Payload Schema

```json
{
  "signal": {
    "signalId": "6a46f194-dcf6-4ef2-95a2-f9b5b9cd6408",
    "symbol": "BTCUSDT",
    "action": "buy",
    "probabilityUp": 0.7421,
    "stopLoss": 63250.15,
    "takeProfit": 64990.4,
    "createdAt": "2026-04-06T22:12:52.501Z"
  },
  "approved": true,
  "reason": "within-risk-limits",
  "suggestedPositionSizePct": 42.8571,
  "stopLoss": 63250.15,
  "takeProfit": 64990.4,
  "maxOpenPositions": 3,
  "currentOpenPositions": 0,
  "createdAt": "2026-04-06T22:12:52.541Z"
}
```

### Decision Examples

Approved example:

```text
signal.action = buy
signal.probabilityUp = 0.7421
currentOpenPositions = 0
maxOpenPositions = 3
result = approved
```

Rejected example:

```text
signal.action = hold
result = rejected
reason = risk-too-high-or-hold-signal
```

Rejected because capacity reached:

```text
currentOpenPositions = 3
maxOpenPositions = 3
result = rejected
reason = max-open-positions-reached
```

### Error Cases

- Invalid signal JSON.
- Redis unavailable.
- Inconsistent numeric values in signal payload.

### Example Error

```text
risk-engine message error SyntaxError: Unexpected token u in JSON at position 0
```

## 5. execution-engine

### Responsibility

Execute approved trade confirmations in paper mode or real Binance Spot mode.

### Input Events

- `trade_confirmed`
- `trade.confirmed`  
  Compatibility topic.

### Output Events

- `order_executed`
- `position_closed`
- `execution.completed`

### Trading Modes

- `paper`: simulated execution only.
- `real`: signed Binance order request.
- `live`: treated as `real` by the implementation.

### Execution Confirmation Schema

```json
{
  "signalId": "6a46f194-dcf6-4ef2-95a2-f9b5b9cd6408",
  "approved": true,
  "symbol": "BTCUSDT",
  "action": "buy",
  "createdAt": "2026-04-06T22:12:52.501Z"
}
```

### Example Paper Execution Response

```json
{
  "signalId": "6a46f194-dcf6-4ef2-95a2-f9b5b9cd6408",
  "symbol": "BTCUSDT",
  "action": "buy",
  "status": "executed",
  "orderId": "paper-9aa7e7eb-b7c8-4b3f-8b4e-0120ab34c7ff",
  "executedPrice": 0,
  "executedQty": 0,
  "tradingMode": "paper",
  "reason": "paper-simulated-buy",
  "createdAt": "2026-04-06T22:12:53.112Z"
}
```

### Example Real Execution Response

```json
{
  "signalId": "6a46f194-dcf6-4ef2-95a2-f9b5b9cd6408",
  "symbol": "BTCUSDT",
  "action": "buy",
  "status": "executed",
  "orderId": "18412589032",
  "executedPrice": 63820.22,
  "executedQty": 0.001,
  "tradingMode": "real",
  "reason": "binance-spot-executed",
  "createdAt": "2026-04-06T22:12:53.112Z"
}
```

### `position_closed` Event Schema

Published when a sell confirmation is executed successfully.

```json
{
  "signalId": "3f0d3a2c-6f34-4f95-b7d5-6f4be56aa95d",
  "symbol": "BTCUSDT",
  "closeReason": "manual_sell",
  "createdAt": "2026-04-06T22:12:53.112Z"
}
```

### Error Cases

- Missing or invalid Binance credentials in real mode.
- HTTP error from Binance order API.
- PostgreSQL connection failure.
- Redis unavailable.

### Example Error

```text
execution-engine message error Error: Request failed with status code 401
```

## 6. telegram-bot

### Responsibility

Expose operator commands, display signals, and publish human approval decisions.

### Commands

The bot currently supports:

- `/start`
- `/status`
- `/signals`
- `/positions`
- `/balance`
- `/risk`
- `/auto_on`
- `/auto_off`

### Command Examples

#### `/status`

```text
Modo trading: paper
Auto trading: OFF
Signals pendientes: 1
Posiciones abiertas: 0
```

#### `/risk`

```text
MAX_RISK_PER_TRADE: 1%
MAX_OPEN_POSITIONS: 3
DEFAULT_STOP_LOSS_PCT: 1.5%
DEFAULT_TAKE_PROFIT_PCT: 3%
```

#### `/signals`

```text
Ultimas senales:
BUY BTCUSDT | p=0.7421 | SL=63250.15 TP=64990.4
BUY ETHUSDT | p=0.7012 | SL=3290.15 TP=3401.50
```

### Event Subscription

The bot subscribes to:

- `signal_generated`
- `execution.completed`

### Confirmation Event Schema

Published on confirm button click.

```json
{
  "signalId": "6a46f194-dcf6-4ef2-95a2-f9b5b9cd6408",
  "approved": true,
  "symbol": "BTCUSDT",
  "action": "buy",
  "createdAt": "2026-04-06T22:12:52.901Z"
}
```

### Example Conversation

```text
Bot:
Signal: BUY BTCUSDT
ProbUp: 0.7421
SL: 63250.15
TP: 64990.4
Confirmar ejecucion?

User clicks:
Aceptar

Bot answer:
Operacion confirmada
```

### Error Cases

- Missing `TELEGRAM_BOT_TOKEN`.
- No active chat available and no `TELEGRAM_DEFAULT_CHAT_ID` set.
- Malformed signal event.
- Telegram API rate limiting.

### Example Error

```text
telegram-bot signal message error Error: 403: Forbidden: bot was blocked by the user
```

## 7. Summary of Canonical Redis Events

| Event | Producer | Consumer |
|---|---|---|
| `market_candles_updated` | market-data-service | future subscribers |
| `market.features.calculated` | market-data-service | ai-engine |
| `ai.probability.generated` | ai-engine | signal-engine |
| `signal_generated` | signal-engine | risk-engine, telegram-bot |
| `risk_evaluated` | risk-engine | downstream consumers |
| `trade_confirmed` | telegram-bot | execution-engine |
| `order_executed` | execution-engine | observability / persistence |
| `position_closed` | execution-engine | position lifecycle consumers |
| `execution.completed` | execution-engine | risk-engine, telegram-bot |

## 8. Notes on Current Compatibility Topics

During migration, some services still emit dotted legacy topics in addition to canonical snake_case topics.

Examples:

- `trade.confirmed`
- `signal.generated`
- `risk.evaluated`
- `market.features.calculated`
- `execution.completed`

Consumers should prefer canonical topics where available.
