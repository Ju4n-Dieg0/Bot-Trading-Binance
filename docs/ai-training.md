# AI Model Training Guide

Current implementation uses a bootstrapped `RandomForestClassifier` with synthetic seed data for immediate operation.

## Current Runtime Model

- Model: `RandomForestClassifier`
- Inputs: `rsi`, `macd`, `ema_crossover`, `relative_volume`, `recent_volatility`
- Output: `probability_up_next_1h`

## Data Sources for Features

- Candles from Binance (`/api/v3/klines`).
- Indicators computed in market-data-service:
  - RSI
  - MACD
  - EMA 9/21/50
  - Relative Volume
  - Volatility(10)

## Local Inference Test

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

Example response:

```json
{
  "symbol": "BTCUSDT",
  "probability_up_next_1h": 0.73,
  "model_name": "RandomForestClassifier",
  "horizon": "1h"
}
```

## Training Pipeline Evolution (Recommended)

1. Export historical candles to dataset.
2. Build supervised labels (next 1h return > 0).
3. Split train/validation by time.
4. Train and version model artifacts.
5. Load artifacts at startup instead of synthetic training data.

## Suggested Dataset Schema

```csv
timestamp,symbol,rsi,macd,ema_crossover,relative_volume,recent_volatility,label_up_1h
2026-04-01T10:00:00Z,BTCUSDT,54.2,0.11,1,1.08,0.007,1
```
