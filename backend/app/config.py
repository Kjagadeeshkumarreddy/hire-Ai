from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Union
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Hiring Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Environment variables required (MUST be provided)
    DATABASE_URL: str
    REDIS_URL: str
    
    @property
    def redis_url(self) -> str:
        url = self.REDIS_URL.strip()
        if "-u " in url:
            url = url.split("-u ")[-1].strip()
        elif url.startswith("redis-cli"):
            parts = url.split()
            url = parts[-1].strip()
        if url.startswith("redis://") and "upstash.io" in url:
            url = "rediss://" + url[len("redis://"):]
        return url
        
    GROQ_API_KEY: str
    GITHUB_TOKEN: str
    
    @property
    def groq_api_key(self) -> str:
        return self.GROQ_API_KEY.strip()

    @property
    def github_token(self) -> str:
        return self.GITHUB_TOKEN.strip()

    ALLOWED_ORIGINS: Union[str, list[str]] = ["*"]
    
    @property
    def cors_origins(self) -> list[str]:
        val = self.ALLOWED_ORIGINS
        if isinstance(val, str):
            val = val.strip()
            if val.startswith("[") and val.endswith("]"):
                try:
                    import json
                    parsed = json.loads(val)
                    if isinstance(parsed, list):
                        return [str(x).strip() for x in parsed if str(x).strip()]
                except Exception:
                    pass
            return [x.strip() for x in val.split(",") if x.strip()]
        elif isinstance(val, list):
            return [str(x).strip() for x in val if str(x).strip()]
        return ["*"]
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

    # Security Configuration
    ADMIN_PASSKEY: str

    @property
    def admin_passkey(self) -> str:
        return self.ADMIN_PASSKEY.strip()

    # Google OAuth Configuration (for Calendar/Meet integration)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # Microsoft OAuth Configuration (for Teams integration)
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_CLIENT_SECRET: Optional[str] = None
    MICROSOFT_TENANT_ID: Optional[str] = None

    @property
    def psycopg_url(self) -> str:
        # Native psycopg3 URI
        return self.DATABASE_URL.strip()

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent / ".env"),
        case_sensitive=True,
        extra="allow"
    )

    @property
    def sqlalchemy_url(self) -> str:
        # Ensures SQLAlchemy always uses the psycopg v3 driver flawlessly
        url = self.DATABASE_URL.strip()
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

settings = Settings()
