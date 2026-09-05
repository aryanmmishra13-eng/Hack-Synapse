from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database.base import Base
from app.database.session import engine
from app.api import (
    auth, sports, bookings, waitlist, games, players, predictions, admin,
    equipment, tournaments, coaches, performance, achievements, weather
)

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Campus Sports Hub API",
    description="Intelligent College Sports Facility Management & Smart Booking Platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(sports.router)
app.include_router(bookings.router)
app.include_router(waitlist.router)
app.include_router(games.router)
app.include_router(players.router)
app.include_router(predictions.router)
app.include_router(admin.router)
app.include_router(equipment.router)
app.include_router(tournaments.router)
app.include_router(coaches.router)
app.include_router(performance.router)
app.include_router(achievements.router)
app.include_router(weather.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "Campus Sports Hub API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# Clean user-friendly error handler without exposing raw traceback to client
@app.exception_handler(Exception)
async def custom_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )
