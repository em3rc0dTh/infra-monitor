from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    SECRET_KEY: str = "b300f2e30f24254f19b8893ca6114e5ad67f8b9cad"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # DB Settings (Usar ruta absoluta completa fuera de /app para evitar conflictos de volúmenes)
    DATABASE_URL: str = "sqlite+aiosqlite:////data/infra_monitor.db"
    
    # n8n Settings
    N8N_EMAIL_WEBHOOK: str = "http://148.116.105.178/n8n/webhook/send-email"
    
    # Admin Settings
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
