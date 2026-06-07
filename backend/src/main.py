"""
═══════════════════════════════════════════════════════════════
  Rede de Embaixadores — Backend API
  FastAPI application entry point
═══════════════════════════════════════════════════════════════
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.modules.auth.router import router as auth_router
from src.modules.users.router import router as users_router
from src.modules.gamification.router import router as gamification_router
from src.modules.missions.router import router as missions_router
from src.modules.events.router import router as events_router
from src.modules.content.router import router as content_router
from src.modules.notifications.router import router as notifications_router
from src.modules.admin.router import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown logic."""
    # Startup
    print("🚀 Rede de Embaixadores API starting...")
    yield
    # Shutdown
    print("🛑 Rede de Embaixadores API shutting down...")


app = FastAPI(
    title="Rede de Embaixadores API",
    description="API para a plataforma de mobilização política com gamificação",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ═══ CORS ═══
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══ ROUTERS ═══
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(gamification_router, prefix="/api/v1/gamification", tags=["Gamification"])
app.include_router(missions_router, prefix="/api/v1/missions", tags=["Missions"])
app.include_router(events_router, prefix="/api/v1/events", tags=["Events"])
app.include_router(content_router, prefix="/api/v1/content", tags=["Content"])
app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Rede de Embaixadores API",
        "version": "0.1.0",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "debug": settings.debug,
    }
