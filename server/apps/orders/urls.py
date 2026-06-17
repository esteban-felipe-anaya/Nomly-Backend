from django.urls import path

from .views import (
    OrderDetailView,
    OrderListCreateView,
    OrderTrackingView,
    PromoValidateView,
)

urlpatterns = [
    path("promo/validate", PromoValidateView.as_view()),
    path("orders", OrderListCreateView.as_view()),
    path("orders/<str:pk>", OrderDetailView.as_view()),
    path("orders/<str:pk>/tracking", OrderTrackingView.as_view()),
]
