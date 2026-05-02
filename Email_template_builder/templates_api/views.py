from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.core.exceptions import ValidationError as DjangoValidationError
from django.template import Template, Context
from django.conf import settings
from django.utils.encoding import force_bytes, force_str
from django.utils import timezone
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from openai import OpenAI
import json
import logging
from .models import EmailGenerationHistory, EmailTemplate, TemplateFavorite, TemplateShare
from .serializers import (
    EmailGenerationHistorySerializer,
    EmailTemplateSerializer,
    LoginSerializer,
    SignupSerializer,
    TemplateShareSerializer,
    UserSummarySerializer,
)

logger = logging.getLogger(__name__)

from .generation_service import (
    build_prompt_from_parts,
    build_mock_email_variations,
    detect_length,
    extract_uploaded_file_context,
    finalize_variations,
    generate_single_variation,
    generate_variations_with_ollama,
    generate_variations_with_openai,
    normalize_ollama_model,
    OllamaGenerationError,
    save_generation_history,
    serialize_requested_tones,
)
from .upload_utils import IMAGE_UPLOAD_EXTENSIONS, save_uploaded_file, validate_uploaded_file
from .template_access import get_accessible_templates_for_user, get_database_templates_for_user, is_premium_user, user_can_edit_template


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "service": "inbox-studio-api",
                "time": timezone.now().isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": UserSummarySerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if not user:
            return Response({"detail": "Invalid username or password."}, status=status.HTTP_400_BAD_REQUEST)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSummarySerializer(user).data}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSummarySerializer(request.user).data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        current_password = request.data.get("current_password") or ""
        new_password = request.data.get("new_password") or ""

        if not request.user.check_password(current_password):
            return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user=request.user)
        except DjangoValidationError as exc:
            return Response({"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        Token.objects.filter(user=request.user).delete()
        token = Token.objects.create(user=request.user)
        return Response({"token": token.key, "user": UserSummarySerializer(request.user).data}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email and request.user.is_authenticated:
            email = (request.user.email or "").strip().lower()

        if not email:
            return Response({"email": ["Email is required."]}, status=status.HTTP_400_BAD_REQUEST)

        if not getattr(settings, "PASSWORD_RESET_EMAIL_ENABLED", False):
            return Response(
                {
                    "detail": "SMTP is not configured yet. Add EMAIL_HOST, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, and PASSWORD_RESET_EMAIL_ENABLED=true.",
                    "email_delivery_configured": False,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        generic_response = {
            "detail": "If an account exists for that email, a password reset link has been sent.",
            "email_delivery_configured": True,
        }
        if not user:
            return Response(generic_response, status=status.HTTP_200_OK)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{settings.FRONTEND_URL}/?reset_uid={uid}&reset_token={token}#reset-password"
        message = (
            f"Hi {user.first_name or user.username},\n\n"
            "Use the link below to reset your Inbox Studio password:\n\n"
            f"{reset_url}\n\n"
            "If you did not request this, you can ignore this email."
        )

        try:
            send_mail(
                "Reset your Inbox Studio password",
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        except Exception as exc:
            logger.exception("Password reset email failed")
            return Response(
                {"detail": f"Password reset email could not be sent: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(generic_response, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        uid = request.data.get("uid") or ""
        token = request.data.get("token") or ""
        new_password = request.data.get("new_password") or ""

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist, DjangoValidationError):
            user = None

        if not user or not default_token_generator.check_token(user, token):
            return Response({"detail": "Password reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response({"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        Token.objects.filter(user=user).delete()
        return Response({"detail": "Password reset complete. You can log in with the new password."}, status=status.HTTP_200_OK)


class VerificationStatusView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "email": request.user.email,
                "email_verified": False,
                "mode": "demo",
                "email_delivery_configured": bool(getattr(settings, "PASSWORD_RESET_EMAIL_ENABLED", False)),
                "detail": "Email verification is not connected yet. This demo confirms that an email is attached to the account.",
            },
            status=status.HTTP_200_OK,
        )


class AccountStatsView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        templates = EmailTemplate.objects.filter(owner=request.user, deleted_at__isnull=True)
        history = EmailGenerationHistory.objects.filter(owner=request.user)
        tone_counts = {}
        for item in history:
            for tone in [part.strip() for part in (item.tone or "").split(",") if part.strip()]:
                tone_counts[tone] = tone_counts.get(tone, 0) + 1

        return Response(
            {
                "templates": templates.count(),
                "active_templates": templates.filter(is_archived=False).count(),
                "archived_templates": templates.filter(is_archived=True).count(),
                "history": history.count(),
                "favorites": TemplateFavorite.objects.filter(user=request.user, template__deleted_at__isnull=True).count(),
                "shares_sent": TemplateShare.objects.filter(owner=request.user, template__deleted_at__isnull=True).count(),
                "shares_received": TemplateShare.objects.filter(shared_with=request.user, template__deleted_at__isnull=True).count(),
                "categories": sorted(set(templates.values_list("category", flat=True))),
                "top_tones": sorted(
                    [{"tone": tone, "count": count} for tone, count in tone_counts.items()],
                    key=lambda item: item["count"],
                    reverse=True,
                )[:5],
            },
            status=status.HTTP_200_OK,
        )


class AccountCategoryView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        action = (request.data.get("action") or "").strip().lower()
        source_category = (request.data.get("from_category") or "").strip()
        target_category = (request.data.get("to_category") or "").strip()

        if not source_category or source_category == "All":
            return Response({"detail": "Choose a real category first."}, status=status.HTTP_400_BAD_REQUEST)

        templates = EmailTemplate.objects.filter(
            owner=request.user,
            category=source_category,
            deleted_at__isnull=True,
        )
        if not templates.exists():
            return Response({"detail": "Category not found."}, status=status.HTTP_404_NOT_FOUND)

        if action == "rename":
            if not target_category or target_category == "All":
                return Response({"detail": "Add a new category name."}, status=status.HTTP_400_BAD_REQUEST)
            target_category = target_category[:80]
            updated = templates.update(category=target_category)
            return Response(
                {"detail": "Category renamed.", "updated": updated, "category": target_category},
                status=status.HTTP_200_OK,
            )

        if action == "delete":
            fallback_category = target_category[:80] if target_category and target_category != "All" else "General"
            updated = templates.update(category=fallback_category)
            return Response(
                {"detail": "Category removed.", "updated": updated, "category": fallback_category},
                status=status.HTTP_200_OK,
            )

        return Response({"detail": "Unsupported category action."}, status=status.HTTP_400_BAD_REQUEST)


class ClearArchivedTemplatesView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        deleted_count = EmailTemplate.objects.filter(
            owner=request.user,
            is_archived=True,
            deleted_at__isnull=True,
        ).update(deleted_at=timezone.now())
        return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)


class ExportDataView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        templates = EmailTemplate.objects.filter(owner=request.user, deleted_at__isnull=True)
        history = EmailGenerationHistory.objects.filter(owner=request.user)
        return Response(
            {
                "version": 1,
                "exported_at": timezone.now().isoformat(),
                "user": UserSummarySerializer(request.user).data,
                "templates": EmailTemplateSerializer(templates, many=True, context={"request": request}).data,
                "history": EmailGenerationHistorySerializer(history, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class ImportTemplatesView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        raw_templates = request.data.get("templates") or []
        if not isinstance(raw_templates, list):
            return Response({"detail": "templates must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        for item in raw_templates[:50]:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            if not content:
                content = json.dumps(
                    {
                        "subject": item.get("subject") or item.get("title") or "Imported template",
                        "greeting": item.get("greeting") or "",
                        "body": item.get("body") or "",
                        "closing": item.get("closing") or item.get("footer") or "",
                        "signature": item.get("signature") or "",
                    }
                )
            payload = {
                "title": item.get("title") or item.get("subject") or "Imported template",
                "content": content,
                "footer": item.get("footer") or item.get("closing") or "",
                "image_url": item.get("image_url") or None,
                "category": item.get("category") or "Imported",
                "tags": item.get("tags") or ["imported"],
                "is_archived": bool(item.get("is_archived", False)),
            }
            serializer = EmailTemplateSerializer(data=payload, context={"request": request})
            serializer.is_valid(raise_exception=True)
            created.append(serializer.save(owner=request.user))

        return Response(
            EmailTemplateSerializer(created, many=True, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class TemplateListCreateView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        templates = get_accessible_templates_for_user(request.user)
        serializer = EmailTemplateSerializer(templates, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        mutable_data = request.data.copy()
        image_url = mutable_data.get("image_url")
        if "image" in request.FILES:
            image_url = save_uploaded_file(
                request.FILES["image"],
                allowed_extensions=IMAGE_UPLOAD_EXTENSIONS,
            )
        mutable_data["image_url"] = image_url

        serializer = EmailTemplateSerializer(data=mutable_data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        duplicate_template = EmailTemplate.objects.filter(
            owner=request.user,
            deleted_at__isnull=True,
            title=serializer.validated_data.get("title", ""),
            content=serializer.validated_data.get("content", ""),
        ).first()
        if duplicate_template:
            return Response(
                {
                    "detail": "This template already exists in your saved library.",
                    "existing_template": EmailTemplateSerializer(
                        duplicate_template,
                        context={"request": request},
                    ).data,
                },
                status=status.HTTP_409_CONFLICT,
            )
        template = serializer.save(owner=request.user)
        return Response(
            EmailTemplateSerializer(template, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class DatabaseTemplateListView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        all_database_templates = EmailTemplate.objects.filter(
            is_database_template=True,
            is_archived=False,
            deleted_at__isnull=True,
        )
        templates = get_database_templates_for_user(request.user)
        serializer = EmailTemplateSerializer(templates, many=True, context={"request": request})
        has_full_access = is_premium_user(request.user)

        return Response(
            {
                "templates": serializer.data,
                "access": {
                    "plan": "premium" if has_full_access else "free",
                    "has_full_access": has_full_access,
                    "free_limit": max(1, getattr(settings, "DATABASE_TEMPLATE_FREE_LIMIT", 4)),
                    "visible_count": len(serializer.data),
                    "total_count": all_database_templates.count(),
                    "free_count": all_database_templates.filter(access_tier=EmailTemplate.ACCESS_FREE).count(),
                    "premium_count": all_database_templates.filter(access_tier=EmailTemplate.ACCESS_PREMIUM).count(),
                },
            },
            status=status.HTTP_200_OK,
        )


class TemplateDetailView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, request, template_id):
        return get_accessible_templates_for_user(request.user).filter(id=template_id).first()

    def get(self, request, template_id):
        template = self.get_object(request, template_id)
        if not template:
            return Response({"detail": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(EmailTemplateSerializer(template, context={"request": request}).data, status=status.HTTP_200_OK)

    def patch(self, request, template_id):
        template = self.get_object(request, template_id)
        if not template:
            return Response({"detail": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
        if not user_can_edit_template(request.user, template):
            return Response({"detail": "You do not have permission to edit this template."}, status=status.HTTP_403_FORBIDDEN)

        serializer = EmailTemplateSerializer(template, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, template_id):
        template = self.get_object(request, template_id)
        if not template:
            return Response({"detail": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
        if template.owner_id != request.user.id:
            return Response({"detail": "Only the owner can delete a template."}, status=status.HTTP_403_FORBIDDEN)
        template.deleted_at = timezone.now()
        template.save(update_fields=["deleted_at", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class RestoreTemplateView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, template_id):
        template = EmailTemplate.objects.filter(id=template_id, owner=request.user).first()
        if not template:
            return Response({"detail": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
        template.deleted_at = None
        template.save(update_fields=["deleted_at", "updated_at"])
        return Response(EmailTemplateSerializer(template, context={"request": request}).data, status=status.HTTP_200_OK)


class FavoriteTemplateView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, template_id):
        template = get_accessible_templates_for_user(request.user).filter(id=template_id).first()
        if not template:
            return Response({"detail": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
        TemplateFavorite.objects.get_or_create(user=request.user, template=template)
        return Response({"detail": "Template favorited."}, status=status.HTTP_201_CREATED)

    def delete(self, request, template_id):
        deleted, _ = TemplateFavorite.objects.filter(user=request.user, template_id=template_id).delete()
        if not deleted:
            return Response({"detail": "Favorite not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ShareTemplateView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request, template_id):
        serializer = TemplateShareSerializer(
            data={**request.data, "template_id": template_id},
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        share = serializer.save(owner=request.user)
        return Response(TemplateShareSerializer(share, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def delete(self, request, template_id):
        username = (request.data.get("shared_with_username") or "").strip()
        if not username:
            return Response({"detail": "shared_with_username is required."}, status=status.HTTP_400_BAD_REQUEST)
        share = TemplateShare.objects.filter(
            template_id=template_id,
            owner=request.user,
            shared_with__username=username,
        ).first()
        if not share:
            return Response({"detail": "Share not found."}, status=status.HTTP_404_NOT_FOUND)
        share.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GetEmailLayoutView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        title = request.data.get("title", "Default Title")
        content = request.data.get("content", "Default Content")
        footer = request.data.get("footer", "Default Footer")
        image_url = request.data.get("image_url", None)

        layout = """<div class="email-container">
            <h1>{{ title }}</h1>
            <p style="white-space: pre-wrap;">{{ content }}</p>
            <footer style="white-space: pre-wrap;">{{ footer }}</footer>
            {% if image_url %}
                <img src="{{ image_url }}" />
            {% endif %}
        </div>"""

        template = Template(layout)
        context = Context({
            "title": title,
            "content": content,
            "footer": footer,
            "image_url": image_url
        })
        rendered_layout = template.render(context)

        return Response({"rendered_layout": rendered_layout})

class UploadImageView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if "image" not in request.FILES:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        image = request.FILES["image"]
        image_url = save_uploaded_file(image, allowed_extensions=IMAGE_UPLOAD_EXTENSIONS)
        return Response({"image_url": image_url}, status=status.HTTP_201_CREATED)


class UploadEmailConfigView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Handle the POST request to upload email configurations with validation for the `image_url` field.
        """

        image_url = None
        if 'image' in request.FILES:
            image_url = save_uploaded_file(
                request.FILES['image'],
                allowed_extensions=IMAGE_UPLOAD_EXTENSIONS,
            )

        payload = request.data.copy()
        payload['image_url'] = image_url

        serializer = EmailTemplateSerializer(data=payload, context={"request": request})
        if serializer.is_valid():
            email_config = serializer.save(owner=request.user)
            logger.info("Saved email config %s", email_config.id)

            return Response(
                EmailTemplateSerializer(email_config, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

        logger.warning("Email config validation errors: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RenderAndDownloadTemplateView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        title = request.data.get("title", "Default Title")
        content = request.data.get("content", "Default Content")
        footer = request.data.get("footer", "Default Footer")
        image_url = request.data.get("image_url", None)

        layout = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f3f4f6;
            color: #333;
        }
        .email-container {
            max-width: 700px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #6a11cb, #2575fc);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 1px;
        }
        .content {
            padding: 25px 20px;
            line-height: 1.8;
            font-size: 16px;
        }
        .content p {
            margin: 0 0 15px;
        }
        .content strong {
            color: #6a11cb;
        }
        .image-container {
            text-align: center;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .image-container img {
            max-width: 90%;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .cta-button {
            display: inline-block;
            margin: 20px auto;
            padding: 12px 25px;
            background: linear-gradient(135deg, #6a11cb, #2575fc);
            color: white;
            text-decoration: none;
            font-weight: bold;
            border-radius: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transition: background 0.3s ease;
        }
        .cta-button:hover {
            background: linear-gradient(135deg, #2575fc, #6a11cb);
        }
        .footer {
            background: #f1f5f9;
            padding: 15px 20px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 14px;
            color: #606f7b;
        }
        .footer a {
            color: #6a11cb;
            text-decoration: none;
            font-weight: bold;
        }
        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>{{ title }}</h1>
        </div>
        <div class="content">
            <p style="white-space: pre-wrap;">{{ content }}</p>
        </div>
        {% if image_url %}
        <div class="image-container">
            <img src="{{ image_url }}" alt="Email Image" />
        </div>
        {% endif %}
        <div class="footer">
            <p style="white-space: pre-wrap;">{{ footer }}</p>
            <p>Need help? Visit our <a href="#">Support Center</a> or <a href="#">Contact Us</a>.</p>
        </div>
    </div>
</body>
</html>
"""

        template = Template(layout)
        context = Context({
            "title": title,
            "content": content,
            "footer": footer,
            "image_url": image_url
        })
        rendered_html = template.render(context)

        return Response({"rendered_html": rendered_html})


class EmailHistoryView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        history = EmailGenerationHistory.objects.filter(owner=request.user)[:50]
        serializer = EmailGenerationHistorySerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        EmailGenerationHistory.objects.filter(owner=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmailHistoryDetailView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, history_id):
        deleted, _ = EmailGenerationHistory.objects.filter(id=history_id, owner=request.user).delete()
        if not deleted:
            return Response({"detail": "History item not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SaveGeneratedHistoryView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        subject = (request.data.get("subject") or "").strip()
        purpose = (request.data.get("purpose") or "").strip()
        tone = serialize_requested_tones(request.data.get("tone"))
        prompt = (request.data.get("prompt") or "").strip()
        variations = request.data.get("variations") or []

        normalized_variations = finalize_variations(variations, subject, tone, purpose)
        if not normalized_variations:
            return Response({"detail": "Variations are required."}, status=status.HTTP_400_BAD_REQUEST)

        history_entry = save_generation_history(request.user, subject, purpose, tone, prompt, normalized_variations)
        return Response(history_entry, status=status.HTTP_201_CREATED)


class GenerateEmailView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        prompt = (request.data.get("prompt") or "").strip()
        subject = (request.data.get("subject") or "").strip()
        purpose = (request.data.get("purpose") or "").strip()
        tone = serialize_requested_tones(request.data.get("tone"))
        ollama_model = normalize_ollama_model(request.data.get("ollama_model") or request.data.get("model"))
        brand_voice = (request.data.get("brand_voice") or "").strip()
        language = (request.data.get("language") or "").strip()
        uploaded_file = request.FILES.get("file")
        variation_count = request.data.get("variation_count") or 4
        style_index = request.data.get("style_index")
        save_history = request.data.get("save_history", True)

        try:
            variation_count = int(variation_count)
        except (TypeError, ValueError):
            variation_count = 4
        variation_count = max(1, min(variation_count, 4))

        if isinstance(save_history, str):
            save_history = save_history.lower() not in ["false", "0", "no"]

        prompt = build_prompt_from_parts(subject, purpose, prompt)
        if uploaded_file:
            validate_uploaded_file(uploaded_file)
        file_context = extract_uploaded_file_context(uploaded_file)
        if file_context:
            prompt = f"{prompt}\n\n{file_context}".strip()
        length_pref = detect_length(prompt)

        if not prompt:
            return Response({"detail": "Subject or purpose is required."}, status=status.HTTP_400_BAD_REQUEST)

        if style_index is not None:
            try:
                style_index = int(style_index)
            except (TypeError, ValueError):
                return Response({"detail": "style_index must be a valid integer."}, status=status.HTTP_400_BAD_REQUEST)

            variation_error = None
            try:
                variation = generate_single_variation(
                    subject,
                    purpose,
                    prompt,
                    tone,
                    variation_count,
                    style_index,
                    ollama_model,
                    brand_voice,
                    language,
                )
            except OllamaGenerationError as exc:
                variation_error = str(exc)
                logger.debug("Single email variation generation failed: %s", variation_error)
                variation = None
            except Exception as exc:
                variation_error = str(exc)
                logger.exception("Single email variation generation failed")
                variation = None

            if not variation:
                detail = "Failed to generate email variation."
                response_status = status.HTTP_500_INTERNAL_SERVER_ERROR
                if variation_error:
                    detail = variation_error
                    response_status = status.HTTP_503_SERVICE_UNAVAILABLE
                return Response({"detail": detail}, status=response_status)

            payload = {
                "tone": tone or "Professional",
                "ollama_model": ollama_model,
                "prompt": prompt,
                "variation": variation,
            }
            if save_history and request.user.is_authenticated:
                payload["history_entry"] = save_generation_history(request.user, subject, purpose, tone, prompt, [variation])
            return Response(payload, status=status.HTTP_200_OK)

        # Always prefer local Ollama first.
        ollama_error = ""
        try:
            ollama_result = generate_variations_with_ollama(
                subject,
                purpose,
                prompt,
                tone,
                length_pref,
                variation_count,
                ollama_model,
                brand_voice,
                language,
            )
            if ollama_result and ollama_result.get("variations"):
                history_entry = (
                    save_generation_history(request.user, subject, purpose, tone, prompt, ollama_result["variations"])
                    if save_history and request.user.is_authenticated
                    else None
                )
                return Response(
                    {
                        "tone": tone or "Professional",
                        "ollama_model": ollama_model,
                        "prompt": prompt,
                        "variations": ollama_result["variations"],
                        **({"history_entry": history_entry} if history_entry else {}),
                    },
                    status=status.HTTP_200_OK,
                )
            if ollama_result and ollama_result.get("error"):
                ollama_error = ollama_result["error"]
        except Exception as exc:
            ollama_error = str(exc)

        if getattr(settings, "USE_OLLAMA_ONLY", False) and ollama_error:
            return Response({"detail": ollama_error}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if getattr(settings, "USE_OLLAMA_ONLY", False):
            return Response(
                {
                    "detail": "Ollama did not return usable drafts. Restart Ollama or try installing qwen2.5:1.5b with: ollama pull qwen2.5:1.5b"
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not settings.OPENAI_API_KEY:
            try:
                variations = build_mock_email_variations(subject, purpose, tone, variation_count)
                history_entry = (
                    save_generation_history(request.user, subject, purpose, tone, prompt, variations)
                    if save_history and request.user.is_authenticated
                    else None
                )
                return Response(
                    {
                        "tone": tone or "Professional",
                        "ollama_model": ollama_model,
                        "prompt": prompt,
                        "variations": variations,
                        **({"history_entry": history_entry} if history_entry else {}),
                    },
                    status=status.HTTP_200_OK,
                )
            except Exception:
                return Response(
                    {"detail": "Failed to generate email with available providers."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
        except Exception as exc:
            return Response(
                {"detail": f"Failed to initialize OpenAI client: {str(exc)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            variations = generate_variations_with_openai(client, subject, purpose, prompt, tone, variation_count)
        except Exception:
            # Fallback chain after OpenAI: local mock
            try:
                variations = build_mock_email_variations(subject, purpose, tone, variation_count)
                history_entry = (
                    save_generation_history(request.user, subject, purpose, tone, prompt, variations)
                    if save_history and request.user.is_authenticated
                    else None
                )
                return Response(
                    {
                        "tone": tone or "Professional",
                        "ollama_model": ollama_model,
                        "prompt": prompt,
                        "variations": variations,
                        **({"history_entry": history_entry} if history_entry else {}),
                    },
                    status=status.HTTP_200_OK,
                )
            except Exception:
                return Response(
                    {"detail": "Failed to generate email with available providers."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if not variations:
            variations = build_mock_email_variations(subject, purpose, tone, variation_count)
        history_entry = (
            save_generation_history(request.user, subject, purpose, tone, prompt, variations)
            if save_history and request.user.is_authenticated
            else None
        )

        return Response(
            {
                "tone": tone or "Professional",
                "ollama_model": ollama_model,
                "prompt": prompt,
                "variations": variations,
                **({"history_entry": history_entry} if history_entry else {}),
            },
            status=status.HTTP_200_OK,
        )
