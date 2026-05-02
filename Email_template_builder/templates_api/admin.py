from django.contrib import admin

from .models import EmailGenerationHistory, EmailTemplate, TemplateFavorite, TemplateShare


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "access_tier", "is_database_template", "is_archived", "owner", "updated_at")
    list_filter = ("is_database_template", "access_tier", "is_archived", "category")
    search_fields = ("title", "content", "tags", "owner__username")
    readonly_fields = ("updated_at", "deleted_at")


@admin.register(EmailGenerationHistory)
class EmailGenerationHistoryAdmin(admin.ModelAdmin):
    list_display = ("subject", "tone", "owner", "created_at")
    list_filter = ("tone", "created_at")
    search_fields = ("subject", "purpose", "prompt", "owner__username")


admin.site.register(TemplateFavorite)
admin.site.register(TemplateShare)
