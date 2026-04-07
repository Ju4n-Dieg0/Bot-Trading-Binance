from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = Field(alias="APP_ENV", default="development")
    redis_host: str = Field(alias="REDIS_HOST")
    redis_port: int = Field(alias="REDIS_PORT", default=6379)
    redis_password: str = Field(alias="REDIS_PASSWORD", default="")
    trading_mode: str = Field(alias="TRADING_MODE", default="paper")


settings = Settings()

if settings.trading_mode not in {"paper", "live"}:
    raise ValueError("TRADING_MODE must be paper or live")
