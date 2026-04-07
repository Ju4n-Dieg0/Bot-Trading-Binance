# Docker Deployment Guide

Use Docker Compose to run local infrastructure and selected app services.

## Compose Location

- `infra/docker/docker-compose.yml`

## Included Services

- `postgres`
- `redis`
- `trading-api`
- `telegram-bot`
- `ai-engine`

## Ports Exposed

- PostgreSQL: `5432`
- Redis: `6379`
- Trading API: `3000`
- AI Engine: `8000`

## 1. Start Stack

```bash
cd infra/docker
docker compose up -d
```

## 2. Check Status

```bash
docker compose ps
```

Example output:

```text
NAME                   STATUS          PORTS
trading-postgres       running         0.0.0.0:5432->5432/tcp
trading-redis          running         0.0.0.0:6379->6379/tcp
trading-api            running         0.0.0.0:3000->3000/tcp
trading-telegram-bot   running
ai-engine              running         0.0.0.0:8000->8000/tcp
```

## 3. Stop Stack

```bash
docker compose down
```

## 4. Remove Volumes (Reset Data)

```bash
docker compose down -v
```

## 5. Rebuild and Restart

```bash
docker compose down
docker compose up -d --build
```
