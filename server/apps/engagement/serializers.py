from rest_framework import serializers

from .models import Favorites, Notification


class FavoritesSerializer(serializers.ModelSerializer):
    userId = serializers.CharField(source="user_id", read_only=True)

    class Meta:
        model = Favorites
        fields = ["id", "userId", "restaurants", "dishes"]
        read_only_fields = ["id", "userId"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "body", "read", "date"]
        read_only_fields = ["id", "type", "title", "body", "date"]
