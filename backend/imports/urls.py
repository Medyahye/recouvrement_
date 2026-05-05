from django.urls import path

from imports.views import (
    ImportListAPIView,
    ImportUploadAPIView,
    LatestImportAPIView,
    LatestImportComparisonAPIView,
    MinioWebhookAPIView,
    PollMinioAPIView,
)

urlpatterns = [
    path("upload/", ImportUploadAPIView.as_view(), name="imports-upload"),
    path("poll-minio/", PollMinioAPIView.as_view(), name="imports-poll-minio"),
    path("minio-webhook/", MinioWebhookAPIView.as_view(), name="imports-minio-webhook"),
    path("", ImportListAPIView.as_view(), name="imports-list"),
    path("latest/", LatestImportAPIView.as_view(), name="imports-latest"),
    path("comparison/latest/", LatestImportComparisonAPIView.as_view(), name="imports-comparison-latest"),
]
