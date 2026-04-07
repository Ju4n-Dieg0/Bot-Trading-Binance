# Real Trading Activation Guide

Real mode places actual Binance Spot market orders.

## Critical Warning

Only activate real mode after proving stability in paper mode.

## 1. Security Preconditions

- Binance key with trading permission only.
- No withdrawal permission.
- IP whitelist enabled.
- Low-risk defaults in env.

## 2. Switch Mode

```env
TRADING_MODE=real
```

## 3. Set Conservative Risk

```env
MAX_RISK_PER_TRADE=0.5
MAX_OPEN_POSITIONS=1
DEFAULT_STOP_LOSS_PCT=1.0
DEFAULT_TAKE_PROFIT_PCT=2.0
```

## 4. Start Services

Use Docker or local startup. Ensure `execution-engine` is running with valid Binance credentials.

## 5. Example Real Execution Outcome

```json
{
  "signalId": "3f0d3a2c-6f34-4f95-b7d5-6f4be56aa95d",
  "symbol": "BTCUSDT",
  "action": "buy",
  "status": "executed",
  "orderId": "18412589032",
  "executedPrice": 63820.22,
  "executedQty": 0.001,
  "tradingMode": "real",
  "reason": "binance-spot-executed"
}
```

## Rollback to Safe Mode

```env
TRADING_MODE=paper
```

Restart services after mode changes.
