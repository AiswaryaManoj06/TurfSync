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
                "today_revenue": 0.0,
                "upcoming_bookings_count": 0,
                "total_turfs_count": 0,
                "turfs": [],
                "recent_requests": []
            })

        # High-performance consolidated metrics query (<5ms)
        stats = query_one(
            """
            SELECT
                COUNT(DISTINCT CASE WHEN br.status = 'Pending' THEN br.id END) as pending_count,
                COUNT(DISTINCT CASE WHEN br.booking_date = CURRENT_DATE AND br.status = 'Approved' THEN br.id END) as today_bookings_count,
                COALESCE(SUM(CASE WHEN br.booking_date = CURRENT_DATE AND br.status = 'Approved' THEN br.total_amount ELSE 0 END), 0) as today_revenue,
                COUNT(DISTINCT CASE WHEN br.booking_date >= CURRENT_DATE AND br.status = 'Approved' THEN br.id END) as upcoming_bookings_count
            FROM turfs t
            LEFT JOIN booking_requests br ON br.turf_id = t.id
            WHERE t.owner_id = %s AND t.is_deleted = FALSE;
            """,
            (owner_id,)
        )

        # Active turfs summary with per-turf metrics
        turfs_summary = query_all(
            """
            SELECT 
                t.id, t.name, t.sport, t.status, t.weekday_price_per_hour, t.weekend_price_per_hour,
                (SELECT COUNT(*) FROM booking_requests br WHERE br.turf_id = t.id AND br.status = 'Pending') as pending_count,
                (SELECT COUNT(*) FROM booking_requests br WHERE br.turf_id = t.id AND br.booking_date = CURRENT_DATE AND br.status = 'Approved') as today_count,
                (SELECT COUNT(*) FROM booking_requests br WHERE br.turf_id = t.id AND br.booking_date > CURRENT_DATE AND br.status = 'Approved') as upcoming_count
            FROM turfs t
            WHERE t.owner_id = %s AND t.is_deleted = FALSE
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
            WHERE t.owner_id = %s AND t.is_deleted = FALSE
            ORDER BY br.created_at DESC
            LIMIT 5;
            """,
            (owner_id,)
        )

        return Response({
            "account_status": owner["account_status"],
            "pending_requests_count": stats["pending_count"] if stats else 0,
            "today_bookings_count": stats["today_bookings_count"] if stats else 0,
            "today_revenue": float(stats["today_revenue"]) if stats else 0.0,
            "upcoming_bookings_count": stats["upcoming_bookings_count"] if stats else 0,
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
