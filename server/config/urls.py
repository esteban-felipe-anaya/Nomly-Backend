"""Root URL configuration.

Routes mirror the json-server mock contract exactly (no `/api` prefix), so the
Flutter app works by only switching its baseUrl.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("django-admin/", admin.site.urls),
    # OpenAPI schema + interactive docs.
    path("api/schema", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Staff-only admin API for the Next.js dashboard (separate from the
    # Flutter contract paths, so parity is preserved).
    path("admin-api/", include("apps.adminapi.urls")),
    path("", include("apps.accounts.urls")),  # /auth/*, /addresses
    path("", include("apps.catalog.urls")),  # /cuisines, /banners, /restaurants, /dishes
    path("", include("apps.orders.urls")),  # /promo/validate, /orders, /orders/:id/tracking
    path("", include("apps.engagement.urls")),  # /favorites, /notifications
]

# Serve uploaded media in development (use a real file server / object storage in prod).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

