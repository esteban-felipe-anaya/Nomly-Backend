from django.db import models


class Cuisine(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    name = models.CharField(max_length=120)
    icon = models.CharField(max_length=80, default="restaurant")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Restaurant(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    name = models.CharField(max_length=255)
    # Primary cuisine drives the `cuisineId`/`cuisine` contract fields. A
    # secondary M2M is kept for admin flexibility per the spec.
    cuisine = models.ForeignKey(
        Cuisine, on_delete=models.SET_NULL, null=True, related_name="restaurants"
    )
    cuisines = models.ManyToManyField(Cuisine, blank=True, related_name="restaurants_m2m")
    description = models.TextField(blank=True, default="")
    cover = models.CharField(max_length=500, blank=True, default="")
    logo = models.CharField(max_length=500, blank=True, default="")
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    rating_count = models.PositiveIntegerField(default=0)
    delivery_minutes = models.PositiveIntegerField(default=30)
    delivery_fee = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    price_level = models.PositiveSmallIntegerField(default=1)
    free_delivery = models.BooleanField(default=False)
    offers = models.JSONField(default=list, blank=True)
    distance_km = models.FloatField(default=0)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    address = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class MenuCategory(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=120)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name_plural = "menu categories"

    def __str__(self):
        return f"{self.restaurant_id} · {self.name}"


class Dish(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="dishes")
    category = models.ForeignKey(
        MenuCategory, on_delete=models.SET_NULL, null=True, related_name="items"
    )
    # Snapshot of the category name (the contract exposes a flat `category` string).
    category_name = models.CharField(max_length=120, blank=True, default="")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="USD")
    image = models.CharField(max_length=500, blank=True, default="")
    popular = models.BooleanField(default=False)

    class Meta:
        ordering = ["category__order", "name"]
        verbose_name_plural = "dishes"

    def __str__(self):
        return self.name


class CustomizationGroup(models.Model):
    SINGLE = "single"
    MULTI = "multi"
    TYPE_CHOICES = [(SINGLE, "single"), (MULTI, "multi")]

    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, related_name="customization")
    name = models.CharField(max_length=120)  # serialized as `group`
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=SINGLE)
    required = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.dish_id} · {self.name}"


class CustomizationOption(models.Model):
    group = models.ForeignKey(CustomizationGroup, on_delete=models.CASCADE, related_name="options")
    name = models.CharField(max_length=120)
    price_delta = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.name


class Banner(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=255, blank=True, default="")
    image = models.CharField(max_length=500, blank=True, default="")
    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.SET_NULL, null=True, blank=True, related_name="banners"
    )

    def __str__(self):
        return self.title
