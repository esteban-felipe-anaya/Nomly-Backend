from django.conf import settings
from django.db import models

from apps.catalog.models import Dish, Restaurant


class Promo(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    code = models.CharField(max_length=40, unique=True)
    discount_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    free_delivery = models.BooleanField(default=False)
    min_subtotal = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    description = models.CharField(max_length=255, blank=True, default="")
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.code


class Order(models.Model):
    STATUS_CHOICES = [
        ("confirmed", "Confirmed"),
        ("preparing", "Preparing"),
        ("picked_up", "Picked up"),
        ("on_the_way", "On the way"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    id = models.CharField(primary_key=True, max_length=64)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders"
    )
    address = models.ForeignKey(
        "accounts.Address", on_delete=models.SET_NULL, null=True, related_name="orders"
    )
    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.SET_NULL, null=True, related_name="orders"
    )
    # Denormalized snapshots so the order is stable even if the restaurant changes.
    restaurant_name = models.CharField(max_length=255, blank=True, default="")
    restaurant_cover = models.URLField(max_length=500, blank=True, default="")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="confirmed")

    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    service_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tip = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    promo_code = models.CharField(max_length=40, blank=True, null=True)
    payment_method = models.CharField(max_length=120, default="Card")
    scheduled_for = models.CharField(max_length=120, blank=True, null=True)
    placed_at = models.DateTimeField()
    eta_minutes = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-placed_at"]

    def __str__(self):
        return self.id


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    dish = models.ForeignKey(Dish, on_delete=models.SET_NULL, null=True, related_name="order_items")
    # Snapshots (contract returns these on each item).
    restaurant_id = models.CharField(max_length=64, blank=True, default="")
    name = models.CharField(max_length=255)
    image = models.URLField(max_length=500, blank=True, default="")
    unit_price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    quantity = models.PositiveIntegerField(default=1)
    selected_options = models.JSONField(default=list, blank=True)  # [{name, priceDelta}]
    instructions = models.CharField(max_length=255, blank=True, default="")
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.quantity}× {self.name}"


class OrderTracking(models.Model):
    """Courier + route for an order. Status/ETA/position are computed from
    elapsed time in the tracking endpoint (see apps/orders/tracking.py)."""

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="tracking")
    courier_name = models.CharField(max_length=120, blank=True, default="")
    courier_avatar = models.URLField(max_length=500, blank=True, default="")
    courier_phone = models.CharField(max_length=40, blank=True, default="")
    # Route as a list of [lat, lng] pairs: restaurant -> ... -> delivery address.
    route = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"tracking({self.order_id})"
