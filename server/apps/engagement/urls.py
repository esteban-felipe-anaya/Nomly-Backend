from django.urls import path

from .views import (
    FavoritesView,
    NotificationDetailView,
    NotificationListView,
)

urlpatterns = [
    path("favorites", FavoritesView.as_view()),
    path("favorites/<str:pk>", FavoritesView.as_view()),
    path("notifications", NotificationListView.as_view()),
    path("notifications/<str:pk>", NotificationDetailView.as_view()),
]
