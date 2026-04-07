# Binance API Setup Guide

This project uses Binance Spot APIs for market data and real order execution.

## 1. Create API Key

1. Open Binance account settings.
2. Go to API Management.
3. Create a new API key for this bot.

## 2. Required Permissions

Enable:

- `Enable Reading`
- `Enable Spot & Margin Trading` (Spot required)

Never enable:

- `Enable Withdrawals`

## 3. IP Restriction (Recommended)

Set API key to trusted static IPs only (your VPS IP).

## 4. Add Credentials to `.env`

```env
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
BINANCE_BASE_URL=https://api.binance.com
```

## 5. Verify Connectivity

Test public endpoint:

```bash
curl "https://api.binance.com/api/v3/time"
```

Expected response example:

```json
{
  "serverTime": 1775528823456
}
```

## 6. Real Trading Readiness Checklist

- API key has no withdrawal permission.
- API key is IP restricted.
- `TRADING_MODE=real` only after paper validation.
- Position size hard limits are configured.

## Binance API Usage Limits

The system uses:

- `GET /api/v3/klines` for candles.
- `POST /api/v3/order` for market execution in real mode.

Respect Binance request-weight and order rate limits. Use conservative polling and avoid parallel burst requests in production.
