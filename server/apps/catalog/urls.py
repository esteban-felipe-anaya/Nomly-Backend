from django.urls import path

from .views import (
    BannerListView,
    CuisineListView,
    DishDetailView,
    RestaurantDetailView,
    RestaurantListView,
    RestaurantMenuView,
)

urlpatterns = [
    path("cuisines", CuisineListView.as_view()),
    path("banners", BannerListView.as_view()),
    path("restaurants", RestaurantListView.as_view()),
    path("restaurants/<str:pk>", RestaurantDetailView.as_view()),
    path("restaurants/<str:pk>/menu", RestaurantMenuView.as_view()),
    path("dishes/<str:pk>", DishDetailView.as_view()),
]
