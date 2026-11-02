"""
TurfSync URL Configuration
"""
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("api/auth/", include("apps.authentication.urls")),
    path("api/admin/", include("apps.admin_panel.urls")),
    path("api/owner/", include("apps.owners.urls")),
    path("api/turfs/", include("apps.turfs.urls")),
    path("api/slots/", include("apps.slots.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
