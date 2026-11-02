from django.urls import path
from .views import TurfListCreateView, TurfDetailView

urlpatterns = [
    path("", TurfListCreateView.as_view(), name="turf_list_create"),
    path("<int:turf_id>/", TurfDetailView.as_view(), name="turf_detail"),
]
