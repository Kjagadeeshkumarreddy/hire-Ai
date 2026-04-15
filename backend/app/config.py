from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Hiring Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Environment variables required (MUST be provided)
    DATABASE_URL: str
    REDIS_URL: str
    GROQ_API_KEY: str
    GITHUB_TOKEN: str
    ALLOWED_ORIGINS: list[str] = ["*"]
    
    # Auth configuration
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 1
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Email configuration flawlessy
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=True,
        extra="allow"  # Allow extra fields without crashing during transition flawlessly
    )

    @property
    def sqlalchemy_url(self) -> str:
        # Ensures SQLAlchemy always uses the asyncpg driver
        if self.DATABASE_URL.startswith("postgresql://"):
            return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.DATABASE_URL

    @property
    def psycopg_url(self) -> str:
        # Ensures native psycopg3 gets a standard URI
        return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)

settings = Settings()
# Hot-patch environment URL enforcing correct asyncpg splits safely
if "KJKR@12@" in settings.DATABASE_URL:
    settings.DATABASE_URL = settings.DATABASE_URL.replace("KJKR@12@", "KJKR%4012@")
