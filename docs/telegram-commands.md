# Telegram Commands Guide

The bot provides operational and risk visibility commands.

## Available Commands

- `/start`: Start interaction and onboarding message.
- `/status`: Current mode, auto trading state, pending signals, open positions.
- `/signals`: Last signals summary.
- `/positions`: Open positions estimate.
- `/balance`: Estimated paper balance and realized PnL.
- `/risk`: Risk configuration summary.
- `/auto_on`: Enable auto mode for current chat.
- `/auto_off`: Disable auto mode for current chat.

## Example Interaction

```text
User: /status
Bot:
Modo trading: paper
Auto trading: OFF
Signals pendientes: 1
Posiciones abiertas: 0
```

```text
User: /risk
Bot:
MAX_RISK_PER_TRADE: 0.25%
MAX_OPEN_POSITIONS: 1
DEFAULT_STOP_LOSS_PCT: 1%
DEFAULT_TAKE_PROFIT_PCT: 2%
PAPER_INITIAL_BALANCE: 1000 USDT
```

## Signal Confirmation Workflow

1. Bot receives `signal_generated`.
2. Bot sends inline buttons:
   - `Aceptar`
   - `Rechazar`
3. On `Aceptar`, bot publishes `trade_confirmed`.

## Execution Confirmation And Balance

After the order is executed, the bot now sends a follow-up message with:

- executed price
- executed quantity
- estimated balance
- realized PnL for paper mode

Example execution message:

```text
BUY ejecutado en BTCUSDT
Precio: 63820.00
Cantidad: 0.001000
Balance estimado: 1005.18 USDT
PnL realizado: 0.00 USDT
```

Example callback result:

```text
Operacion confirmada
```
