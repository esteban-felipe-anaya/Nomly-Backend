from rest_framework import serializers

from . import tracking
from .models import Order, OrderItem


def _f(value) -> float:
    return float(value or 0)


class OrderItemSerializer(serializers.ModelSerializer):
    dishId = serializers.CharField(source="dish_id", allow_null=True)
    restaurantId = serializers.CharField(source="restaurant_id")
    unitPrice = serializers.DecimalField(source="unit_price", max_digits=8, decimal_places=2)
    selectedOptions = serializers.JSONField(source="selected_options")
    lineTotal = serializers.DecimalField(source="line_total", max_digits=10, decimal_places=2)

    class Meta:
        model = OrderItem
        fields = [
            "dishId",
            "restaurantId",
            "name",
            "image",
            "unitPrice",
            "quantity",
            "selectedOptions",
            "lineTotal",
            "instructions",
        ]


class OrderSerializer(serializers.ModelSerializer):
    userId = serializers.CharField(source="user_id")
    restaurantId = serializers.CharField(source="restaurant_id", allow_null=True)
    restaurantName = serializers.CharField(source="restaurant_name")
    restaurantCover = serializers.CharField(source="restaurant_cover")
    addressId = serializers.CharField(source="address_id", allow_null=True)
    items = OrderItemSerializer(many=True, read_only=True)
    totals = serializers.SerializerMethodField()
    promoCode = serializers.CharField(source="promo_code", allow_null=True)
    paymentMethod = serializers.CharField(source="payment_method")
    scheduledFor = serializers.CharField(source="scheduled_for", allow_null=True)
    placedAt = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    etaMinutes = serializers.SerializerMethodField()
    courier = serializers.SerializerMethodField()
    route = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "userId",
            "restaurantId",
            "restaurantName",
            "restaurantCover",
            "addressId",
            "items",
            "totals",
            "promoCode",
            "paymentMethod",
            "scheduledFor",
            "status",
            "placedAt",
            "etaMinutes",
            "courier",
            "route",
        ]

    def get_totals(self, obj):
        return {
            "subtotal": _f(obj.subtotal),
            "discount": _f(obj.discount),
            "deliveryFee": _f(obj.delivery_fee),
            "serviceFee": _f(obj.service_fee),
            "tax": _f(obj.tax),
            "tip": _f(obj.tip),
            "total": _f(obj.total),
        }

    def get_placedAt(self, obj):
        return obj.placed_at.isoformat()

    def get_status(self, obj):
        return tracking.status_for(obj.placed_at, obj.status)

    def get_etaMinutes(self, obj):
        return tracking.eta_for(obj.placed_at, obj.status)

    def _tracking_payload(self, obj):
        cache = getattr(self, "_tp_cache", {})
        if obj.id not in cache:
            cache[obj.id] = tracking.build_tracking(obj)
            self._tp_cache = cache
        return cache[obj.id]

    def get_courier(self, obj):
        return self._tracking_payload(obj)["courier"]

    def get_route(self, obj):
        t = getattr(obj, "tracking", None)
        return t.route if t else []
