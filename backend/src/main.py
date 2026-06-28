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
from src.modules.content.landing import router as material_landing_router
from src.modules.events.landing import router as event_landing_router
from src.modules.pages.static_pages import router as pages_router
from src.modules.admin.router import router as admin_router
from src.modules.admin_auth.router import router as admin_auth_router
from src.modules.push.router import router as push_router
from src.modules.admin.upload import router as upload_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown logic."""
    # Startup
    print("🚀 Rede de Embaixadores API starting...")
    # Initialize Firebase Admin SDK for web push notifications
    from src.modules.push.providers.firebase import init_firebase
    init_firebase()
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
app.include_router(admin_auth_router, prefix="/api/v1/admin-auth", tags=["Admin Auth"])
app.include_router(push_router, prefix="/api/v1", tags=["Push Notifications"])
app.include_router(upload_router, prefix="/api/v1/admin", tags=["Admin Upload"])

# ═══ PUBLIC PAGES (non-API routes) ═══
app.include_router(landing_router, tags=["Landing"])
app.include_router(material_landing_router, tags=["Landing"])
app.include_router(event_landing_router, tags=["Landing"])
app.include_router(pages_router, tags=["Pages"])

# ═══ UPLOADS (persistent disk) ═══
import os as _os
_upload_dir = Path(_os.environ.get("UPLOAD_DIR", str(Path(__file__).parent.parent / "uploads")))
_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_upload_dir)), name="uploads")

# ═══ STATIC FILES (icon, favicon) ═══
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# ═══ PWA ROOT FALLBACKS (for assets referenced without /app prefix) ═══
webapp_dir_check = Path(__file__).parent / "webapp"
if webapp_dir_check.exists():
    for _fname in ["icon-192.png", "icon-512.png", "manifest.json", "sw.js", "favicon.ico", "firebase-messaging-sw.js"]:
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

    # Expo export uses absolute paths (/_expo/..., /assets/...) in index.html
    # Mount them at root so they resolve when PWA is served at /app
    _expo_dir = webapp_dir_check / "_expo"
    if _expo_dir.exists():
        app.mount("/_expo", StaticFiles(directory=str(_expo_dir)), name="expo_assets")

    _assets_dir = webapp_dir_check / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="pwa_assets")

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

# ═══ ADMIN PANEL at /admin ═══
adminweb_dir = Path(__file__).parent / "adminweb"
if adminweb_dir.exists():
    import mimetypes as _admin_mt
    from urllib.parse import unquote as _admin_unquote

    # Serve Next.js static assets at /admin/_next/...
    _next_static = adminweb_dir / "_next"
    if _next_static.exists():
        app.mount("/admin/_next", StaticFiles(directory=str(_next_static)), name="admin_next_static")

    @app.get("/admin", include_in_schema=False)
    async def serve_admin_root():
        return FileResponse(str(adminweb_dir / "index.html"), media_type="text/html")

    @app.get("/admin/{path:path}", include_in_schema=False)
    async def serve_admin_spa(path: str):
        """Serve admin static files or fall back to index.html for SPA routing."""
        decoded_path = _admin_unquote(path)
        if ".." in decoded_path:
            return JSONResponse(status_code=400, content={"detail": "Invalid path"})
        file_path = adminweb_dir / decoded_path
        # Serve exact file if exists
        if file_path.is_file():
            media_type = _admin_mt.guess_type(str(file_path))[0] or "application/octet-stream"
            return FileResponse(str(file_path), media_type=media_type)
        # Try adding .html (Next.js generates login.html, dashboard.html, etc.)
        html_path = adminweb_dir / f"{decoded_path}.html"
        if html_path.is_file():
            return FileResponse(str(html_path), media_type="text/html")
        # SPA fallback
        return FileResponse(str(adminweb_dir / "index.html"), media_type="text/html")


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


@app.get("/", include_in_schema=False)
async def root():
    """Serve the invite landing page as the homepage."""
    from src.modules.invitations.landing import _build_landing_html
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=_build_landing_html())


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "debug": settings.debug,
    }
