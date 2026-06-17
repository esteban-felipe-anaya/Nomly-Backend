"""Idempotent importer: mock-api/db.json -> PostgreSQL (or the configured DB).

Loads the same data the json-server mock serves, preserving real image URLs and
stable string IDs/relationships. Safe to re-run (upserts by id).

    python manage.py import_mock [--path ../mock-api/db.json] [--password password]
"""

import json

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

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
from apps.engagement.models import Favorites, Notification
from apps.orders.models import Order, OrderItem, OrderTracking, Promo


def _dt(value):
    if not value:
        return None
    return parse_datetime(value.replace("Z", "+00:00"))


class Command(BaseCommand):
    help = "Import mock-api/db.json into the database (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--path", default=settings.MOCK_DB_PATH)
        parser.add_argument(
            "--password", default="password", help="Password set on every seeded user."
        )

    @transaction.atomic
    def handle(self, *args, **opts):
        with open(opts["path"], encoding="utf-8") as fh:
            db = json.load(fh)

        self._cuisines(db.get("cuisines", []))
        self._restaurants(db.get("restaurants", []))
        self._menus_and_dishes(db.get("menus", {}), db.get("dishes", []))
        self._banners(db.get("banners", []))
        self._promos(db.get("promos", []))
        self._users(db.get("users", []), opts["password"])
        self._addresses(db.get("addresses", []))
        self._favorites(db.get("favorites", []))
        self._orders(db.get("orders", []))
        self._notifications(db.get("notifications", []))

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported: {Cuisine.objects.count()} cuisines, "
                f"{Restaurant.objects.count()} restaurants, {Dish.objects.count()} dishes, "
                f"{Order.objects.count()} orders, {User.objects.count()} users."
            )
        )

    # --- sections -----------------------------------------------------------
    def _cuisines(self, rows):
        for c in rows:
            Cuisine.objects.update_or_create(
                id=c["id"], defaults={"name": c["name"], "icon": c.get("icon", "restaurant")}
            )

    def _restaurants(self, rows):
        for r in rows:
            obj, _ = Restaurant.objects.update_or_create(
                id=r["id"],
                defaults={
                    "name": r["name"],
                    "cuisine_id": r.get("cuisineId"),
                    "description": r.get("description", ""),
                    "cover": r.get("cover", ""),
                    "logo": r.get("logo", ""),
                    "rating": r.get("rating", 0),
                    "rating_count": r.get("ratingCount", 0),
                    "delivery_minutes": r.get("deliveryMinutes", 30),
                    "delivery_fee": r.get("deliveryFee", 0),
                    "price_level": r.get("priceLevel", 1),
                    "free_delivery": r.get("freeDelivery", False),
                    "offers": r.get("offers", []),
                    "distance_km": r.get("distanceKm", 0),
                    "lat": r.get("lat"),
                    "lng": r.get("lng"),
                    "address": r.get("address", ""),
                },
            )
            if r.get("cuisineId"):
                obj.cuisines.set([r["cuisineId"]])

    def _menus_and_dishes(self, menus, dishes):
        # Build categories from the menus map and a dishId -> category lookup.
        dish_to_category = {}
        for restaurant_id, cats in menus.items():
            MenuCategory.objects.filter(restaurant_id=restaurant_id).delete()
            for order, cat in enumerate(cats):
                category = MenuCategory.objects.create(
                    restaurant_id=restaurant_id, name=cat["category"], order=order
                )
                for dish_id in cat.get("dishIds", []):
                    dish_to_category[dish_id] = category

        for d in dishes:
            category = dish_to_category.get(d["id"])
            obj, _ = Dish.objects.update_or_create(
                id=d["id"],
                defaults={
                    "restaurant_id": d["restaurantId"],
                    "category": category,
                    "category_name": d.get("category", ""),
                    "name": d["name"],
                    "description": d.get("description", ""),
                    "price": d.get("price", 0),
                    "currency": d.get("currency", "USD"),
                    "image": d.get("image", ""),
                    "popular": d.get("popular", False),
                },
            )
            obj.customization.all().delete()
            for gi, group in enumerate(d.get("customization", [])):
                cg = CustomizationGroup.objects.create(
                    dish=obj,
                    name=group["group"],
                    type=group.get("type", "single"),
                    required=group.get("required", False),
                    order=gi,
                )
                for oi, opt in enumerate(group.get("options", [])):
                    CustomizationOption.objects.create(
                        group=cg,
                        name=opt["name"],
                        price_delta=opt.get("priceDelta", 0),
                        order=oi,
                    )

    def _banners(self, rows):
        for b in rows:
            Banner.objects.update_or_create(
                id=b["id"],
                defaults={
                    "title": b["title"],
                    "subtitle": b.get("subtitle", ""),
                    "image": b.get("image", ""),
                    "restaurant_id": b.get("restaurantId"),
                },
            )

    def _promos(self, rows):
        for p in rows:
            Promo.objects.update_or_create(
                id=p["id"],
                defaults={
                    "code": p["code"].upper(),
                    "discount_pct": p.get("discountPct", 0),
                    "free_delivery": p.get("freeDelivery", False),
                    "min_subtotal": p.get("minSubtotal", 0),
                    "description": p.get("description", ""),
                    "active": p.get("valid", True),
                },
            )

    def _users(self, rows, password):
        for i, u in enumerate(rows):
            user, _ = User.objects.update_or_create(
                id=u["id"],
                defaults={
                    "email": u["email"],
                    "name": u.get("name", ""),
                    "phone": u.get("phone", ""),
                    "avatar": u.get("avatar", ""),
                    # First seeded user is staff/superuser so the admins are usable.
                    "is_staff": i == 0,
                    "is_superuser": i == 0,
                },
            )
            user.set_password(password)
            user.save(update_fields=["password"])

    def _addresses(self, rows):
        for a in rows:
            Address.objects.update_or_create(
                id=a["id"],
                defaults={
                    "user_id": a["userId"],
                    "label": a["label"],
                    "line1": a["line1"],
                    "line2": a.get("line2", ""),
                    "city": a.get("city", ""),
                    "notes": a.get("notes", ""),
                    "lat": a.get("lat"),
                    "lng": a.get("lng"),
                    "is_default": a.get("isDefault", False),
                },
            )

    def _favorites(self, rows):
        for f in rows:
            Favorites.objects.update_or_create(
                id=f["id"],
                defaults={
                    "user_id": f["userId"],
                    "restaurants": f.get("restaurants", []),
                    "dishes": f.get("dishes", []),
                },
            )

    def _orders(self, rows):
        now = timezone.now()
        for o in rows:
            totals = o.get("totals", {})
            is_delivered = o.get("status") == "delivered"
            # Keep the active (in-progress) order "live" by stamping it now.
            placed_at = _dt(o.get("placedAt")) or now
            if not is_delivered:
                placed_at = now

            order, _ = Order.objects.update_or_create(
                id=o["id"],
                defaults={
                    "user_id": o["userId"],
                    "address_id": o.get("addressId"),
                    "restaurant_id": o.get("restaurantId"),
                    "restaurant_name": o.get("restaurantName", ""),
                    "restaurant_cover": o.get("restaurantCover", ""),
                    "status": o.get("status", "confirmed"),
                    "subtotal": totals.get("subtotal", 0),
                    "discount": totals.get("discount", 0),
                    "delivery_fee": totals.get("deliveryFee", 0),
                    "service_fee": totals.get("serviceFee", 0),
                    "tax": totals.get("tax", 0),
                    "tip": totals.get("tip", 0),
                    "total": totals.get("total", 0),
                    "promo_code": o.get("promoCode"),
                    "payment_method": o.get("paymentMethod", "Card"),
                    "scheduled_for": o.get("scheduledFor"),
                    "placed_at": placed_at,
                    "eta_minutes": o.get("etaMinutes", 0),
                },
            )
            order.items.all().delete()
            for it in o.get("items", []):
                dish_id = it.get("dishId")
                if dish_id and not Dish.objects.filter(id=dish_id).exists():
                    dish_id = None
                OrderItem.objects.create(
                    order=order,
                    dish_id=dish_id,
                    restaurant_id=it.get("restaurantId", ""),
                    name=it.get("name", ""),
                    image=it.get("image", ""),
                    unit_price=it.get("unitPrice", 0),
                    quantity=it.get("quantity", 1),
                    selected_options=it.get("selectedOptions", []),
                    instructions=it.get("instructions", ""),
                    line_total=it.get("lineTotal", 0),
                )
            courier = o.get("courier") or {}
            OrderTracking.objects.update_or_create(
                order=order,
                defaults={
                    "courier_name": courier.get("name", ""),
                    "courier_avatar": courier.get("avatar", ""),
                    "courier_phone": courier.get("phone", ""),
                    "route": o.get("route", []),
                },
            )

    def _notifications(self, rows):
        for n in rows:
            Notification.objects.update_or_create(
                id=n["id"],
                defaults={
                    "user_id": n.get("userId", "usr_01"),
                    "type": n.get("type", "system"),
                    "title": n["title"],
                    "body": n.get("body", ""),
                    "read": n.get("read", False),
                    "date": _dt(n.get("date")) or timezone.now(),
                },
            )
