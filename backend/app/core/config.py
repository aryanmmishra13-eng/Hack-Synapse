import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load .env from backend/ or root project dir
load_dotenv()
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")
load_dotenv(dotenv_path=Path(__file__).resolve().parents[3] / ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Campus Sports Hub API"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "campus_sports_hub_hackathon_super_secret_jwt_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://campus_user:campus_pass@localhost:5432/campus_sports_db"
    )

    class Config:
        case_sensitive = True

settings = Settings()
