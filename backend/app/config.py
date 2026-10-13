import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path=env_path, override=True)

class Settings(BaseSettings):
    APP_NAME: str = "Message Scheduler"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./scheduler.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "prod-ready-secure-message-scheduler-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "bXlzZWNyZXRrZXkxMjM0NTY3ODkwMTI=")  # For token encryption
    
    # Timezone
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "https://message-scheduler01.vercel.app")
    
    # WhatsApp Cloud API
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_ACCESS_TOKEN: str = os.getenv("WHATSAPP_ACCESS_TOKEN", "")

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        extra = "allow"

settings = Settings()
