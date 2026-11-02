"""
In-App Notifications Views (Strict Direct SQL - NO ORM)
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from utilities.permissions import IsAuthenticatedDirectSQL
from database.connection import query_all, query_one, execute_update

class NotificationsListView(APIView):
    """List in-app notifications for the logged in user."""
    permission_classes = [IsAuthenticatedDirectSQL]

    def get(self, request):
        user_id = request.user.id
        notifications = query_all(
            """
            SELECT * FROM notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 50;
            """,
            (user_id,)
        )
        unread_row = query_one(
            "SELECT COUNT(*) as cnt FROM notifications WHERE user_id = %s AND is_read = FALSE;",
            (user_id,)
        )
        return Response({
            "notifications": notifications,
            "unread_count": unread_row["cnt"] if unread_row else 0
        })

class MarkNotificationReadView(APIView):
    """Mark a single notification as read."""
    permission_classes = [IsAuthenticatedDirectSQL]

    def post(self, request, notification_id):
        user_id = request.user.id
        execute_update(
            "UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s;",
            (notification_id, user_id)
        )
        return Response({"message": "Notification marked as read."})

class MarkAllNotificationsReadView(APIView):
    """Mark all notifications as read for current user."""
    permission_classes = [IsAuthenticatedDirectSQL]

    def post(self, request):
        user_id = request.user.id
        execute_update(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = %s AND is_read = FALSE;",
            (user_id,)
        )
        return Response({"message": "All notifications marked as read."})
