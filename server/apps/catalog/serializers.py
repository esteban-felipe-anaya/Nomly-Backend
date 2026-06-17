from rest_framework import serializers

from .models import (
    Banner,
    Cuisine,
    CustomizationGroup,
    CustomizationOption,
    Dish,
    Restaurant,
)


class CuisineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cuisine
        fields = ["id", "name", "icon"]


class CustomizationOptionSerializer(serializers.ModelSerializer):
    priceDelta = serializers.DecimalField(source="price_delta", max_digits=6, decimal_places=2)

    class Meta:
        model = CustomizationOption
        fields = ["name", "priceDelta"]


class CustomizationGroupSerializer(serializers.ModelSerializer):
    group = serializers.CharField(source="name")
    options = CustomizationOptionSerializer(many=True)

    class Meta:
        model = CustomizationGroup
        fields = ["group", "type", "required", "options"]


class DishSerializer(serializers.ModelSerializer):
    restaurantId = serializers.CharField(source="restaurant_id")
    category = serializers.CharField(source="category_name")
    customization = CustomizationGroupSerializer(many=True, read_only=True)

    class Meta:
        model = Dish
        fields = [
            "id",
            "restaurantId",
            "name",
            "category",
            "description",
            "price",
            "currency",
            "image",
            "popular",
            "customization",
        ]


class MenuCategorySerializer(serializers.Serializer):
    """Serializes a MenuCategory as `{ category, items:[Dish] }`."""

    category = serializers.CharField(source="name")
    items = DishSerializer(many=True, read_only=True)


class RestaurantSerializer(serializers.ModelSerializer):
    cuisineId = serializers.CharField(source="cuisine_id")
    cuisine = serializers.CharField(source="cuisine.name", default="")
    ratingCount = serializers.IntegerField(source="rating_count")
    deliveryMinutes = serializers.IntegerField(source="delivery_minutes")
    deliveryFee = serializers.DecimalField(source="delivery_fee", max_digits=6, decimal_places=2)
    priceLevel = serializers.IntegerField(source="price_level")
    freeDelivery = serializers.BooleanField(source="free_delivery")
    distanceKm = serializers.FloatField(source="distance_km")

    class Meta:
        model = Restaurant
        fields = [
            "id",
            "name",
            "cuisineId",
            "cuisine",
            "description",
            "cover",
            "logo",
            "rating",
            "ratingCount",
            "deliveryMinutes",
            "deliveryFee",
            "priceLevel",
            "freeDelivery",
            "offers",
            "distanceKm",
            "lat",
            "lng",
            "address",
        ]


class RestaurantDetailSerializer(RestaurantSerializer):
    menu = serializers.SerializerMethodField()

    class Meta(RestaurantSerializer.Meta):
        fields = RestaurantSerializer.Meta.fields + ["menu"]

    def get_menu(self, obj):
        return MenuCategorySerializer(obj.categories.all(), many=True).data


class BannerSerializer(serializers.ModelSerializer):
    restaurantId = serializers.CharField(source="restaurant_id", allow_null=True)

    class Meta:
        model = Banner
        fields = ["id", "title", "subtitle", "image", "restaurantId"]
