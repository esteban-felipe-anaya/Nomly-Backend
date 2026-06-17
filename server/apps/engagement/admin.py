from django.contrib import admin

from .models import Favorites, Notification


@admin.register(Favorites)
class FavoritesAdmin(admin.ModelAdmin):
    list_display = ["id", "user"]
    search_fields = ["user__email"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "type", "read", "date"]
    list_filter = ["type", "read"]
    search_fields = ["title", "body", "user__email"]
    date_hierarchy = "date"
