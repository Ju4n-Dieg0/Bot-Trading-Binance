# Roadmap

## Near Term (v0.2)

- Replace synthetic AI training with historical dataset pipeline.
- Unify all event names to typed canonical topics only.
- Add persistence adapters in all services.
- Add integration tests for event contracts.

## Mid Term (v0.3)

- Strategy plugin framework (multi-strategy support).
- Portfolio-level risk engine (cross-asset exposure).
- Real-time dashboard for positions, PnL, and signal quality.
- Alerting and incident hooks (Telegram + email + webhook).

## Production Maturity (v1.0)

- Full audit trail and idempotent execution workflow.
- Multi-tenant SaaS controls and RBAC.
- Backtesting and walk-forward validation toolkit.
- CI/CD with release channels and environment promotions.

## Future Research

- Reinforcement learning for execution timing.
- Regime detection for adaptive thresholds.
- Dynamic position sizing from probabilistic calibration.

## Example Milestone Board

```text
[Done]  Bootstrap monorepo + Docker + core services
[Done]  Event-driven pipeline with Telegram confirmation
[Doing] Event topic standardization and persistence integration
[Next]  Historical training pipeline and quality metrics
```
