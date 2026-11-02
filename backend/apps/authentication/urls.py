from django.urls import path
from .views import LocationsView, RegisterOwnerView, RegisterPlayerView, LoginView, CurrentUserView, ExternalCitiesView

urlpatterns = [
    path("locations/", LocationsView.as_view(), name="locations"),
    path("external-cities/", ExternalCitiesView.as_view(), name="external_cities"),
    path("register/owner/", RegisterOwnerView.as_view(), name="register_owner"),
    path("register/player/", RegisterPlayerView.as_view(), name="register_player"),
    path("login/", LoginView.as_view(), name="login"),
    path("me/", CurrentUserView.as_view(), name="current_user"),
]
