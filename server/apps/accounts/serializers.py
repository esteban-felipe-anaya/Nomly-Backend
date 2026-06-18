import uuid

from rest_framework import serializers

from .models import Address, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "phone", "avatar"]


class AddressSerializer(serializers.ModelSerializer):
    userId = serializers.CharField(source="user_id", read_only=True)
    isDefault = serializers.BooleanField(source="is_default", required=False, default=False)

    class Meta:
        model = Address
        fields = [
            "id",
            "userId",
            "label",
            "line1",
            "line2",
            "city",
            "notes",
            "lat",
            "lng",
            "isDefault",
        ]
        read_only_fields = ["id", "userId"]

    def create(self, validated_data):
        validated_data["id"] = f"adr_{uuid.uuid4().hex[:10]}"
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ProfileUpdateSerializer(serializers.Serializer):
    """Partial update of the logged-in user's own profile."""

    name = serializers.CharField(required=False)
    phone = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(required=False, write_only=True, min_length=4)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=4)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value
