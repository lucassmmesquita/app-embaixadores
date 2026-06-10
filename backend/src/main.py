"""
═══════════════════════════════════════════════════════════════
  Rede de Embaixadores — Backend API
  FastAPI application entry point
═══════════════════════════════════════════════════════════════
"""

import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from src.core.config import settings
from src.modules.auth.router import router as auth_router
from src.modules.users.router import router as users_router
from src.modules.gamification.router import router as gamification_router
from src.modules.missions.router import router as missions_router
from src.modules.events.router import router as events_router
from src.modules.content.router import router as content_router
from src.modules.notifications.router import router as notifications_router
from src.modules.invitations.router import router as invitations_router
from src.modules.invitations.landing import router as landing_router
from src.modules.pages.static_pages import router as pages_router
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
app.include_router(invitations_router, prefix="/api/v1/invitations", tags=["Invitations"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])

# ═══ PUBLIC PAGES (non-API routes) ═══
app.include_router(landing_router, tags=["Landing"])
app.include_router(pages_router, tags=["Pages"])

# ═══ STATIC FILES (icon, favicon) ═══
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# ═══ PWA ROOT FALLBACKS (for assets referenced without /app prefix) ═══
webapp_dir_check = Path(__file__).parent / "webapp"
if webapp_dir_check.exists():
    for _fname in ["icon-192.png", "icon-512.png", "manifest.json", "sw.js", "favicon.ico"]:
        _fpath = webapp_dir_check / _fname

        def _make_handler(fpath=_fpath, fname=_fname):
            async def handler():
                import mimetypes as _mt
                media_type = _mt.guess_type(str(fpath))[0] or "application/octet-stream"
                return FileResponse(str(fpath), media_type=media_type)
            handler.__name__ = f"pwa_root_{fname.replace('.', '_').replace('-', '_')}"
            return handler

        if _fpath.is_file():
            app.get(f"/{_fname}", include_in_schema=False)(_make_handler())

# ═══ PWA WEB APP at /app ═══
webapp_dir = Path(__file__).parent / "webapp"
if webapp_dir.exists():
    import mimetypes
    from urllib.parse import unquote

    @app.get("/app", include_in_schema=False)
    async def serve_webapp_root():
        return FileResponse(str(webapp_dir / "index.html"), media_type="text/html")

    @app.get("/app/{path:path}", include_in_schema=False)
    async def serve_webapp_spa(path: str):
        """Serve PWA static files or fall back to index.html for SPA routing."""
        decoded_path = unquote(path)
        if ".." in decoded_path:
            return JSONResponse(status_code=400, content={"detail": "Invalid path"})
        file_path = webapp_dir / decoded_path
        if file_path.is_file():
            media_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
            return FileResponse(str(file_path), media_type=media_type)
        return FileResponse(str(webapp_dir / "index.html"), media_type="text/html")


# ═══ GLOBAL EXCEPTION HANDLER ═══
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Return detailed error info instead of generic 500."""
    tb = traceback.format_exc()
    print(f"❌ Unhandled exception on {request.method} {request.url}:\n{tb}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "path": str(request.url.path),
        },
    )


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
