from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import AddressViewSet, LoginView, MeView, RegisterView

router = SimpleRouter(trailing_slash=False)
router.register("addresses", AddressViewSet, basename="address")

auth_urlpatterns = [
    path("auth/login", LoginView.as_view()),
    path("auth/register", RegisterView.as_view()),
    path("auth/me", MeView.as_view()),
]

urlpatterns = auth_urlpatterns + router.urls
