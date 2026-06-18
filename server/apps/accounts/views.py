from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Address, User
from .serializers import (
    AddressSerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)

_auth_response = inline_serializer(
    name="AuthResponse",
    fields={
        "token": serializers.CharField(),
        "refresh": serializers.CharField(),
        "user": UserSerializer(),
    },
)
_me_response = inline_serializer(
    name="MeResponse", fields={"user": UserSerializer()}
)


def _tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"token": str(refresh.access_token), "refresh": str(refresh)}


@extend_schema(request=LoginSerializer, responses=_auth_response)
class LoginView(APIView):
    # No authentication: ignore any (possibly stale) Authorization header so
    # logging in never 401s on an old/expired token.
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({**_tokens_for(user), "user": UserSerializer(user).data})


@extend_schema(request=RegisterSerializer, responses=_auth_response)
class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.create_user(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
            name=serializer.validated_data["name"],
        )
        return Response(
            {**_tokens_for(user), "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=_me_response)
    def get(self, request):
        return Response({"user": UserSerializer(request.user).data})

    @extend_schema(request=ProfileUpdateSerializer, responses=_me_response)
    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user
        for field in ("name", "phone", "avatar"):
            if field in data:
                setattr(user, field, data[field])
        if data.get("password"):
            user.set_password(data["password"])
        user.save()
        return Response({"user": UserSerializer(user).data})


class AddressViewSet(viewsets.ModelViewSet):
    """CRUD for the current user's addresses. Returns a plain list (no
    pagination wrapper) to match the mock contract."""

    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)
