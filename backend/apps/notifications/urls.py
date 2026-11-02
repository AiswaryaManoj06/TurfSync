from django.urls import path
from .views import NotificationsListView, MarkNotificationReadView, MarkAllNotificationsReadView

urlpatterns = [
    path("", NotificationsListView.as_view(), name="notifications_list"),
    path("<int:notification_id>/read/", MarkNotificationReadView.as_view(), name="notification_read"),
    path("mark-all-read/", MarkAllNotificationsReadView.as_view(), name="notifications_mark_all_read"),
]
