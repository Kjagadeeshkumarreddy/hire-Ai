from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Hiring Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Environment variables required (MUST be provided)
    DATABASE_URL: str
    REDIS_URL: str
    
    @property
    def redis_url(self) -> str:
        return self.REDIS_URL.strip()
        
    GROQ_API_KEY: str
    GITHUB_TOKEN: str
    
    @property
    def groq_api_key(self) -> str:
        return self.GROQ_API_KEY.strip()

    @property
    def github_token(self) -> str:
        return self.GITHUB_TOKEN.strip()

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
        # Ensures SQLAlchemy always uses the psycopg v3 driver flawlessly
        url = self.DATABASE_URL.strip()
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    @property
    def psycopg_url(self) -> str:
        # Native psycopg3 URI
        return self.DATABASE_URL.strip()

settings = Settings()
