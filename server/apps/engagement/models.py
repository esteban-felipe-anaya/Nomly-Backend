from django.conf import settings
from django.db import models


class Favorites(models.Model):
    """One favorites document per user, mirroring the mock's
    `{ id, userId, restaurants:[ids], dishes:[ids] }` shape."""

    id = models.CharField(primary_key=True, max_length=64)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites"
    )
    restaurants = models.JSONField(default=list, blank=True)  # [restaurantId]
    dishes = models.JSONField(default=list, blank=True)  # [dishId]

    class Meta:
        verbose_name_plural = "favorites"

    def __str__(self):
        return f"favorites({self.user_id})"


class Notification(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=40, default="system")  # order | offer | system
    title = models.CharField(max_length=200)
    body = models.CharField(max_length=500, blank=True, default="")
    read = models.BooleanField(default=False)
    date = models.DateTimeField()

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return self.title
