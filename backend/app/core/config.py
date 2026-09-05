import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Campus Sports Hub API"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "campus_sports_hub_hackathon_super_secret_jwt_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///C:/Users/aryan/.gemini/antigravity/scratch/campus-sports-hub/backend/campus_sports.db"
    )

    class Config:
        case_sensitive = True

settings = Settings()
