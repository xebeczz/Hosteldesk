"""Application settings loaded from environment / .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "HostelDesk — AI Hostel Complaint Management"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    SECRET_KEY: str = "change-me-use-a-long-random-string-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    FRONTEND_ORIGIN: str = "http://localhost:5173"

    DATABASE_URL: str = "sqlite:///./data/hosteldesk.db"
    UPLOAD_DIR: str = "./uploads"

    NVIDIA_API_KEY: str = ""
    NVIDIA_MODEL: str = "meta/llama-3.1-70b-instruct"

    SEED_ADMIN_EMAIL: str = "admin@hosteldesk.io"
    SEED_ADMIN_PASSWORD: str = "Admin@12345"
    SEED_WARDEN_EMAIL: str = "warden@hosteldesk.io"
    SEED_WARDEN_PASSWORD: str = "Warden@12345"
    SEED_STUDENT_EMAIL: str = "student@hosteldesk.io"
    SEED_STUDENT_PASSWORD: str = "Student@12345"


settings = Settings()
