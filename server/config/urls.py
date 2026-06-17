"""Root URL configuration.

Routes mirror the json-server mock contract exactly (no `/api` prefix), so the
Flutter app works by only switching its baseUrl.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("django-admin/", admin.site.urls),
    # Staff-only admin API for the Next.js dashboard (separate from the
    # Flutter contract paths, so parity is preserved).
    path("admin-api/", include("apps.adminapi.urls")),
    path("", include("apps.accounts.urls")),  # /auth/*, /addresses
    path("", include("apps.catalog.urls")),  # /cuisines, /banners, /restaurants, /dishes
    path("", include("apps.orders.urls")),  # /promo/validate, /orders, /orders/:id/tracking
    path("", include("apps.engagement.urls")),  # /favorites, /notifications
]
