# Telegram Commands Guide

The bot provides operational and risk visibility commands.

## Available Commands

- `/start`: Start interaction and onboarding message.
- `/status`: Current mode, auto trading state, pending signals, open positions.
- `/signals`: Last signals summary.
- `/positions`: Open positions estimate.
- `/balance`: Balance placeholder (bootstrap version).
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
MAX_RISK_PER_TRADE: 1%
MAX_OPEN_POSITIONS: 3
DEFAULT_STOP_LOSS_PCT: 1.5%
DEFAULT_TAKE_PROFIT_PCT: 3%
```

## Signal Confirmation Workflow

1. Bot receives `signal_generated`.
2. Bot sends inline buttons:
   - `Aceptar`
   - `Rechazar`
3. On `Aceptar`, bot publishes `trade_confirmed`.

Example callback result:

```text
Operacion confirmada
```
