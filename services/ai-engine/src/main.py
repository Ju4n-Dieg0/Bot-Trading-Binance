from fastapi import FastAPI
from redis import Redis
import json
from threading import Thread
from sklearn.ensemble import RandomForestClassifier
from pydantic import BaseModel, Field

from src.config import settings

app = FastAPI(title="ai-engine", version="0.1.0")
redis_client: Redis | None = None


class PredictRequest(BaseModel):
    symbol: str = Field(default="BTCUSDT")
    rsi: float
    macd: float
    ema_crossover: float = Field(description="1 if bullish crossover, 0 if neutral, -1 if bearish")
    relative_volume: float
    recent_volatility: float


class PredictResponse(BaseModel):
    symbol: str
    probability_up_next_1h: float
    model_name: str
    horizon: str


def build_model() -> RandomForestClassifier:
    model = RandomForestClassifier(n_estimators=200, random_state=42)
    training_data = [
        [22.0, -0.9, -1.0, 0.7, 0.012],
        [30.0, -0.4, -1.0, 0.9, 0.010],
        [41.0, -0.1, 0.0, 1.0, 0.008],
        [49.0, 0.0, 0.0, 1.1, 0.007],
        [57.0, 0.2, 1.0, 1.2, 0.007],
        [64.0, 0.4, 1.0, 1.4, 0.009],
        [71.0, 0.7, 1.0, 1.6, 0.011],
    ]
    labels = [0, 0, 0, 0, 1, 1, 1]
    model.fit(training_data, labels)
    return model


model = build_model()


def build_model_input(
    *,
    rsi: float,
    macd: float,
    ema_crossover: float,
    relative_volume: float,
    recent_volatility: float,
) -> list[float]:
    return [
        float(rsi),
        float(macd),
        float(ema_crossover),
        float(relative_volume),
        float(recent_volatility),
    ]


def predict_up_probability(vector: list[float]) -> float:
    probability_up = float(model.predict_proba([vector])[0][1])
    return round(probability_up, 6)


def resolve_ema_crossover(payload: dict) -> float:
    ema9 = payload.get("ema9")
    ema21 = payload.get("ema21")

    if ema9 is None or ema21 is None:
        return 0.0

    if float(ema9) > float(ema21):
        return 1.0
    if float(ema9) < float(ema21):
        return -1.0
    return 0.0


def consume_market_features() -> None:
    global redis_client
    if redis_client is None:
        return

    pubsub = redis_client.pubsub(ignore_subscribe_messages=True)
    pubsub.subscribe("market.features.calculated")

    for message in pubsub.listen():
        if message.get("type") != "message":
            continue

        raw_payload = message.get("data")
        if isinstance(raw_payload, bytes):
            raw_payload = raw_payload.decode("utf-8")

        payload = json.loads(raw_payload)
        vector = build_model_input(
            rsi=float(payload["rsi"]),
            macd=float(payload["macd"]),
            ema_crossover=resolve_ema_crossover(payload),
            relative_volume=float(payload["relativeVolume"]),
            recent_volatility=float(payload.get("volatility10", payload.get("volatility", 0))),
        )

        probability_up = predict_up_probability(vector)
        output = {
            "symbol": payload["symbol"],
            "probabilityUp": probability_up,
            "probabilityUpNext1h": probability_up,
            "horizon": "1h",
            "features": payload,
            "modelName": "RandomForest",
            "createdAt": payload.get("createdAt"),
        }
        redis_client.publish("ai.probability.generated", json.dumps(output))


@app.on_event("startup")
def startup() -> None:
    global redis_client
    redis_client = Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        password=settings.redis_password or None,
        decode_responses=True,
    )
    redis_client.ping()
    Thread(target=consume_market_features, daemon=True).start()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": settings.trading_mode}


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    vector = build_model_input(
        rsi=request.rsi,
        macd=request.macd,
        ema_crossover=request.ema_crossover,
        relative_volume=request.relative_volume,
        recent_volatility=request.recent_volatility,
    )
    probability_up = predict_up_probability(vector)

    return PredictResponse(
        symbol=request.symbol,
        probability_up_next_1h=probability_up,
        model_name="RandomForestClassifier",
        horizon="1h",
    )
