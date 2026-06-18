"""Admin-API serializers (snake_case, full-field) for the Next.js dashboard.

Separate from the Flutter contract serializers so the public API shapes stay
frozen while the admin gets rich CRUD.
"""
from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

from apps.accounts.models import Address, User
from apps.catalog.models import (
    Banner,
    Cuisine,
    CustomizationGroup,
    CustomizationOption,
    Dish,
    MenuCategory,
    Restaurant,
)
from apps.engagement.models import Notification
from apps.orders.models import Courier, Order, OrderItem, Promo


@extend_schema_serializer(component_name="AdminCuisine")
class CuisineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cuisine
        fields = ["id", "name", "icon"]
        extra_kwargs = {"id": {"required": False}}


@extend_schema_serializer(component_name="AdminRestaurant")
class RestaurantSerializer(serializers.ModelSerializer):
    cuisine_name = serializers.CharField(source="cuisine.name", read_only=True)

    class Meta:
        model = Restaurant
        fields = [
            "id", "name", "cuisine", "cuisine_name", "description", "cover", "logo",
            "rating", "rating_count", "delivery_minutes", "delivery_fee", "price_level",
            "free_delivery", "offers", "distance_km", "lat", "lng", "address",
        ]
        extra_kwargs = {"id": {"required": False}}


@extend_schema_serializer(component_name="AdminMenuCategory")
class MenuCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuCategory
        fields = ["id", "restaurant", "name", "order"]


@extend_schema_serializer(component_name="AdminCustomizationOption")
class CustomizationOptionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = CustomizationOption
        fields = ["id", "name", "price_delta", "order"]


@extend_schema_serializer(component_name="AdminCustomizationGroup")
class CustomizationGroupSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    options = CustomizationOptionSerializer(many=True, required=False)

    class Meta:
        model = CustomizationGroup
        fields = ["id", "name", "type", "required", "order", "options"]


@extend_schema_serializer(component_name="AdminDish")
class DishSerializer(serializers.ModelSerializer):
    customization = CustomizationGroupSerializer(many=True, required=False)
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)

    class Meta:
        model = Dish
        fields = [
            "id", "restaurant", "restaurant_name", "category", "category_name",
            "name", "description", "price", "currency", "image", "popular",
            "customization",
        ]
        extra_kwargs = {"id": {"required": False}}

    def _write_customization(self, dish, groups):
        dish.customization.all().delete()
        for gi, group in enumerate(groups or []):
            options = group.pop("options", [])
            group.pop("id", None)
            cg = CustomizationGroup.objects.create(dish=dish, order=group.pop("order", gi), **group)
            for oi, opt in enumerate(options):
                opt.pop("id", None)
                CustomizationOption.objects.create(group=cg, order=opt.pop("order", oi), **opt)

    def create(self, validated_data):
        groups = validated_data.pop("customization", None)
        if not validated_data.get("id"):
            import uuid
            validated_data["id"] = f"dish_{uuid.uuid4().hex[:10]}"
        validated_data.setdefault("category_name", "")
        dish = Dish.objects.create(**validated_data)
        if groups is not None:
            self._write_customization(dish, groups)
        return dish

    def update(self, instance, validated_data):
        groups = validated_data.pop("customization", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if groups is not None:
            self._write_customization(instance, groups)
        return instance


@extend_schema_serializer(component_name="AdminBanner")
class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = ["id", "title", "subtitle", "image", "restaurant"]
        extra_kwargs = {"id": {"required": False}}


@extend_schema_serializer(component_name="AdminPromo")
class PromoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promo
        fields = ["id", "code", "discount_pct", "free_delivery", "min_subtotal",
                  "description", "active"]
        extra_kwargs = {"id": {"required": False}}


@extend_schema_serializer(component_name="AdminUser")
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "phone", "avatar", "is_staff",
                  "is_active", "date_joined"]


@extend_schema_serializer(component_name="AdminAddress")
class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ["id", "user", "label", "line1", "line2", "city", "notes",
                  "lat", "lng", "is_default"]


@extend_schema_serializer(component_name="AdminCourier")
class CourierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Courier
        fields = ["id", "name", "avatar", "phone", "vehicle", "active"]
        extra_kwargs = {"id": {"required": False}}


@extend_schema_serializer(component_name="AdminOrderItem")
class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "dish", "name", "image", "unit_price", "quantity",
                  "selected_options", "instructions", "line_total"]


@extend_schema_serializer(component_name="AdminOrder")
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.name", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "user", "user_email", "user_name", "restaurant", "restaurant_name",
            "address", "status", "subtotal", "discount", "delivery_fee", "service_fee",
            "tax", "tip", "total", "promo_code", "payment_method", "scheduled_for",
            "placed_at", "eta_minutes", "items",
        ]


@extend_schema_serializer(component_name="AdminNotification")
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "user", "type", "title", "body", "read", "date"]
        extra_kwargs = {"id": {"required": False}, "date": {"required": False}}
