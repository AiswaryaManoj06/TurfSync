from django.urls import path
from .views import OwnerDashboardView, OwnerProfileView

urlpatterns = [
    path("dashboard/", OwnerDashboardView.as_view(), name="owner_dashboard"),
    path("profile/", OwnerProfileView.as_view(), name="owner_profile"),
]
