
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Moudel AI API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    corpus_page_size: int = 200
    corpus_batch_size: int = 50
    corpus_max_pages_per_run: int = 1
    corpus_retrieval_candidates: int = 400
    corpus_retrieval_limit: int = 100
    # Supabase
    supabase_url: str
    supabase_publishable_key: str
    supabase_service_role_key: str = ""

    # Gemini
    gemini_api_key: str
    gemini_model: str = "gemini-3.8-flash"

    gemini_fallback_models: str = (
        "gemini-3.6-flash,"
        "gemini-3.5-flash-lite,"
        "gemini-2.5-flash,"
        "gemini-2.5-flash-lite"
    )
    gemini_retries: int = 2
    gemini_request_timeout_ms: int = 12000

    # OpenAlex
    openalex_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
