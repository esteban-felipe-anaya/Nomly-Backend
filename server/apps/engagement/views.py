from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Favorites, Notification
from .serializers import FavoritesSerializer, NotificationSerializer


def _get_or_create_favorites(user):
    fav, _ = Favorites.objects.get_or_create(user=user, defaults={"id": f"fav_{user.id}"})
    return fav


class FavoritesView(APIView):
    """GET /favorites -> [ { id, userId, restaurants, dishes } ] (one doc per
    user, matching the mock). PUT /favorites/:id replaces the arrays."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        fav = _get_or_create_favorites(request.user)
        return Response([FavoritesSerializer(fav).data])

    def put(self, request, pk=None):
        fav = _get_or_create_favorites(request.user)
        fav.restaurants = request.data.get("restaurants", fav.restaurants)
        fav.dishes = request.data.get("dishes", fav.dishes)
        fav.save(update_fields=["restaurants", "dishes"])
        return Response(FavoritesSerializer(fav).data)


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user)
        return Response(NotificationSerializer(qs, many=True).data)


class NotificationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, user=request.user)
        notification.read = bool(request.data.get("read", True))
        notification.save(update_fields=["read"])
        return Response(NotificationSerializer(notification).data)
