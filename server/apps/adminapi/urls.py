from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AddressViewSet,
    BannerViewSet,
    CuisineViewSet,
    DishViewSet,
    MenuCategoryViewSet,
    NotificationViewSet,
    OrderViewSet,
    PromoViewSet,
    RestaurantViewSet,
    StatsView,
    UploadView,
    UserViewSet,
)

router = DefaultRouter(trailing_slash=False)
router.register("cuisines", CuisineViewSet, basename="admin-cuisine")
router.register("restaurants", RestaurantViewSet, basename="admin-restaurant")
router.register("menu-categories", MenuCategoryViewSet, basename="admin-menucategory")
router.register("dishes", DishViewSet, basename="admin-dish")
router.register("banners", BannerViewSet, basename="admin-banner")
router.register("promos", PromoViewSet, basename="admin-promo")
router.register("users", UserViewSet, basename="admin-user")
router.register("addresses", AddressViewSet, basename="admin-address")
router.register("orders", OrderViewSet, basename="admin-order")
router.register("notifications", NotificationViewSet, basename="admin-notification")

urlpatterns = [
    path("stats", StatsView.as_view()),
    path("upload", UploadView.as_view()),
    path("", include(router.urls)),
]
