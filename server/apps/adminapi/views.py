import os
import uuid
from datetime import timedelta

from django.core.files.storage import default_storage
from django.db.models import Avg, Count, Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.catalog.models import Banner, Cuisine, Dish, MenuCategory, Restaurant
from apps.engagement.models import Notification
from apps.orders.models import Order, Promo

from . import serializers as s


class AdminPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500


class _IdPrefixMixin:
    """Generates a string PK (e.g. `rst_ab12cd`) on create when none is given."""

    id_prefix = "obj"

    def perform_create(self, serializer):
        if not serializer.validated_data.get("id"):
            serializer.save(id=f"{self.id_prefix}_{uuid.uuid4().hex[:10]}")
        else:
            serializer.save()


class _AdminViewSet(_IdPrefixMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    pagination_class = AdminPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]


class CuisineViewSet(_AdminViewSet):
    queryset = Cuisine.objects.all()
    serializer_class = s.CuisineSerializer
    id_prefix = "cui"
    search_fields = ["name"]


class RestaurantViewSet(_AdminViewSet):
    queryset = Restaurant.objects.select_related("cuisine").all()
    serializer_class = s.RestaurantSerializer
    id_prefix = "rst"
    search_fields = ["name", "cuisine__name"]
    ordering_fields = ["name", "rating", "delivery_minutes", "price_level"]


class MenuCategoryViewSet(_AdminViewSet):
    serializer_class = s.MenuCategorySerializer
    id_prefix = "cat"

    def get_queryset(self):
        qs = MenuCategory.objects.all()
        restaurant = self.request.query_params.get("restaurant")
        return qs.filter(restaurant_id=restaurant) if restaurant else qs

    def perform_create(self, serializer):
        serializer.save()  # MenuCategory uses an autField PK


class DishViewSet(_AdminViewSet):
    serializer_class = s.DishSerializer
    id_prefix = "dish"
    search_fields = ["name", "restaurant__name"]
    ordering_fields = ["name", "price"]

    def get_queryset(self):
        qs = Dish.objects.select_related("restaurant").prefetch_related(
            "customization__options"
        )
        restaurant = self.request.query_params.get("restaurant")
        return qs.filter(restaurant_id=restaurant) if restaurant else qs


class BannerViewSet(_AdminViewSet):
    queryset = Banner.objects.all()
    serializer_class = s.BannerSerializer
    id_prefix = "ban"
    search_fields = ["title"]


class PromoViewSet(_AdminViewSet):
    queryset = Promo.objects.all()
    serializer_class = s.PromoSerializer
    id_prefix = "promo"
    search_fields = ["code"]


class UserViewSet(_IdPrefixMixin, viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = s.UserSerializer
    permission_classes = [IsAdminUser]
    pagination_class = AdminPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "email"]


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Order.objects.select_related("user", "restaurant").prefetch_related("items")
    serializer_class = s.OrderSerializer
    permission_classes = [IsAdminUser]
    pagination_class = AdminPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["id", "user__email", "restaurant_name"]
    ordering_fields = ["placed_at", "total", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        return qs.filter(status=status_filter) if status_filter else qs

    @action(detail=True, methods=["post"])
    def set_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get("status")
        valid = dict(Order.STATUS_CHOICES)
        if new_status not in valid:
            return Response({"detail": "Invalid status."}, status=400)
        order.status = new_status
        order.save(update_fields=["status"])
        return Response(self.get_serializer(order).data)


class NotificationViewSet(_AdminViewSet):
    queryset = Notification.objects.select_related("user").all()
    serializer_class = s.NotificationSerializer
    id_prefix = "ntf"
    search_fields = ["title", "body"]

    def perform_create(self, serializer):
        serializer.save(
            id=f"ntf_{uuid.uuid4().hex[:10]}",
            date=serializer.validated_data.get("date") or timezone.now(),
        )

    @action(detail=False, methods=["post"])
    def broadcast(self, request):
        """Create the same notification for every user."""
        title = request.data.get("title", "")
        body = request.data.get("body", "")
        ntype = request.data.get("type", "offer")
        now = timezone.now()
        created = Notification.objects.bulk_create([
            Notification(
                id=f"ntf_{uuid.uuid4().hex[:12]}", user=u, type=ntype,
                title=title, body=body, date=now,
            )
            for u in User.objects.all()
        ])
        return Response({"created": len(created)}, status=status.HTTP_201_CREATED)


_ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}


@extend_schema(
    request={"multipart/form-data": inline_serializer(
        name="UploadRequest", fields={"file": serializers.FileField()}
    )},
    responses=inline_serializer(name="UploadResponse", fields={"url": serializers.CharField()}),
)
class UploadView(APIView):
    """Accepts a multipart image upload and returns the stored **relative**
    media path (e.g. `/media/uploads/<id>.png`). Clients prepend their own base
    URL when displaying it, so the value is host-independent. The image fields
    stay plain strings, so the API contract is unchanged."""

    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "No file provided (field 'file')."}, status=400)
        ext = os.path.splitext(upload.name)[1].lower()
        if ext not in _ALLOWED_IMAGE_EXT:
            return Response({"detail": f"Unsupported file type '{ext}'."}, status=400)
        name = f"uploads/{uuid.uuid4().hex}{ext}"
        saved = default_storage.save(name, upload)
        # Relative path only (MEDIA_URL-prefixed); never the absolute host.
        return Response({"url": default_storage.url(saved)}, status=status.HTTP_201_CREATED)


class StatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        orders = Order.objects.all()

        orders_today = orders.filter(placed_at__gte=today).count()
        revenue_total = orders.aggregate(s=Sum("total"))["s"] or 0
        revenue_today = orders.filter(placed_at__gte=today).aggregate(s=Sum("total"))["s"] or 0
        active = orders.exclude(status__in=["delivered", "cancelled"]).count()
        avg_delivery = (
            Restaurant.objects.filter(orders__isnull=False)
            .aggregate(a=Avg("delivery_minutes"))["a"] or 0
        )

        # orders over the last 7 days
        over_time = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            nxt = day + timedelta(days=1)
            count = orders.filter(placed_at__gte=day, placed_at__lt=nxt).count()
            over_time.append({"date": day.date().isoformat(), "orders": count})

        by_cuisine = list(
            orders.values("restaurant__cuisine__name")
            .annotate(revenue=Sum("total"), orders=Count("id"))
            .order_by("-revenue")[:8]
        )
        top_restaurants = list(
            orders.values("restaurant__name")
            .annotate(orders=Count("id"), revenue=Sum("total"))
            .order_by("-orders")[:5]
        )

        return Response({
            "ordersToday": orders_today,
            "revenueTotal": float(revenue_total),
            "revenueToday": float(revenue_today),
            "activeOrders": active,
            "avgDeliveryMinutes": round(float(avg_delivery), 1),
            "ordersOverTime": over_time,
            "revenueByCuisine": [
                {"cuisine": r["restaurant__cuisine__name"] or "Other",
                 "revenue": float(r["revenue"] or 0), "orders": r["orders"]}
                for r in by_cuisine
            ],
            "topRestaurants": [
                {"name": r["restaurant__name"] or "—", "orders": r["orders"],
                 "revenue": float(r["revenue"] or 0)}
                for r in top_restaurants
            ],
        })
