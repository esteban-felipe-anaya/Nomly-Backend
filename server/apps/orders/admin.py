from django.contrib import admin

from .models import Order, OrderItem, OrderTracking, Promo


@admin.register(Promo)
class PromoAdmin(admin.ModelAdmin):
    list_display = ["code", "discount_pct", "free_delivery", "min_subtotal", "active"]
    list_filter = ["active", "free_delivery"]
    search_fields = ["code"]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["line_total"]


class OrderTrackingInline(admin.StackedInline):
    model = OrderTracking
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "restaurant_name", "status", "total", "placed_at"]
    list_filter = ["status", "payment_method", "placed_at"]
    search_fields = ["id", "user__email", "restaurant_name"]
    date_hierarchy = "placed_at"
    inlines = [OrderItemInline, OrderTrackingInline]
    readonly_fields = ["placed_at"]
