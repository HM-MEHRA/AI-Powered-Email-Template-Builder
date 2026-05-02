from pathlib import Path
from uuid import uuid4

from django.conf import settings
from rest_framework.exceptions import ValidationError


CONTEXT_UPLOAD_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".png", ".jpg", ".jpeg"}
IMAGE_UPLOAD_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def safe_upload_name(file_name: str = ""):
    original = Path(file_name or "upload")
    stem = "".join(char if char.isalnum() or char in "-_" else "-" for char in original.stem).strip("-_")
    suffix = original.suffix.lower()
    return f"{stem or 'upload'}{suffix}"


def validate_uploaded_file(uploaded_file, allowed_extensions=None, max_size=MAX_UPLOAD_BYTES):
    if not uploaded_file:
        return

    allowed = allowed_extensions or CONTEXT_UPLOAD_EXTENSIONS
    extension = Path(uploaded_file.name or "").suffix.lower()
    if extension not in allowed:
        allowed_text = ", ".join(sorted(allowed))
        raise ValidationError({"file": f"Unsupported file type. Upload one of: {allowed_text}."})

    size = getattr(uploaded_file, "size", 0) or 0
    if size > max_size:
        limit_mb = max_size // (1024 * 1024)
        raise ValidationError({"file": f"File is too large. Maximum upload size is {limit_mb} MB."})


def save_uploaded_file(uploaded_file, subdirectory="uploaded_images", allowed_extensions=None):
    validate_uploaded_file(uploaded_file, allowed_extensions=allowed_extensions)

    upload_dir = Path(settings.MEDIA_ROOT) / subdirectory
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_name = safe_upload_name(uploaded_file.name)
    destination_name = safe_name
    destination = upload_dir / destination_name
    if destination.exists():
        stem = Path(safe_name).stem
        suffix = Path(safe_name).suffix
        destination_name = f"{stem}-{uuid4().hex[:8]}{suffix}"
        destination = upload_dir / destination_name

    with destination.open("wb+") as output:
        for chunk in uploaded_file.chunks():
            output.write(chunk)

    return f"{settings.SITE_URL}{settings.MEDIA_URL}{subdirectory}/{destination_name}"
