"""
TurfSync URL Configuration
"""
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings

def serve_media(request, path):
    response = serve(request, path, document_root=settings.MEDIA_ROOT)
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
    response["Access-Control-Allow-Headers"] = "*"
    response["Cross-Origin-Resource-Policy"] = "cross-origin"
    response["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    return response

urlpatterns = [
    path("api/auth/", include("apps.authentication.urls")),
    path("api/admin/", include("apps.admin_panel.urls")),
    path("api/owner/", include("apps.owners.urls")),
    path("api/turfs/", include("apps.turfs.urls")),
    path("api/slots/", include("apps.slots.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    re_path(r"^media/(?P<path>.*)$", serve_media),
]
