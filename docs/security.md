# Security Best Practices

This system handles exchange credentials and trading operations; secure defaults are mandatory.

## Critical Rules

- Never enable Binance withdrawal permissions.
- Never commit `.env` to git.
- Use minimum required privileges.
- Restrict Binance API keys by IP.

## API Key Safety

- Store secrets in environment variables only.
- Rotate keys periodically.
- Separate keys per environment (dev/staging/prod).

## `.env` Example (Safe Pattern)

```env
BINANCE_API_KEY=prod_key_here
BINANCE_API_SECRET=prod_secret_here
TELEGRAM_BOT_TOKEN=prod_bot_token_here
```

## Infrastructure Security

- Redis and PostgreSQL on private network.
- Disable public inbound access to 5432 and 6379.
- Add host firewall and fail2ban.

## Application Security

- Validate all env at startup.
- Enforce strict typing for event payloads.
- Add idempotency for order execution path in production.

## Incident Response

If secret leak is suspected:

1. Revoke Binance keys immediately.
2. Revoke Telegram token and regenerate.
3. Rotate DB credentials.
4. Review logs and recent deployments.
