from django.urls import path

from .views import RecalculateAllView, ScoringSettingView

urlpatterns = [
    path("settings/", ScoringSettingView.as_view()),
    path("recalculate/", RecalculateAllView.as_view()),
]
