from django.urls import path
from .views import (
    EmailHistoryView,
    SaveGeneratedHistoryView,
    GetEmailLayoutView,
    UploadImageView,
    UploadEmailConfigView,
    RenderAndDownloadTemplateView,
    GenerateEmailView,
)

urlpatterns = [
    path('getEmailLayout/', GetEmailLayoutView.as_view()),
    path('uploadImage/', UploadImageView.as_view()),
    path('uploadEmailConfig/', UploadEmailConfigView.as_view()),
    path('renderAndDownloadTemplate/', RenderAndDownloadTemplateView.as_view()),
    path('generateEmail/', GenerateEmailView.as_view()),
    path('history/', EmailHistoryView.as_view()),
    path('saveGeneratedHistory/', SaveGeneratedHistoryView.as_view()),
]
