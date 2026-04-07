# Local Installation Guide

This guide sets up the full development workspace on Windows, macOS, or Linux.

## Prerequisites

- Node.js 20+
- npm 10+
- pnpm (installed globally)
- Python 3.11+
- Docker Desktop (or Docker Engine + Compose)
- Git

## 1. Clone Repository

```bash
git clone <your-repository-url> bot-trading
cd bot-trading
```

## 2. Install pnpm (if missing)

```bash
npm install -g pnpm
pnpm --version
```

Expected output example:

```text
9.12.1
```

## 3. Install Monorepo Dependencies

```bash
pnpm install
```

## 4. Create Local Environment File

```bash
cp .env.example .env
```

PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

## 5. Build All Packages

```bash
pnpm build
```

## 6. Run Services in Development Mode (without Docker)

In separate terminals:

```bash
pnpm start:trading-api
pnpm start:telegram-bot
pnpm start:market-data
pnpm --filter @services/signal-engine dev
pnpm --filter @services/risk-engine dev
pnpm --filter @services/execution-engine dev
```

Run AI service:

```bash
cd services/ai-engine
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

## 7. Quick Health Checks

```bash
curl http://localhost:8000/health
curl http://localhost:3000
```

Example AI health response:

```json
{
  "status": "ok",
  "mode": "paper"
}
```
