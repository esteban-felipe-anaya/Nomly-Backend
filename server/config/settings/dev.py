"""Development settings."""

from .base import *  # noqa: F401,F403
from .base import env

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Permissive CORS in dev so the Next.js admin and Flutter web "just work".
CORS_ALLOW_ALL_ORIGINS = True
