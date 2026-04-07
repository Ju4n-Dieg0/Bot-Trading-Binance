# Troubleshooting Guide

## Common Errors and Fixes

### 1. `pnpm: command not found`

Cause: pnpm not installed globally.

Fix:

```bash
npm install -g pnpm
pnpm --version
```

### 2. `TELEGRAM_BOT_TOKEN is required`

Cause: missing token in `.env`.

Fix:

```env
TELEGRAM_BOT_TOKEN=123456789:AAExampleToken
```

### 3. Redis connection refused

Cause: Redis not started or wrong host/port.

Fix:

```bash
docker compose up -d redis
```

Check:

```bash
redis-cli -h localhost -p 6379 ping
```

Expected:

```text
PONG
```

### 4. Binance order rejected in real mode

Possible causes:

- Invalid API key/secret
- Symbol restrictions
- Insufficient balance
- Timestamp drift

Fix checklist:

- Validate API keys.
- Sync server time (NTP).
- Confirm Spot trading permission.
- Verify quantity and notional rules.

### 5. PostgreSQL auth failed

Cause: mismatch between `.env` and container credentials.

Fix:

```bash
docker compose down -v
docker compose up -d
```

### 6. No signals arriving to Telegram

Checklist:

- `market-data-service` producing features
- `ai-engine` running and connected to Redis
- `signal-engine` subscribed and alive
- Chat ID configured or active chat detected
