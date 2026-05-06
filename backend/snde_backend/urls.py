from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/imports/", include("imports.urls")),
    path("api/zones/", include("zones.urls")),
    path("api/clients/", include("clients.urls")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/scoring/", include("scoring.urls")),
    path("api/chatbot/", include("chatbot.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
