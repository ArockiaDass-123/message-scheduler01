import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Enable OAuth2 over HTTP for local development
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from app.database import engine, Base
from app.config import settings
from app.routes import auth, workspaces, recipients, schedules, history, settings as app_settings
from app.scheduler import scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s")
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not exist
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    
    # Start background scheduler
    logger.info("Starting background scheduler...")
    await scheduler.start()
    
    yield
    
    # Shutdown
    logger.info("Stopping background scheduler...")
    await scheduler.stop()

app = FastAPI(
    title=settings.APP_NAME,
    description="Clean, reliable message & email scheduler for school and teacher workflows",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(recipients.router)
app.include_router(schedules.router)
app.include_router(history.router)
app.include_router(app_settings.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "scheduler_running": scheduler.is_running,
        "default_timezone": settings.DEFAULT_TIMEZONE
    }
