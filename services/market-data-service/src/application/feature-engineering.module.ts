import { type Candle, type FeatureVector } from "@libs/shared";

function calculateEma(values: number[], period: number): number {
  if (values.length === 0) {
    return 0;
  }

  const multiplier = 2 / (period + 1);
  let ema = values[0];

  for (let i = 1; i < values.length; i += 1) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateRsi(closes: number[], period = 14): number {
  if (closes.length <= period) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  if (losses === 0) {
    return 100;
  }

  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calculateMacd(closes: number[]): number {
  if (closes.length < 26) {
    return 0;
  }

  const ema12 = calculateEma(closes, 12);
  const ema26 = calculateEma(closes, 26);
  return ema12 - ema26;
}

function calculateRelativeVolume(volumes: number[]): number {
  if (volumes.length < 2) {
    return 1;
  }

  const last = volumes[volumes.length - 1];
  const baseline = volumes.slice(0, volumes.length - 1);
  const avg = baseline.reduce((acc, item) => acc + item, 0) / baseline.length;
  return avg === 0 ? 1 : last / avg;
}

function calculateVolatility(closes: number[], lookback = 10): number {
  if (closes.length < lookback + 1) {
    return 0;
  }

  const returns: number[] = [];
  for (let i = closes.length - lookback; i < closes.length; i += 1) {
    const prev = closes[i - 1];
    const current = closes[i];
    if (prev > 0) {
      returns.push((current - prev) / prev);
    }
  }

  if (returns.length === 0) {
    return 0;
  }

  const mean = returns.reduce((acc, item) => acc + item, 0) / returns.length;
  const variance = returns.reduce((acc, item) => acc + (item - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

export function buildFeatureVector(candles: Candle[], symbol: string, interval: string): FeatureVector {
  const closes = candles.map((item) => item.close);
  const volumes = candles.map((item) => item.volume);

  const ema9 = calculateEma(closes, 9);
  const ema21 = calculateEma(closes, 21);
  const ema50 = calculateEma(closes, 50);
  const volatility10 = calculateVolatility(closes, 10);

  return {
    symbol,
    interval,
    rsi: Number(calculateRsi(closes).toFixed(4)),
    macd: Number(calculateMacd(closes).toFixed(6)),
    ema9: Number(ema9.toFixed(4)),
    ema21: Number(ema21.toFixed(4)),
    ema50: Number(ema50.toFixed(4)),
    relativeVolume: Number(calculateRelativeVolume(volumes).toFixed(4)),
    volatility10: Number(volatility10.toFixed(6)),
    ema: Number(ema21.toFixed(4)),
    volatility: Number(volatility10.toFixed(6)),
    lastClose: closes[closes.length - 1] ?? 0,
    createdAt: new Date().toISOString()
  };
}
