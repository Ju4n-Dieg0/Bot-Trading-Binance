# System Testing Guide

Testing should cover unit logic, service integration, and full event pipeline behavior.

## 1. Run Monorepo Tests

```bash
pnpm test
```

Current packages may print bootstrap placeholders for tests where suites are not yet implemented.

## 2. Build Validation

```bash
pnpm build
```

## 3. AI Engine API Test

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol":"ETHUSDT","rsi":62,"macd":0.21,"ema_crossover":1,"relative_volume":1.3,"recent_volatility":0.01}'
```

## 4. Redis Event Inspection

```bash
redis-cli SUBSCRIBE signal_generated risk_evaluated order_executed
```

Expected stream example:

```text
message
signal_generated
{"signalId":"...","symbol":"BTCUSDT","action":"buy"}
```

## 5. End-to-End Paper Flow Test

1. Start infra and services.
2. Wait for signal in Telegram.
3. Confirm signal.
4. Validate `order_executed` event and DB insertion.

## 6. Database Assertions

```sql
select symbol, side, status, trading_mode, created_at
from orders
order by created_at desc
limit 10;
```
