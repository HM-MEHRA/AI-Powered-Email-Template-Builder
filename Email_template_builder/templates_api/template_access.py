from django.db.models import Q
from django.conf import settings

from .models import EmailTemplate, TemplateShare


def is_premium_user(user):
    if not getattr(user, "is_authenticated", False):
        return False

    username = (user.username or "").strip().lower()
    email = (user.email or "").strip().lower()
    premium_usernames = {item.lower() for item in getattr(settings, "PREMIUM_USERNAMES", [])}
    premium_emails = {item.lower() for item in getattr(settings, "PREMIUM_USER_EMAILS", [])}

    return (
        user.is_staff
        or user.is_superuser
        or username in premium_usernames
        or email in premium_emails
        or user.groups.filter(name__iexact="premium").exists()
    )


def get_accessible_templates_for_user(user):
    if not user.is_authenticated:
        return EmailTemplate.objects.none()
    return (
        EmailTemplate.objects.filter(
            Q(owner=user) | Q(shares__shared_with=user),
            deleted_at__isnull=True,
        )
        .select_related("owner")
        .prefetch_related("shares__shared_with", "favorited_by")
        .distinct()
    )


def get_database_templates_for_user(user):
    templates = EmailTemplate.objects.filter(
        is_database_template=True,
        is_archived=False,
        deleted_at__isnull=True,
    ).select_related("owner").order_by("access_tier", "-id")

    if is_premium_user(user):
        return templates

    free_limit = max(1, getattr(settings, "DATABASE_TEMPLATE_FREE_LIMIT", 4))
    return templates.filter(access_tier=EmailTemplate.ACCESS_FREE)[:free_limit]


def user_can_edit_template(user, template):
    if template.owner_id == user.id:
        return True
    return template.shares.filter(shared_with=user, permission=TemplateShare.PERMISSION_EDIT).exists()
