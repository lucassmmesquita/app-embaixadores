"""
═══════════════════════════════════════════════════════════════
  Admin — File Upload Endpoint
  Saves files to persistent disk (Render) or local ./uploads
═══════════════════════════════════════════════════════════════
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from typing import Annotated

from src.modules.admin_auth.dependencies import get_current_admin_user
from src.modules.admin_auth.models import AdminUser

router = APIRouter()

# ─── Config ───
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "./uploads"))
MAX_FILE_SIZE = int(os.environ.get("UPLOAD_MAX_SIZE_MB", "50")) * 1024 * 1024  # default 50MB

ALLOWED_MIME_TYPES = {
    # Images
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
    # Videos
    "video/mp4", "video/webm", "video/quicktime",
}

EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}


def ensure_upload_dir():
    """Create upload directory structure if it doesn't exist."""
    (UPLOAD_DIR / "content").mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / "thumbnails").mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_file(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    file: UploadFile = File(...),
    folder: str = "content",
):
    """
    Upload a file to persistent storage.
    Returns the public URL to access the file.
    Folder can be 'content' or 'thumbnails'.
    """
    if folder not in ("content", "thumbnails"):
        raise HTTPException(status_code=400, detail="Pasta inválida. Use 'content' ou 'thumbnails'.")

    # Validate MIME type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo não permitido: {content_type}. "
                   f"Aceitos: imagens, vídeos e documentos (PDF, Word, Excel, PowerPoint).",
        )

    # Read file and validate size
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande ({len(data) // (1024 * 1024)}MB). Máximo: {max_mb}MB.",
        )

    # Generate unique filename
    ext = EXTENSION_MAP.get(content_type, Path(file.filename or "file").suffix or ".bin")
    unique_name = f"{uuid.uuid4().hex[:12]}{ext}"

    # Save to disk
    ensure_upload_dir()
    dest = UPLOAD_DIR / folder / unique_name
    dest.write_bytes(data)

    # Return relative URL (clients resolve with their API base)
    url = f"/uploads/{folder}/{unique_name}"

    return {
        "url": url,
        "filename": file.filename,
        "size": len(data),
        "content_type": content_type,
    }
