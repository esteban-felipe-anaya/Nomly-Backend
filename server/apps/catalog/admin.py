from django.contrib import admin

from .models import (
    Banner,
    Cuisine,
    CustomizationGroup,
    CustomizationOption,
    Dish,
    MenuCategory,
    Restaurant,
)


@admin.register(Cuisine)
class CuisineAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "icon"]
    search_fields = ["name"]


class MenuCategoryInline(admin.TabularInline):
    model = MenuCategory
    extra = 0


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "cuisine",
        "rating",
        "delivery_minutes",
        "delivery_fee",
        "price_level",
        "free_delivery",
    ]
    list_filter = ["cuisine", "price_level", "free_delivery"]
    search_fields = ["name", "cuisine__name"]
    inlines = [MenuCategoryInline]


class CustomizationOptionInline(admin.TabularInline):
    model = CustomizationOption
    extra = 0


class CustomizationGroupInline(admin.TabularInline):
    model = CustomizationGroup
    extra = 0


@admin.register(Dish)
class DishAdmin(admin.ModelAdmin):
    list_display = ["name", "restaurant", "category_name", "price", "popular"]
    list_filter = ["restaurant", "popular", "currency"]
    search_fields = ["name", "restaurant__name"]
    inlines = [CustomizationGroupInline]


@admin.register(CustomizationGroup)
class CustomizationGroupAdmin(admin.ModelAdmin):
    list_display = ["name", "dish", "type", "required"]
    list_filter = ["type", "required"]
    inlines = [CustomizationOptionInline]


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ["title", "subtitle", "restaurant"]
    search_fields = ["title"]
