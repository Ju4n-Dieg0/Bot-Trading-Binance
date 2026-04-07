# Telegram Bot Setup Guide

This bot is used for monitoring and manual trade confirmation.

## 1. Create Bot with BotFather

In Telegram:

1. Open `@BotFather`.
2. Run `/newbot`.
3. Set bot name and username.
4. Copy token.

## 2. Configure Environment

```env
TELEGRAM_BOT_TOKEN=123456789:AAExampleToken
TELEGRAM_DEFAULT_CHAT_ID=987654321
```

How to get chat ID:

- Send any message to your bot.
- Use Telegram update tools or logs to inspect `chat.id`.

## 3. Start Bot

```bash
pnpm start:telegram-bot
```

Expected startup behavior:

- Bot listens for commands.
- Bot subscribes to `signal_generated`.
- Bot sends inline confirmation buttons: `Aceptar` / `Rechazar`.

## 4. Example Signal Message

```text
Signal: BUY BTCUSDT
ProbUp: 0.7421
SL: 63250.15
TP: 64990.4
Confirmar ejecucion?
```

After clicking `Aceptar`, bot emits `trade_confirmed` event.
