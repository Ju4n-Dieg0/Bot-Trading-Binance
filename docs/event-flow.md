# Internal Event Flow

This system is event-driven and coordinated by Redis Pub/Sub.

## Core Event Topics

- `market_candles_updated`
- `signal_generated`
- `risk_evaluated`
- `trade_confirmed`
- `order_executed`
- `position_closed`

Compatibility topics may also exist during migration:

- `signal.generated`
- `risk.evaluated`
- `trade.confirmed`
- `execution.completed`

## Trading Pipeline Diagram (ASCII)

```text
+--------------------+       +-------------------+       +----------------+
| market-data-service| ----> |     ai-engine     | ----> | signal-engine  |
| candles + features |       | probability model |       | threshold > 65%|
+--------------------+       +-------------------+       +----------------+
                                                                  |
                                                                  v
                                                         +----------------+
                                                         |  risk-engine   |
                                                         | policy filters |
                                                         +----------------+
                                                                  |
                                                                  v
                                                         +----------------+
                                                         | telegram-bot   |
                                                         | approve/reject |
                                                         +----------------+
                                                                  |
                                                                  v
                                                         +----------------+
                                                         |execution-engine|
                                                         | paper / real   |
                                                         +----------------+
                                                                  |
                                                                  v
                                                         +----------------+
                                                         | PostgreSQL      |
                                                         +----------------+
```

## Step-by-Step Event Journey

1. Market data service publishes candle batches on `market_candles_updated`.
2. AI engine emits probability event.
3. Signal engine publishes `signal_generated` when `probabilityUp > 0.65`.
4. Risk engine evaluates and publishes `risk_evaluated`.
5. Telegram operator confirms; bot publishes `trade_confirmed`.
6. Execution engine executes and publishes `order_executed`.
7. Sell execution can emit `position_closed`.

## Example `trade_confirmed`

```json
{
  "signalId": "17e9c706-5f20-4f8d-9052-f47ab7e366a5",
  "approved": true,
  "symbol": "BTCUSDT",
  "action": "buy",
  "createdAt": "2026-04-06T22:12:52.501Z"
}
```
