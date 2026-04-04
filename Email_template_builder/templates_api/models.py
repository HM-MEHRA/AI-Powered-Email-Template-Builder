# templates_api/models.py
from django.db import models

class EmailTemplate(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField()
    footer = models.TextField()
    image_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.title


class EmailGenerationHistory(models.Model):
    subject = models.CharField(max_length=255)
    purpose = models.TextField()
    tone = models.CharField(max_length=50)
    prompt = models.TextField()
    variations = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.subject} ({self.tone})"
