# Production Deployment on VPS

This guide targets a single Linux VPS with Docker Compose.

## Recommended Baseline

- Ubuntu 24.04 LTS
- 2 vCPU, 4 GB RAM minimum
- Static public IP
- Domain + TLS (optional but recommended for API)

## 1. Provision Server

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw
```

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

## 3. Clone Project

```bash
git clone <your-repository-url> bot-trading
cd bot-trading
cp .env.example .env
```

## 4. Configure Production `.env`

- Set strong DB password.
- Set real Binance and Telegram credentials.
- Keep `TRADING_MODE=paper` for first production boot.

## 5. Start Services

```bash
cd infra/docker
docker compose up -d
```

## 6. Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw enable
```

Do not expose PostgreSQL and Redis publicly on internet-facing hosts unless explicitly required.

## 7. Monitoring Basics

```bash
docker compose logs -f trading-api
docker compose logs -f ai-engine
```

## 8. Zero-Downtime Update Pattern

```bash
cd ~/bot-trading
git pull
cd infra/docker
docker compose up -d --build
```

## Production Hardening Checklist

- Reverse proxy with TLS for API.
- Secrets in vault or encrypted env store.
- Redis auth and private network.
- Database backups and restore tests.
- Alerting on execution failures.
