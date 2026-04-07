# Security Checklist Before Production Deploy

This checklist is for deploying the trading stack to a real environment. Treat it as a release gate.

## Goals

- Protect exchange and messaging credentials.
- Reduce accidental trading risk.
- Prevent sensitive data exposure in logs.
- Keep runtime configuration auditable and revocable.
- Ensure the system cannot enter real trading without deliberate approval.

## 1. Protect Binance API Keys

Binance credentials control real capital. Handle them as production secrets.

### Recommended Controls

- Create a dedicated API key for this bot only.
- Enable only the permissions you actually need.
- Never enable withdrawal permissions.
- Restrict the key by trusted IP addresses.
- Use a separate key per environment.
- Rotate keys on a fixed schedule.

### Safe Binance Key Example

```env
BINANCE_API_KEY=prod_binance_key_here
BINANCE_API_SECRET=prod_binance_secret_here
```

### Do Not Do This

- Do not reuse personal trading keys.
- Do not store keys in code, chat, screenshots, or tickets.
- Do not commit secrets to git.
- Do not run with unrestricted keys on shared hosts.

## 2. Protect Telegram Bot Token

The Telegram bot token allows control over the operator interface.

### Recommended Controls

- Store the token in environment variables or secrets storage only.
- Use a dedicated Telegram bot per environment.
- Rotate the token if it is exposed.
- Limit access to the bot admin chat.
- Review bot members and operator permissions periodically.

### Safe Telegram Token Example

```env
TELEGRAM_BOT_TOKEN=123456789:AAExampleToken
```

### Do Not Do This

- Do not hardcode the token in source files.
- Do not print the token in startup logs.
- Do not send the token in support chats or issue comments.

## 3. Use Environment Variables Correctly

Environment variables are the default configuration mechanism in this project.

### Rules

- Keep secrets in `.env` locally and in secret managers in production.
- Never commit `.env`.
- Validate required variables at startup.
- Use different values for dev, staging, and production.
- Prefer explicit values over implicit defaults for production.

### Good Pattern

```env
TRADING_MODE=paper
REDIS_HOST=redis.internal
REDIS_PORT=6379
DATABASE_URL=postgresql://trading:strong_password@postgres.internal:5432/trading
```

### Bad Pattern

```env
TRADING_MODE=real
BINANCE_API_SECRET=
TELEGRAM_BOT_TOKEN=
```

### Production Rule

If a variable affects execution safety, set it explicitly in production. Do not rely on local defaults.

## 4. Avoid Logging Sensitive Data

Logs are often copied, forwarded, and retained longer than intended.

### Never Log

- Binance API key or secret
- Telegram bot token
- Database passwords
- Redis passwords
- Signed request payloads
- Full order headers
- Private chat IDs unless required and approved

### Safe Logging Examples

```text
execution-engine: order executed
execution-engine: binance request failed with status 401
telegram-bot: signal received for BTCUSDT
```

### Unsafe Logging Examples

```text
BINANCE_API_SECRET=abcd1234
TELEGRAM_BOT_TOKEN=123:secret
Authorization: HMAC ...
```

### Operational Guidance

- Log identifiers, not secrets.
- Redact payloads before logging.
- Limit debug logs in production.
- Store application logs in restricted access locations.

## 5. Use Docker Secrets in Production

If you deploy with Docker, do not keep production secrets as plain text in compose files.

### Recommended Approaches

- Docker secrets in Swarm or equivalent secret mounts.
- Secret files mounted at runtime with restricted permissions.
- External secret managers such as Vault, AWS Secrets Manager, Azure Key Vault, or GCP Secret Manager.

### Example Secret File Pattern

```text
/run/secrets/binance_api_key
/run/secrets/binance_api_secret
/run/secrets/telegram_bot_token
```

### Compose Conceptual Example

```yaml
secrets:
  binance_api_key:
    file: ./secrets/binance_api_key.txt
  binance_api_secret:
    file: ./secrets/binance_api_secret.txt
  telegram_bot_token:
    file: ./secrets/telegram_bot_token.txt
```

### Recommended Runtime Pattern

- Read the secret from a file or secret store.
- Inject into the process at startup.
- Avoid echoing the value in shell commands.

### Important Note

Docker Compose secrets support depends on the deployment mode. If you are using plain single-host Compose, you can still mount secret files, but you should treat them as protected host files and lock down permissions tightly.

## 6. Rotate Credentials

Rotation reduces blast radius if a secret leaks.

### Rotate When

- A credential is exposed accidentally.
- An operator leaves the team.
- You move from staging to production.
- On a regular schedule, for example every 60 to 90 days.

### Rotation Order

1. Generate new credential.
2. Update secret store.
3. Restart services using the new value.
4. Confirm health checks pass.
5. Revoke the old credential.
6. Verify no service still depends on the old one.

### Example Rotation Log Entry

```text
2026-04-06T22:40:00Z credential rotation completed for binance-prod-key-v2
```

## 7. Activate Rate Limiting

Rate limiting protects external APIs and your own services from burst traffic.

### Where To Apply It

- Telegram bot command endpoints and webhook handlers.
- Trading API HTTP endpoints.
- Any future admin or dashboard endpoints.
- Outbound Binance request frequency.

### Practical Limits

- Telegram command rate: 1-3 requests per user per second.
- Trading API public endpoint rate: conservative per-IP limits.
- Binance market polling: avoid aggressive loops and parallel bursts.

### Implementation Options

- Reverse proxy rate limiting with Nginx or Traefik.
- API gateway limits.
- Application-level throttling in NestJS.
- Redis-based counters for distributed limits.

### Example Nginx Concept

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=5r/s;
```

### Binance-Side Protection

- Do not spam `GET /api/v3/klines`.
- Do not retry immediately on repeated failures without backoff.
- Use exponential backoff and jitter.

## 8. Prevent Accidental Real Trading

This is the most important operational safety control.

### Required Safeguards

- Keep `TRADING_MODE=paper` by default.
- Require explicit human approval before any real order.
- Use low-risk defaults in production.
- Separate paper and real credentials.
- Restrict real mode to controlled deployment windows.
- Add a preflight confirmation step before startup.

### Safe Default Example

```env
TRADING_MODE=paper
MAX_RISK_PER_TRADE=0.5
MAX_OPEN_POSITIONS=1
```

### Additional Hard Controls

- Use a deployment flag such as `ALLOW_REAL_TRADING=true`.
- Refuse boot if `TRADING_MODE=real` and required approvals are missing.
- Display the current mode at startup.
- Make the Telegram bot echo the active mode in `/status`.

### Example Startup Guard

```text
Refusing to start in real mode without ALLOW_REAL_TRADING=true
```

## 9. Pre-Deploy Production Checklist

Use this list as a release gate before going live.

### Credentials

- [ ] Binance API key is dedicated to this bot.
- [ ] Binance withdrawal permissions are disabled.
- [ ] Binance API key is IP restricted.
- [ ] Telegram bot token is stored in secrets storage.
- [ ] Production secrets are different from staging and dev.
- [ ] Old credentials have been revoked after rotation.

### Configuration

- [ ] `.env` is not committed to git.
- [ ] `TRADING_MODE` is explicitly set.
- [ ] `TRADING_MODE=paper` for validation runs.
- [ ] `MAX_RISK_PER_TRADE` is conservative.
- [ ] `MAX_OPEN_POSITIONS` is limited.
- [ ] Redis and PostgreSQL credentials are set.

### Logging and Monitoring

- [ ] Secrets are redacted in logs.
- [ ] Debug logs are disabled or restricted in production.
- [ ] Health checks are working.
- [ ] Alerts are configured for execution failures.

### Runtime Safety

- [ ] Real trading is blocked by default.
- [ ] Human approval path is tested.
- [ ] Paper trading flow was validated end to end.
- [ ] Rate limiting is active on public endpoints.
- [ ] Binance API request rates are under control.

### Infrastructure

- [ ] Docker secrets or an external secret manager is used.
- [ ] PostgreSQL is not publicly exposed.
- [ ] Redis is not publicly exposed.
- [ ] Firewall rules are correct.
- [ ] VPS access is restricted.

## 10. Final Go-Live Gate

Do not deploy to real trading until all of these are true:

- Paper trading has been run successfully for a meaningful validation period.
- Model behavior has been reviewed with real historical data.
- Risk limits are explicitly reviewed.
- Secrets are stored securely.
- Real trading mode requires deliberate operator action.
- Rollback to `paper` mode is documented and tested.

## Example Approval Record

```text
release: 2026-04-06
mode: paper
binance_key: ok
telegram_token: ok
rate_limit: enabled
real_trading_guard: enabled
approved_by: ops
```
