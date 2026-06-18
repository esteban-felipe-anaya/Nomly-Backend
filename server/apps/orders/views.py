import uuid
from decimal import ROUND_HALF_UP, Decimal

from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Address
from apps.catalog.models import Dish, Restaurant

from . import tracking
from .models import Order, OrderItem, OrderTracking, Promo
from .serializers import OrderSerializer

_promo_request = inline_serializer(
    name="PromoValidateRequest",
    fields={"code": serializers.CharField(), "subtotal": serializers.FloatField(required=False)},
)
_promo_response = inline_serializer(
    name="PromoValidateResponse",
    fields={
        "code": serializers.CharField(),
        "valid": serializers.BooleanField(),
        "discountPct": serializers.FloatField(),
        "freeDelivery": serializers.BooleanField(required=False),
        "description": serializers.CharField(required=False),
        "reason": serializers.CharField(required=False),
    },
)

SERVICE_RATE = Decimal("0.05")
TAX_RATE = Decimal("0.08")
DEFAULT_COURIER = {
    "name": "Diego Hernández",
    "avatar": "https://randomuser.me/api/portraits/men/32.jpg",
    "phone": "+52 55 9876 5432",
}


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@extend_schema(request=_promo_request, responses=_promo_response)
class PromoValidateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = str(request.data.get("code", "")).strip().upper()
        subtotal = Decimal(str(request.data.get("subtotal", 0) or 0))
        promo = Promo.objects.filter(code=code, active=True).first()
        if not promo:
            return Response(
                {"code": code, "valid": False, "discountPct": 0, "reason": "Code not found"}
            )
        if subtotal < promo.min_subtotal:
            return Response(
                {
                    "code": code,
                    "valid": False,
                    "discountPct": 0,
                    "reason": f"Minimum spend ${promo.min_subtotal}",
                }
            )
        return Response(
            {
                "code": code,
                "valid": True,
                "discountPct": float(promo.discount_pct),
                "freeDelivery": promo.free_delivery,
                "description": promo.description,
            }
        )


class OrderListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=OrderSerializer(many=True))
    def get(self, request):
        orders = Order.objects.filter(user=request.user).prefetch_related("items", "tracking")
        return Response(OrderSerializer(orders, many=True).data)

    @extend_schema(responses=OrderSerializer)
    def post(self, request):
        data = request.data
        restaurant = Restaurant.objects.filter(id=data.get("restaurantId")).first()
        address = Address.objects.filter(id=data.get("addressId"), user=request.user).first()

        # --- compute totals server-side (never trust client) ---------------
        items_in = data.get("items", [])
        subtotal = Decimal("0")
        order_items = []
        for it in items_in:
            unit = Decimal(str(it.get("unitPrice", 0)))
            opts = it.get("selectedOptions", []) or []
            delta = sum((Decimal(str(o.get("priceDelta", 0))) for o in opts), Decimal("0"))
            qty = int(it.get("quantity", 1))
            line_total = _money((unit + delta) * qty)
            subtotal += line_total
            # Order items are snapshots; only link the dish FK if it still exists.
            dish_id = it.get("dishId")
            if dish_id and not Dish.objects.filter(id=dish_id).exists():
                dish_id = None
            order_items.append(
                {
                    "dish_id": dish_id,
                    "restaurant_id": it.get("restaurantId", data.get("restaurantId", "")),
                    "name": it.get("name", ""),
                    "image": it.get("image", ""),
                    "unit_price": _money(unit),
                    "quantity": qty,
                    "selected_options": opts,
                    "instructions": it.get("instructions", ""),
                    "line_total": line_total,
                }
            )
        subtotal = _money(subtotal)

        # promo
        discount = Decimal("0")
        free_delivery = False
        promo_code = (data.get("promoCode") or "").strip().upper() or None
        if promo_code:
            promo = Promo.objects.filter(code=promo_code, active=True).first()
            if promo and subtotal >= promo.min_subtotal:
                discount = _money(subtotal * promo.discount_pct / Decimal("100"))
                free_delivery = promo.free_delivery
            else:
                promo_code = None

        base_delivery = Decimal(str(restaurant.delivery_fee)) if restaurant else Decimal("0")
        delivery_fee = Decimal("0") if free_delivery else base_delivery
        service_fee = _money(subtotal * SERVICE_RATE)
        tax = _money((subtotal - discount) * TAX_RATE)
        tip = _money((data.get("totals") or {}).get("tip", data.get("tip", 0)))
        total = _money(subtotal - discount + delivery_fee + service_fee + tax + tip)

        order = Order.objects.create(
            id=f"ord_{uuid.uuid4().hex[:10]}",
            user=request.user,
            address=address,
            restaurant=restaurant,
            restaurant_name=restaurant.name if restaurant else "",
            restaurant_cover=restaurant.cover if restaurant else "",
            status="confirmed",
            subtotal=subtotal,
            discount=discount,
            delivery_fee=delivery_fee,
            service_fee=service_fee,
            tax=tax,
            tip=tip,
            total=total,
            promo_code=promo_code,
            payment_method=data.get("paymentMethod", "Card"),
            scheduled_for=data.get("scheduledFor"),
            placed_at=timezone.now(),
            eta_minutes=tracking._DELIVER_MIN,
        )
        OrderItem.objects.bulk_create([OrderItem(order=order, **oi) for oi in order_items])

        # tracking route restaurant -> delivery address
        route = []
        if restaurant and restaurant.lat is not None and address and address.lat is not None:
            route = [
                [restaurant.lat, restaurant.lng],
                [(restaurant.lat + address.lat) / 2, (restaurant.lng + address.lng) / 2],
                [address.lat, address.lng],
            ]
        OrderTracking.objects.create(
            order=order,
            courier_name=DEFAULT_COURIER["name"],
            courier_avatar=DEFAULT_COURIER["avatar"],
            courier_phone=DEFAULT_COURIER["phone"],
            route=route,
        )

        order = Order.objects.prefetch_related("items", "tracking").get(id=order.id)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


@extend_schema(responses=OrderSerializer)
class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.prefetch_related("items", "tracking"),
            pk=pk,
            user=request.user,
        )
        return Response(OrderSerializer(order).data)


@extend_schema(
    responses=inline_serializer(
        name="OrderTracking",
        fields={
            "orderId": serializers.CharField(),
            "status": serializers.CharField(),
            "etaMinutes": serializers.IntegerField(),
            "courier": serializers.DictField(required=False),
            "route": serializers.ListField(child=serializers.ListField()),
            "steps": serializers.ListField(child=serializers.DictField()),
        },
    )
)
class OrderTrackingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)
        return Response(tracking.build_tracking(order))
