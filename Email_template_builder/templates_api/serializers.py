import re

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from .models import EmailGenerationHistory, EmailTemplate, TemplateFavorite, TemplateShare

LOGIN_ID_RE = re.compile(r"^[A-Za-z0-9_.-]+$")


def clean_login_id(value):
    cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "", (value or "").strip().lower())
    cleaned = cleaned.strip("._-")
    return cleaned or "user"


def build_unique_login_id(first_name="", last_name="", email=""):
    email_name = (email or "").split("@", 1)[0]
    base = clean_login_id(f"{first_name}{last_name}") if first_name or last_name else clean_login_id(email_name)
    login_id = base
    counter = 2

    while User.objects.filter(username__iexact=login_id).exists():
        login_id = f"{base}{counter}"
        counter += 1

    return login_id


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class SignupSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "password"]

    def validate_username(self, value):
        username = (value or "").strip()
        if not username:
            return ""
        if "@" in username:
            raise serializers.ValidationError("Login ID must be a unique username, not a Gmail address.")
        if not LOGIN_ID_RE.match(username):
            raise serializers.ValidationError("Login ID can use letters, numbers, dots, underscores, and hyphens.")
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("A user with this login ID already exists.")
        return username

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("Email is required.")
        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate(self, attrs):
        user_for_validation = User(
            username=attrs.get("username") or build_unique_login_id(
                attrs.get("first_name", ""),
                attrs.get("last_name", ""),
                attrs.get("email", ""),
            ),
            email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            validate_password(attrs["password"], user=user_for_validation)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        if not validated_data.get("username"):
            validated_data["username"] = build_unique_login_id(
                validated_data.get("first_name", ""),
                validated_data.get("last_name", ""),
                validated_data.get("email", ""),
            )
        user = User.objects.create_user(password=password, **validated_data)
        Token.objects.get_or_create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        username = (value or "").strip()
        if "@" in username:
            raise serializers.ValidationError("Use your unique login ID, not your Gmail address.")
        return username


class EmailTemplateSerializer(serializers.ModelSerializer):
    owner = UserSummarySerializer(read_only=True)
    is_favorite = serializers.SerializerMethodField()
    access_level = serializers.SerializerMethodField()
    shared_with = serializers.SerializerMethodField()

    class Meta:
        model = EmailTemplate
        fields = [
            "id",
            "owner",
            "title",
            "content",
            "footer",
            "image_url",
            "category",
            "tags",
            "is_archived",
            "is_database_template",
            "access_tier",
            "updated_at",
            "deleted_at",
            "is_favorite",
            "access_level",
            "shared_with",
        ]
        read_only_fields = [
            "id",
            "owner",
            "updated_at",
            "deleted_at",
            "is_favorite",
            "access_level",
            "shared_with",
            "is_database_template",
            "access_tier",
        ]

    def validate_image_url(self, value):
        if not value:
            return None
        if not value.startswith("http"):
            raise serializers.ValidationError("Enter a valid URL.")
        return value

    def validate_category(self, value):
        cleaned = (value or "General").strip()
        return cleaned[:80] or "General"

    def validate_tags(self, value):
        if value in [None, ""]:
            return []
        if isinstance(value, str):
            value = [tag.strip() for tag in value.split(",")]
        if not isinstance(value, list):
            raise serializers.ValidationError("Tags must be a list or comma-separated text.")
        tags = []
        seen = set()
        for item in value:
            tag = str(item).strip()
            key = tag.lower()
            if tag and key not in seen:
                tags.append(tag[:32])
                seen.add(key)
        return tags[:8]

    def get_is_favorite(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return obj.favorited_by.filter(user=user).exists()

    def get_access_level(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return "public"
        if obj.owner_id == user.id:
            return "owner"
        share = obj.shares.filter(shared_with=user).first()
        return share.permission if share else "none"

    def get_shared_with(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated or obj.owner_id != user.id:
            return []
        shares = obj.shares.select_related("shared_with")
        return [
            {
                "id": share.id,
                "permission": share.permission,
                "shared_with": UserSummarySerializer(share.shared_with).data,
            }
            for share in shares
        ]


class EmailGenerationHistorySerializer(serializers.ModelSerializer):
    owner = UserSummarySerializer(read_only=True)

    class Meta:
        model = EmailGenerationHistory
        fields = "__all__"
        read_only_fields = ["id", "owner", "created_at"]


class TemplateFavoriteSerializer(serializers.ModelSerializer):
    template = EmailTemplateSerializer(read_only=True)
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=EmailTemplate.objects.all(),
        source="template",
        write_only=True,
    )

    class Meta:
        model = TemplateFavorite
        fields = ["id", "template", "template_id", "created_at"]
        read_only_fields = ["id", "created_at", "template"]


class TemplateShareSerializer(serializers.ModelSerializer):
    template = EmailTemplateSerializer(read_only=True)
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=EmailTemplate.objects.all(),
        source="template",
        write_only=True,
    )
    owner = UserSummarySerializer(read_only=True)
    shared_with = UserSummarySerializer(read_only=True)
    shared_with_username = serializers.CharField(write_only=True)

    class Meta:
        model = TemplateShare
        fields = [
            "id",
            "template",
            "template_id",
            "owner",
            "shared_with",
            "shared_with_username",
            "permission",
            "created_at",
        ]
        read_only_fields = ["id", "template", "owner", "shared_with", "created_at"]

    def validate_shared_with_username(self, value):
        username = (value or "").strip()
        if not username:
            raise serializers.ValidationError("shared_with_username is required.")
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError("User not found.") from exc
        return user

    def validate(self, attrs):
        request = self.context["request"]
        template = attrs["template"]
        target_user = attrs["shared_with_username"]
        if template.owner_id != request.user.id:
            raise serializers.ValidationError("Only the template owner can share it.")
        if target_user.id == request.user.id:
            raise serializers.ValidationError("You cannot share a template with yourself.")
        attrs["shared_with"] = target_user
        attrs.pop("shared_with_username", None)
        return attrs

    def create(self, validated_data):
        share, _ = TemplateShare.objects.update_or_create(
            template=validated_data["template"],
            shared_with=validated_data["shared_with"],
            defaults={
                "owner": self.context["request"].user,
                "permission": validated_data["permission"],
            },
        )
        return share
