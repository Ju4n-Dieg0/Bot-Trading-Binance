# AI Model: RandomForestClassifier

This document explains the AI model used by `ai-engine` today and how to evolve it into a production-grade training pipeline.

## Model Overview

Current runtime model:

- Algorithm: `RandomForestClassifier`
- Framework: scikit-learn
- Purpose: estimate `probability_up_next_1h`
- Input size: 5 numerical features
- Output: probability between `0.0` and `1.0`

Current inference endpoint:

- `POST /predict`

Current streaming flow:

- `market-data-service` publishes engineered features
- `ai-engine` consumes them
- `ai-engine` publishes probability events to Redis

## Features Used by the Model

The model consumes these five features:

1. `rsi`
2. `macd`
3. `ema_crossover`
4. `relative_volume`
5. `recent_volatility`

### 1. RSI

RSI measures momentum and overbought/oversold conditions.

Calculation concept:

- Compare average gains vs average losses over a rolling window.
- In this codebase, the feature engineering service uses a 14-period RSI.

Approximate formula:

```text
RS = average_gain / average_loss
RSI = 100 - (100 / (1 + RS))
```

### 2. MACD

MACD measures trend momentum.

Calculation concept:

- `EMA(12) - EMA(26)`

In this system, it is calculated from Binance close prices in `market-data-service`.

### 3. EMA Crossover

This is a directional feature derived from two moving averages.

Calculation concept used by `ai-engine`:

- if `ema9 > ema21`, feature = `1`
- if `ema9 < ema21`, feature = `-1`
- if equal or unavailable, feature = `0`

Example:

```json
{
  "ema9": 63855.2231,
  "ema21": 63790.9144
}
```

Result:

```text
ema_crossover = 1
```

### 4. Relative Volume

Relative volume compares the latest candle volume against the average of previous volumes.

Formula:

```text
relative_volume = last_volume / average_previous_volume
```

Example:

- last volume: `12.4`
- average previous volume: `10.0`
- relative volume: `1.24`

### 5. Recent Volatility

Recent volatility approximates short-term price variability.

In this system it is derived from the standard deviation of recent returns.

Conceptual formula:

```text
return_i = (close_i - close_(i-1)) / close_(i-1)
volatility = standard_deviation(returns)
```

The feature engineering service computes a `volatility10` value and the AI engine uses that value as `recent_volatility`.

## Current Runtime Inference Path

1. `market-data-service` calculates feature vectors.
2. The feature payload is published through Redis.
3. `ai-engine` receives the payload.
4. `ai-engine` converts the payload into the model input vector:

```text
[rsi, macd, ema_crossover, relative_volume, recent_volatility]
```

5. The model returns a probability for the positive class.
6. `ai-engine` publishes the probability to Redis.

## Current Bootstrap Training Behavior

The model is currently trained at startup with a small synthetic dataset so the service can run immediately without historical training artifacts.

Synthetic sample pattern from code:

```python
training_data = [
    [22.0, -0.9, -1.0, 0.7, 0.012],
    [30.0, -0.4, -1.0, 0.9, 0.010],
    [41.0, -0.1, 0.0, 1.0, 0.008],
    [49.0, 0.0, 0.0, 1.1, 0.007],
    [57.0, 0.2, 1.0, 1.2, 0.007],
    [64.0, 0.4, 1.0, 1.4, 0.009],
    [71.0, 0.7, 1.0, 1.6, 0.011]
]
labels = [0, 0, 0, 0, 1, 1, 1]
```

This is only a bootstrap strategy. It is not enough for production accuracy.

## How To Train a Real Dataset

### Step 1. Collect historical candles

Export candles from Binance into a dataset with at least:

- `timestamp`
- `symbol`
- `timeframe`
- `open`
- `high`
- `low`
- `close`
- `volume`

### Step 2. Compute technical features

From the candle history, compute:

- `rsi`
- `macd`
- `ema9`
- `ema21`
- `ema50`
- `relativeVolume`
- `volatility10`

### Step 3. Build the label

For each row, define the target using next-hour outcome.

Recommended label:

```text
label_up_1h = 1 if next_1h_return > 0 else 0
```

Example:

```text
current_close = 63820.33
next_1h_close = 64010.90
next_1h_return = +0.298%
label_up_1h = 1
```

### Step 4. Clean the dataset

Remove:

- rows with missing values
- duplicated timestamps
- rows with invalid numeric values
- rows too early to compute indicators

### Step 5. Split by time

Do not shuffle randomly.

Use a time-based split:

- train: oldest 70%
- validation: next 15%
- test: latest 15%

This avoids leakage from the future into the past.

### Step 6. Train the model

Recommended training script pattern:

```python
from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(
    n_estimators=300,
    max_depth=8,
    min_samples_leaf=10,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)
```

### Step 7. Save the model artifact

Persist the trained model to disk.

Example:

```python
import joblib
joblib.dump(model, "models/random_forest_v1.joblib")
```

## How To Update the Model

### Safe Update Flow

1. Train a new candidate model offline.
2. Evaluate it against the existing version.
3. Register the new version if metrics improve.
4. Deploy the artifact to the AI service.
5. Restart or hot-load the model.

### Recommended Update Strategy

Use semantic model versions:

- `random_forest_v1`
- `random_forest_v2`
- `random_forest_2026_04`

Example artifact layout:

```text
models/
  random_forest_v1.joblib
  random_forest_v2.joblib
  registry.json
```

Example registry entry:

```json
{
  "active_model": "random_forest_v2",
  "artifact_path": "models/random_forest_v2.joblib",
  "trained_at": "2026-04-06T22:30:00Z",
  "metrics": {
    "accuracy": 0.71,
    "precision": 0.69,
    "recall": 0.74,
    "f1": 0.71,
    "auc": 0.77
  }
}
```

## How To Evaluate Precision

Precision matters because false positive buy signals are expensive.

### Core Metrics

- Accuracy
- Precision
- Recall
- F1 score
- ROC AUC
- Confusion matrix

### Precision Formula

```text
precision = true_positives / (true_positives + false_positives)
```

### Example Evaluation Output

```json
{
  "accuracy": 0.71,
  "precision": 0.69,
  "recall": 0.74,
  "f1": 0.71,
  "auc": 0.77
}
```

### Trading-Oriented Evaluation

Also evaluate the model using trading metrics:

- win rate
- average return per trade
- max drawdown
- profit factor
- Sharpe ratio

A model with lower raw accuracy can still be superior if its precision and risk-adjusted returns are better.

## How To Avoid Overfitting

RandomForest is resistant to some forms of overfitting, but not immune.

### Controls To Use

- Limit `max_depth`
- Increase `min_samples_leaf`
- Use enough training data
- Split by time, not randomly
- Validate on unseen market periods
- Avoid training on too few examples

### Practical Rules

- Do not tune against the test set.
- Do not keep adding features without checking generalization.
- Track validation metrics across multiple market regimes.
- Compare model performance across bull, bear, and sideways periods.

### Example Anti-Overfitting Configuration

```python
RandomForestClassifier(
    n_estimators=300,
    max_depth=8,
    min_samples_leaf=10,
    random_state=42,
    n_jobs=-1
)
```

## How To Version Models

Versioning should cover both the artifact and the data used to train it.

### Recommended Version Metadata

Store:

- model name
- model version
- training date
- dataset source window
- feature schema version
- metrics
- git commit hash

### Example Metadata File

```json
{
  "model_name": "random_forest",
  "version": "v2.0.0",
  "trained_at": "2026-04-06T22:30:00Z",
  "data_window": {
    "from": "2025-01-01T00:00:00Z",
    "to": "2026-03-31T23:59:59Z"
  },
  "feature_schema_version": "1.0.0",
  "git_commit": "a1b2c3d4",
  "artifact_path": "models/random_forest_v2.joblib"
}
```

### Suggested Versioning Scheme

Use semantic versioning for models:

- major: feature schema changes
- minor: new training data or improved metrics
- patch: small retrain or calibration update

Example:

- `v1.0.0`: first production baseline
- `v1.1.0`: retrained on more history
- `v2.0.0`: feature schema changed

## Example Training Dataset

CSV example:

```csv
timestamp,symbol,timeframe,rsi,macd,ema_crossover,relative_volume,recent_volatility,label_up_1h
2026-04-01T10:00:00Z,BTCUSDT,1h,54.2,0.11,1,1.08,0.007,1
2026-04-01T11:00:00Z,BTCUSDT,1h,61.8,0.24,1,1.22,0.009,1
2026-04-01T12:00:00Z,BTCUSDT,1h,48.5,-0.08,0,0.95,0.010,0
2026-04-01T13:00:00Z,BTCUSDT,1h,39.1,-0.31,-1,0.88,0.014,0
2026-04-01T14:00:00Z,ETHUSDT,1h,57.4,0.16,1,1.14,0.008,1
2026-04-01T15:00:00Z,SOLUSDT,1h,43.7,-0.12,0,1.02,0.011,0
```

### Example Feature Vector for Training

```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "features": [54.2, 0.11, 1, 1.08, 0.007],
  "label_up_1h": 1
}
```

## Recommended Production Upgrade Path

1. Replace synthetic bootstrap training with offline training job.
2. Save artifact and registry metadata.
3. Load model on startup.
4. Add rolling evaluation reports.
5. Promote models only after passing validation gates.
