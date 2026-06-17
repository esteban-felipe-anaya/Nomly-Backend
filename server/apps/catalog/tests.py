from rest_framework.test import APITestCase

from .models import (
    Cuisine,
    CustomizationGroup,
    CustomizationOption,
    Dish,
    MenuCategory,
    Restaurant,
)


class CatalogContractTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        pizza = Cuisine.objects.create(id="cui_pizza", name="Pizza", icon="local_pizza")
        sushi = Cuisine.objects.create(id="cui_sushi", name="Sushi", icon="set_meal")

        cls.napoli = Restaurant.objects.create(
            id="rst_01",
            name="Napoli",
            cuisine=pizza,
            rating=4.8,
            price_level=2,
            free_delivery=True,
            delivery_minutes=20,
            delivery_fee=0,
        )
        Restaurant.objects.create(
            id="rst_02",
            name="Slice",
            cuisine=pizza,
            rating=4.0,
            price_level=1,
            free_delivery=False,
            delivery_minutes=35,
            delivery_fee=2.49,
        )
        Restaurant.objects.create(
            id="rst_03",
            name="Sakura",
            cuisine=sushi,
            rating=4.5,
            price_level=3,
            free_delivery=False,
            delivery_minutes=25,
            delivery_fee=1.99,
        )

        cat = MenuCategory.objects.create(restaurant=cls.napoli, name="Pizzas", order=0)
        dish = Dish.objects.create(
            id="dish_001",
            restaurant=cls.napoli,
            category=cat,
            category_name="Pizzas",
            name="Margherita",
            price="12.50",
            currency="USD",
            popular=True,
        )
        group = CustomizationGroup.objects.create(
            dish=dish, name="Size", type="single", required=True, order=0
        )
        CustomizationOption.objects.create(group=group, name="Medium", price_delta=0)
        CustomizationOption.objects.create(group=group, name="Large", price_delta="4.00")

    def test_list_is_plain_array_with_total_count_header(self):
        res = self.client.get("/restaurants")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.data, list)  # not {count,next,results}
        self.assertEqual(res.headers["X-Total-Count"], "3")

    def test_filter_by_cuisine(self):
        res = self.client.get("/restaurants", {"cuisineId": "cui_sushi"})
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["cuisineId"], "cui_sushi")

    def test_filter_min_rating(self):
        res = self.client.get("/restaurants", {"minRating": "4.5"})
        self.assertEqual({r["id"] for r in res.data}, {"rst_01", "rst_03"})

    def test_filter_free_delivery(self):
        res = self.client.get("/restaurants", {"freeDelivery": "true"})
        self.assertEqual([r["id"] for r in res.data], ["rst_01"])

    def test_sort_by_rating_desc(self):
        res = self.client.get("/restaurants", {"sort": "rating"})
        ratings = [r["rating"] for r in res.data]
        self.assertEqual(ratings, sorted(ratings, reverse=True))

    def test_prices_serialize_as_numbers(self):
        # Assert on the rendered JSON (the wire format the Flutter app receives),
        # where Decimals are numbers — not DRF's intermediate `.data`.
        res = self.client.get("/restaurants", {"cuisineId": "cui_pizza", "sort": "rating"})
        body = res.json()
        self.assertIsInstance(body[0]["rating"], float)
        self.assertIsInstance(body[0]["deliveryFee"], (int, float))

    def test_detail_includes_menu(self):
        res = self.client.get("/restaurants/rst_01")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["menu"][0]["category"], "Pizzas")
        self.assertEqual(res.data["menu"][0]["items"][0]["name"], "Margherita")

    def test_menu_endpoint_is_category_grouped(self):
        res = self.client.get("/restaurants/rst_01/menu")
        self.assertEqual(res.data[0]["category"], "Pizzas")
        self.assertEqual(len(res.data[0]["items"]), 1)

    def test_dish_customization_shape(self):
        res = self.client.get("/dishes/dish_001")
        group = res.data["customization"][0]
        self.assertEqual(group["group"], "Size")
        self.assertEqual(group["type"], "single")
        self.assertTrue(group["required"])
        self.assertEqual(group["options"][1]["name"], "Large")
        self.assertEqual(group["options"][1]["priceDelta"], 4.0)
