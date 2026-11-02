"""
Owner Panel Views (Strict Direct SQL - NO ORM)
Handles Owner Dashboard metrics, pending counts, and profile management.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from utilities.permissions import IsOwnerRole
from database.connection import query_all, query_one, execute_update

class OwnerDashboardView(APIView):
    """Provides dashboard statistics for the logged in turf owner."""
    permission_classes = [IsOwnerRole]

    def get(self, request):
        user_id = request.user.id
        owner = query_one("SELECT id, brand_name, account_status FROM owners WHERE user_id = %s;", (user_id,))
        if not owner:
            return Response({"error": "Owner profile not found."}, status=status.HTTP_404_NOT_FOUND)

        owner_id = owner["id"]

        # Check if owner is approved
        if owner["account_status"] != "Approved":
            return Response({
                "account_status": owner["account_status"],
                "message": f"Your account status is currently {owner['account_status']}. You will be able to manage turfs once approved.",
                "pending_requests_count": 0,
                "today_bookings_count": 0,
                "upcoming_bookings_count": 0,
                "total_turfs_count": 0,
                "turfs": []
            })

        # Pending Requests Count
        pending_res = query_one(
            """
            SELECT COUNT(*) as count
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            WHERE t.owner_id = %s AND br.status = 'Pending';
            """,
            (owner_id,)
        )
        pending_count = pending_res["count"] if pending_res else 0

        # Today's Bookings
        today_res = query_one(
            """
            SELECT COUNT(*) as count, COALESCE(SUM(br.total_amount), 0) as revenue
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            WHERE t.owner_id = %s AND br.booking_date = CURRENT_DATE AND br.status = 'Approved';
            """,
            (owner_id,)
        )

        # Upcoming Approved Bookings
        upcoming_res = query_one(
            """
            SELECT COUNT(*) as count
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            WHERE t.owner_id = %s AND br.booking_date >= CURRENT_DATE AND br.status = 'Approved';
            """,
            (owner_id,)
        )

        # Turfs summary with per-turf metrics
        turfs_summary = query_all(
            """
            SELECT 
                t.id, t.name, t.sport, t.status, t.weekday_price_per_hour, t.weekend_price_per_hour,
                (SELECT COUNT(*) FROM booking_requests br WHERE br.turf_id = t.id AND br.status = 'Pending') as pending_count,
                (SELECT COUNT(*) FROM booking_requests br WHERE br.turf_id = t.id AND br.booking_date = CURRENT_DATE AND br.status = 'Approved') as today_count,
                (SELECT COUNT(*) FROM booking_requests br WHERE br.turf_id = t.id AND br.booking_date > CURRENT_DATE AND br.status = 'Approved') as upcoming_count
            FROM turfs t
            WHERE t.owner_id = %s
            ORDER BY t.created_at DESC;
            """,
            (owner_id,)
        )

        # Recent 5 requests
        recent_requests = query_all(
            """
            SELECT 
                br.id, br.booking_reference, br.booking_date, br.status, br.total_amount,
                br.number_of_players, br.team_name, br.created_at,
                t.name as turf_name, p.full_name as player_name, p.mobile as player_mobile
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            JOIN players p ON br.player_id = p.id
            WHERE t.owner_id = %s
            ORDER BY br.created_at DESC
            LIMIT 5;
            """,
            (owner_id,)
        )

        return Response({
            "account_status": owner["account_status"],
            "pending_requests_count": pending_count,
            "today_bookings_count": today_res["count"] if today_res else 0,
            "today_revenue": float(today_res["revenue"]) if today_res else 0.0,
            "upcoming_bookings_count": upcoming_res["count"] if upcoming_res else 0,
            "total_turfs_count": len(turfs_summary),
            "turfs": turfs_summary,
            "recent_requests": recent_requests
        })

class OwnerProfileView(APIView):
    """View and update turf owner profile."""
    permission_classes = [IsOwnerRole]

    def get(self, request):
        user_id = request.user.id
        owner = query_one(
            """
            SELECT o.*, u.email, s.name as state_name, c.name as city_name, co.name as country_name
            FROM owners o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN states s ON o.state_id = s.id
            LEFT JOIN cities c ON o.city_id = c.id
            LEFT JOIN countries co ON o.country_id = co.id
            WHERE o.user_id = %s;
            """,
            (user_id,)
        )
        if not owner:
            return Response({"error": "Owner not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"owner": owner})
