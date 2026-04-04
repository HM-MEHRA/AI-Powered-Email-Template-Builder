from rest_framework import serializers
from .models import EmailGenerationHistory, EmailTemplate

class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = '__all__'
    def validate_image_url(self, value):
        # Allow null or empty value for image_url
        if not value:
            return None
        if not value.startswith('http'):
            raise serializers.ValidationError("Enter a valid URL.")
        return value


class EmailGenerationHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailGenerationHistory
        fields = "__all__"
