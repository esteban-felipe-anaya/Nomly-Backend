from rest_framework.test import APITestCase

from apps.accounts.models import Address, User
from apps.catalog.models import Cuisine, Restaurant

from .models import Promo


class OrderContractTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="sofia@example.com", password="password", name="Sofia"
        )
        cuisine = Cuisine.objects.create(id="cui_sushi", name="Sushi")
        self.restaurant = Restaurant.objects.create(
            id="rst_07",
            name="Sakura",
            cuisine=cuisine,
            delivery_fee="2.49",
            lat=19.43,
            lng=-99.13,
        )
        self.address = Address.objects.create(
            id="adr_01",
            user=self.user,
            label="Home",
            line1="Calle 1",
            lat=19.37,
            lng=-99.17,
            is_default=True,
        )
        Promo.objects.create(
            id="promo_01",
            code="NOMLY20",
            discount_pct=20,
            min_subtotal=0,
            description="20% off",
            active=True,
        )
        token = self.client.post(
            "/auth/login",
            {"email": "sofia@example.com", "password": "password"},
            format="json",
        ).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_orders_require_authentication(self):
        self.client.credentials()  # clear
        self.assertEqual(self.client.get("/orders").status_code, 401)

    def test_promo_validate(self):
        res = self.client.post(
            "/promo/validate", {"code": "nomly20", "subtotal": 30}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["valid"])
        self.assertEqual(res.data["discountPct"], 20.0)

    def test_create_order_computes_totals_server_side(self):
        # Salmon Nigiri $9 + Large(+$3) x2 => line $24; client sends a bogus total.
        payload = {
            "restaurantId": "rst_07",
            "addressId": "adr_01",
            "paymentMethod": "Visa •••• 4242",
            "promoCode": "NOMLY20",
            "items": [
                {
                    "dishId": "dish_058",
                    "restaurantId": "rst_07",
                    "name": "Salmon Nigiri",
                    "unitPrice": 9,
                    "quantity": 2,
                    "selectedOptions": [{"name": "Large", "priceDelta": 3}],
                    "lineTotal": 99999,
                    "instructions": "",
                }
            ],
            "totals": {"tip": 2, "total": 1},  # bogus — must be ignored
        }
        res = self.client.post("/orders", payload, format="json")
        self.assertEqual(res.status_code, 201)
        t = res.data["totals"]
        self.assertEqual(t["subtotal"], 24.0)  # (9+3)*2, not 99999
        self.assertEqual(t["discount"], 4.8)  # 20% of 24
        self.assertEqual(t["deliveryFee"], 2.49)
        self.assertEqual(t["serviceFee"], 1.2)  # 5% of 24
        self.assertEqual(t["tax"], 1.54)  # 8% of (24-4.8)=19.2
        self.assertEqual(t["tip"], 2.0)
        # 24 - 4.8 + 2.49 + 1.2 + 1.54 + 2 = 26.43
        self.assertEqual(t["total"], 26.43)
        self.assertEqual(res.data["status"], "confirmed")

    def test_tracking_returns_steps_and_courier(self):
        order_id = self.client.post(
            "/orders",
            {
                "restaurantId": "rst_07",
                "addressId": "adr_01",
                "paymentMethod": "Cash",
                "items": [
                    {
                        "dishId": "d",
                        "restaurantId": "rst_07",
                        "name": "X",
                        "unitPrice": 5,
                        "quantity": 1,
                        "selectedOptions": [],
                    }
                ],
                "totals": {"tip": 0},
            },
            format="json",
        ).data["id"]
        res = self.client.get(f"/orders/{order_id}/tracking")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["steps"]), 5)
        self.assertEqual(res.data["steps"][0]["key"], "confirmed")
        self.assertIsNotNone(res.data["courier"])
        self.assertEqual(len(res.data["route"]), 3)
