# templates_api/models.py
from django.conf import settings
from django.db import models


User = settings.AUTH_USER_MODEL

class EmailTemplate(models.Model):
    ACCESS_FREE = "free"
    ACCESS_PREMIUM = "premium"
    ACCESS_TIER_CHOICES = [
        (ACCESS_FREE, "Free"),
        (ACCESS_PREMIUM, "Premium"),
    ]

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_templates",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    footer = models.TextField()
    image_url = models.URLField(blank=True, null=True)
    category = models.CharField(max_length=80, default="General")
    tags = models.JSONField(default=list, blank=True)
    is_archived = models.BooleanField(default=False)
    is_database_template = models.BooleanField(default=False)
    access_tier = models.CharField(max_length=20, choices=ACCESS_TIER_CHOICES, default=ACCESS_FREE)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.title


class EmailGenerationHistory(models.Model):
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_generation_history",
        null=True,
        blank=True,
    )
    subject = models.CharField(max_length=255)
    purpose = models.TextField()
    tone = models.CharField(max_length=255)
    prompt = models.TextField()
    variations = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.subject} ({self.tone})"


class TemplateFavorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorite_templates")
    template = models.ForeignKey(EmailTemplate, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "template")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} -> {self.template}"


class TemplateShare(models.Model):
    PERMISSION_VIEW = "view"
    PERMISSION_EDIT = "edit"
    PERMISSION_CHOICES = [
        (PERMISSION_VIEW, "View"),
        (PERMISSION_EDIT, "Edit"),
    ]

    template = models.ForeignKey(EmailTemplate, on_delete=models.CASCADE, related_name="shares")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="template_shares_sent")
    shared_with = models.ForeignKey(User, on_delete=models.CASCADE, related_name="template_shares_received")
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default=PERMISSION_VIEW)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("template", "shared_with")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.template} shared with {self.shared_with}"
