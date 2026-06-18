from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Banner, Cuisine, Dish, Restaurant
from .serializers import (
    BannerSerializer,
    CuisineSerializer,
    DishSerializer,
    MenuCategorySerializer,
    RestaurantDetailSerializer,
    RestaurantSerializer,
)


class CuisineListView(ListAPIView):
    queryset = Cuisine.objects.all()
    serializer_class = CuisineSerializer


class BannerListView(ListAPIView):
    queryset = Banner.objects.all()
    serializer_class = BannerSerializer


class RestaurantListView(ListAPIView):
    """GET /restaurants with the mock's query params; returns a plain array
    and an X-Total-Count header (no DRF pagination wrapper)."""

    serializer_class = RestaurantSerializer
    queryset = Restaurant.objects.none()  # real queryset built in _filtered_queryset

    def _filtered_queryset(self):
        qs = Restaurant.objects.select_related("cuisine").all()
        p = self.request.query_params

        if cuisine_id := p.get("cuisineId"):
            qs = qs.filter(cuisine_id=cuisine_id)
        if q := p.get("q"):
            qs = qs.filter(Q(name__icontains=q) | Q(cuisine__name__icontains=q))
        if min_rating := p.get("minRating"):
            try:
                qs = qs.filter(rating__gte=float(min_rating))
            except ValueError:
                pass
        if price_level := p.get("priceLevel"):
            try:
                qs = qs.filter(price_level=int(price_level))
            except ValueError:
                pass
        if p.get("freeDelivery") in ("true", "1"):
            qs = qs.filter(free_delivery=True)

        sort = p.get("sort", "recommended")
        if sort == "rating":
            qs = qs.order_by("-rating")
        elif sort == "delivery_time":
            qs = qs.order_by("delivery_minutes")
        elif sort == "distance":
            qs = qs.order_by("distance_km")
        else:  # recommended: high rating, fast delivery
            qs = qs.annotate(score=F("rating") * 10 - F("delivery_minutes")).order_by("-score")
        return qs

    def list(self, request, *args, **kwargs):
        qs = self._filtered_queryset()
        total = qs.count()

        page = request.query_params.get("_page")
        limit = request.query_params.get("_limit")
        if page and limit:
            try:
                page_i, limit_i = int(page), int(limit)
                start = (page_i - 1) * limit_i
                qs = qs[start : start + limit_i]
            except ValueError:
                pass

        data = self.get_serializer(qs, many=True).data
        return Response(data, headers={"X-Total-Count": str(total)})


class RestaurantDetailView(RetrieveAPIView):
    queryset = Restaurant.objects.all()
    serializer_class = RestaurantDetailSerializer


@extend_schema(responses=MenuCategorySerializer(many=True))
class RestaurantMenuView(APIView):
    def get(self, request, pk):
        restaurant = get_object_or_404(Restaurant, pk=pk)
        data = MenuCategorySerializer(restaurant.categories.all(), many=True).data
        return Response(data)


class DishDetailView(RetrieveAPIView):
    queryset = Dish.objects.all()
    serializer_class = DishSerializer
