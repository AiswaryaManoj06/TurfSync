"""
Booking Management Views (Strict Direct SQL - NO ORM)
Implements complete 7-state booking lifecycle, slot locking, auto-rejection of competing requests,
timeline logging, consecutive slot validation, and 12-hour auto-expiry.
"""
from datetime import datetime, date, time, timedelta, timezone
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from utilities.permissions import IsPlayerRole, IsApprovedOwnerRole, IsAuthenticatedDirectSQL
from database.connection import query_all, query_one, execute_insert, execute_update, db_cursor

def generate_booking_reference() -> str:
    today_str = datetime.now().strftime("%Y%m%d")
    count_row = query_one(
        "SELECT COUNT(*) as cnt FROM booking_requests WHERE booking_reference LIKE %s;",
        (f"TS-{today_str}-%",)
    )
    seq = (count_row["cnt"] if count_row else 0) + 1
    return f"TS-{today_str}-{seq:03d}"

def auto_expire_stale_bookings():
    """
    Auto-expires pending requests where:
    - 12 hours have passed since creation without action, OR
    - The slot start time has already passed.
    Releases slots back to 'Open' status.
    """
    with db_cursor(as_dict=True) as cur:
        # Find stale pending requests
        cur.execute(
            """
            SELECT br.id, br.player_id, br.booking_reference, br.turf_id
            FROM booking_requests br
            WHERE br.status = 'Pending' AND (
                br.expires_at <= CURRENT_TIMESTAMP OR
                EXISTS (
                    SELECT 1 FROM booking_slots bs
                    JOIN slots s ON bs.slot_id = s.id
                    WHERE bs.booking_request_id = br.id
                    AND (s.slot_date < CURRENT_DATE OR (s.slot_date = CURRENT_DATE AND s.start_time <= CURRENT_TIME))
                )
            );
            """
        )
        stale_requests = cur.fetchall()
        for r in stale_requests:
            cur.execute("UPDATE booking_requests SET status = 'Expired', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (r["id"],))
            cur.execute(
                """
                INSERT INTO booking_status_history (booking_request_id, from_status, to_status, reason_or_note)
                VALUES (%s, 'Pending', 'Expired', 'Auto-expired due to 12-hour timeout or passed slot start time.');
                """,
                (r["id"],)
            )
            # Notify player
            cur.execute(
                """
                INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                SELECT u.id, 'Booking Request Expired', %s, 'BOOKING_EXPIRED', %s, 'booking'
                FROM players p JOIN users u ON p.user_id = u.id WHERE p.id = %s;
                """,
                (f"Your booking request {r['booking_reference']} has expired as it was not confirmed in time.", r["id"], r["player_id"])
            )

class PlayerCreateBookingRequestView(APIView):
    """
    Submits a booking request.
    Validations:
      - Slot(s) must be Open and on an Active turf
      - Within advance booking limit
      - Slot(s) must be consecutive
      - Number of players <= turf max
      - Max 5 Pending requests per player
      - Player must accept rules and cancellation policy
    """
    permission_classes = [IsPlayerRole]

    def post(self, request):
        auto_expire_stale_bookings()
        player_id = request.user.raw_data.get("player_id")
        data = request.data

        turf_id = data.get("turf_id")
        booking_date_str = data.get("booking_date")
        raw_slot_ids = data.get("slot_ids", [])
        if isinstance(raw_slot_ids, (str, int)):
            slot_ids = [int(raw_slot_ids)]
        else:
            slot_ids = [int(x) for x in raw_slot_ids]
        number_of_players = data.get("number_of_players")
        team_name = data.get("team_name", "").strip() or None
        add_ons = data.get("add_ons", [])
        payment_pref = data.get("payment_preference", "Pay at Turf")
        special_requests = (data.get("special_requests") or "").strip()[:250]
        rules_accepted = bool(data.get("rules_accepted", False))

        if not rules_accepted:
            return Response({"error": "You must accept the turf rules and cancellation policy."}, status=status.HTTP_400_BAD_REQUEST)
        if not turf_id or not slot_ids or not booking_date_str or not number_of_players:
            return Response({"error": "Turf, booking date, slot(s), and player count are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce max 5 pending requests per player
        pending_check = query_one(
            "SELECT COUNT(*) as cnt FROM booking_requests WHERE player_id = %s AND status = 'Pending';",
            (player_id,)
        )
        if pending_check and pending_check["cnt"] >= 5:
            return Response({
                "error": "You already have 5 pending booking requests. Please wait for them to be processed or withdraw one."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate Turf
        turf = query_one(
            """
            SELECT t.*, o.account_status as owner_status, o.user_id as owner_user_id
            FROM turfs t
            JOIN owners o ON t.owner_id = o.id
            WHERE t.id = %s;
            """,
            (turf_id,)
        )
        if not turf or turf["status"] != "Active" or turf["owner_status"] != "Approved":
            return Response({"error": "This turf is currently unavailable for bookings."}, status=status.HTTP_400_BAD_REQUEST)

        num_players = int(number_of_players)
        if num_players <= 0 or num_players > turf["max_players"]:
            return Response({"error": f"Number of players must be between 1 and {turf['max_players']}."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate Booking Date
        b_date = datetime.strptime(booking_date_str, "%Y-%m-%d").date()
        if b_date < date.today():
            return Response({"error": "Booking date cannot be in the past."}, status=status.HTTP_400_BAD_REQUEST)
        if b_date > date.today() + timedelta(days=turf["advance_booking_limit_days"]):
            return Response({"error": f"Bookings can only be made up to {turf['advance_booking_limit_days']} days in advance."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate Slots
        slots = query_all(
            """
            SELECT s.*
            FROM slots s
            WHERE s.id = ANY(%s::int[]) AND s.turf_id = %s AND s.slot_date = %s
            ORDER BY s.start_time ASC;
            """,
            (slot_ids, turf_id, b_date)
        )
        if len(slots) != len(slot_ids):
            return Response({"error": "One or more selected slots are invalid for this turf and date."}, status=status.HTTP_400_BAD_REQUEST)

        for s in slots:
            if s["status"] not in ("Open", "Requested"):
                return Response({"error": f"Slot {s['start_time'].strftime('%H:%M')} is {s['status']} and cannot be booked."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate Consecutive Slots
        for i in range(len(slots) - 1):
            if slots[i]["end_time"] != slots[i+1]["start_time"]:
                return Response({"error": "Multiple slots selected must be continuous/consecutive."}, status=status.HTTP_400_BAD_REQUEST)

        # Check duplicate pending request by same player for same slots
        existing_dup = query_one(
            """
            SELECT br.id FROM booking_requests br
            JOIN booking_slots bs ON br.id = bs.booking_request_id
            WHERE br.player_id = %s AND bs.slot_id = ANY(%s::int[]) AND br.status IN ('Pending', 'Approved');
            """,
            (player_id, slot_ids)
        )
        if existing_dup:
            return Response({"error": "You already have an active or pending request for one of these slots."}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate Total Price
        is_weekend = b_date.weekday() >= 5
        base_hourly = float(turf["weekend_price_per_hour"] if is_weekend else turf["weekday_price_per_hour"])
        total_slot_price = 0.0
        slot_price_map = {}

        for s in slots:
            rate = float(s["price_override"]) if s["price_override"] is not None else base_hourly
            effective = round(rate * (s["duration_minutes"] / 60.0), 2)
            slot_price_map[s["id"]] = effective
            total_slot_price += effective

        add_on_total = sum(float(ao.get("price", 0)) for ao in add_ons)
        grand_total = round(total_slot_price + add_on_total, 2)
        ref_code = generate_booking_reference()

        # 12-hour expiry timestamp or slot start time, whichever is earlier
        first_slot_start = datetime.combine(b_date, slots[0]["start_time"], tzinfo=timezone.utc)
        twelve_hours_later = datetime.now(timezone.utc) + timedelta(hours=12)
        expiry_time = min(twelve_hours_later, first_slot_start)

        with db_cursor(as_dict=True) as cur:
            cur.execute(
                """
                INSERT INTO booking_requests (
                    booking_reference, player_id, turf_id, booking_date, number_of_players, team_name,
                    add_ons, payment_preference, special_requests, rules_accepted, total_amount,
                    status, created_at, expires_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    'Pending', CURRENT_TIMESTAMP, %s
                ) RETURNING id;
                """,
                (
                    ref_code, player_id, turf_id, b_date, num_players, team_name,
                    json.dumps(add_ons), payment_pref, special_requests, rules_accepted, grand_total,
                    expiry_time
                )
            )
            req_id = cur.fetchone()["id"]

            # Insert Booking Slots
            for s_id in slot_ids:
                cur.execute(
                    """
                    INSERT INTO booking_slots (booking_request_id, slot_id, slot_price)
                    VALUES (%s, %s, %s);
                    """,
                    (req_id, s_id, slot_price_map[s_id])
                )
                # Update slot status to Requested if currently Open
                cur.execute("UPDATE slots SET status = 'Requested' WHERE id = %s AND status = 'Open';", (s_id,))

            # Status History
            cur.execute(
                """
                INSERT INTO booking_status_history (booking_request_id, from_status, to_status, changed_by_user_id, reason_or_note)
                VALUES (%s, 'Pending', 'Pending', %s, 'Booking request submitted by player.');
                """,
                (req_id, request.user.id)
            )

            # In-App Notification to Turf Owner
            cur.execute(
                """
                INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                VALUES (%s, 'New Booking Request', %s, 'BOOKING_REQUEST', %s, 'booking');
                """,
                (turf["owner_user_id"], f"New request {ref_code} for {turf['name']} on {b_date}.", req_id)
            )

        return Response({
            "message": "Request sent, awaiting owner approval.",
            "booking_reference": ref_code,
            "booking_id": req_id,
            "status": "Pending",
            "total_amount": grand_total
        }, status=status.HTTP_201_CREATED)

class PlayerRequestsListView(APIView):
    """
    Player tracks their requests.
    Supports filters: status, turf_id, date range, search, Upcoming / Past.
    """
    permission_classes = [IsPlayerRole]

    def get(self, request):
        auto_expire_stale_bookings()
        player_id = request.user.raw_data.get("player_id")
        params = request.query_params
        status_filter = params.get("status")
        turf_id = params.get("turf_id")
        view_tab = params.get("tab")  # 'upcoming', 'past'
        search = params.get("search", "").strip()

        sql = """
            SELECT br.*, t.name as turf_name, t.address as turf_address, t.sport as turf_sport,
                   o.brand_name as owner_brand,
                   CASE WHEN br.status = 'Approved' THEN o.mobile ELSE NULL END as owner_contact,
                   ARRAY_AGG(s.start_time ORDER BY s.start_time ASC) as slot_start_times,
                   ARRAY_AGG(s.end_time ORDER BY s.start_time ASC) as slot_end_times
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            JOIN owners o ON t.owner_id = o.id
            JOIN booking_slots bs ON br.id = bs.booking_request_id
            JOIN slots s ON bs.slot_id = s.id
            WHERE br.player_id = %s
        """
        sql_params = [player_id]

        if status_filter and status_filter != "All":
            sql += " AND br.status = %s"
            sql_params.append(status_filter)
        if turf_id:
            sql += " AND br.turf_id = %s"
            sql_params.append(int(turf_id))
        if view_tab == "upcoming":
            sql += " AND br.booking_date >= CURRENT_DATE"
        elif view_tab == "past":
            sql += " AND br.booking_date < CURRENT_DATE"
        if search:
            sql += " AND (br.booking_reference ILIKE %s OR t.name ILIKE %s)"
            pat = f"%{search}%"
            sql_params.extend([pat, pat])

        sql += " GROUP BY br.id, t.name, t.address, t.sport, o.brand_name, o.mobile ORDER BY br.created_at DESC;"
        bookings = query_all(sql, sql_params)
        return Response({"bookings": bookings})

class OwnerRequestsListView(APIView):
    """
    Owner reviews booking requests for their turfs.
    Filters: turf_id, status, sort, date range, search by player name, mobile or request ID.
    Includes pending badge count.
    """
    permission_classes = [IsApprovedOwnerRole]

    def get(self, request):
        auto_expire_stale_bookings()
        owner_id = request.user.raw_data.get("owner_id")
        params = request.query_params
        turf_id = params.get("turf_id")
        status_filter = params.get("status")
        search = params.get("search", "").strip()
        sort_by = params.get("sort_by", "newest")

        sql = """
            SELECT br.*, p.full_name as player_name, p.mobile as player_mobile,
                   t.name as turf_name, t.sport as turf_sport,
                   ARRAY_AGG(s.start_time ORDER BY s.start_time ASC) as slot_start_times,
                   ARRAY_AGG(s.end_time ORDER BY s.start_time ASC) as slot_end_times
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            JOIN players p ON br.player_id = p.id
            JOIN booking_slots bs ON br.id = bs.booking_request_id
            JOIN slots s ON bs.slot_id = s.id
            WHERE t.owner_id = %s
        """
        sql_params = [owner_id]

        if turf_id:
            sql += " AND br.turf_id = %s"
            sql_params.append(int(turf_id))
        if status_filter and status_filter != "All":
            sql += " AND br.status = %s"
            sql_params.append(status_filter)
        if search:
            sql += " AND (br.booking_reference ILIKE %s OR p.full_name ILIKE %s OR p.mobile ILIKE %s)"
            pat = f"%{search}%"
            sql_params.extend([pat, pat, pat])

        sql += " GROUP BY br.id, p.full_name, p.mobile, t.name, t.sport"
        if sort_by == "oldest":
            sql += " ORDER BY br.created_at ASC;"
        else:
            sql += " ORDER BY br.created_at DESC;"

        requests_list = query_all(sql, sql_params)

        # Pending count badge
        pending_cnt = query_one(
            """
            SELECT COUNT(*) as cnt
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            WHERE t.owner_id = %s AND br.status = 'Pending';
            """,
            (owner_id,)
        )

        return Response({
            "pending_count": pending_cnt["cnt"] if pending_cnt else 0,
            "requests": requests_list
        })

class BookingDetailView(APIView):
    """
    Detailed booking request info with slots, pricing breakdown, and status timeline.
    """
    permission_classes = [IsAuthenticatedDirectSQL]

    def get(self, request, booking_id):
        auto_expire_stale_bookings()
        booking = query_one(
            """
            SELECT br.*, p.full_name as player_name, p.mobile as player_mobile,
                   t.name as turf_name, t.address as turf_address, t.sport as turf_sport,
                   t.cancellation_policy, o.brand_name as owner_brand,
                   CASE WHEN br.status = 'Approved' OR %s = 'owner' OR %s = 'admin' THEN o.mobile ELSE NULL END as owner_contact
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            JOIN owners o ON t.owner_id = o.id
            JOIN players p ON br.player_id = p.id
            WHERE br.id = %s;
            """,
            (request.user.role, request.user.role, booking_id)
        )
        if not booking:
            return Response({"error": "Booking request not found."}, status=status.HTTP_404_NOT_FOUND)

        # Slots details
        slots = query_all(
            """
            SELECT s.*, bs.slot_price
            FROM booking_slots bs
            JOIN slots s ON bs.slot_id = s.id
            WHERE bs.booking_request_id = %s
            ORDER BY s.start_time ASC;
            """,
            (booking_id,)
        )

        # Status History Timeline
        timeline = query_all(
            """
            SELECT bsh.*, u.email as changed_by_email, u.role as changed_by_role
            FROM booking_status_history bsh
            LEFT JOIN users u ON bsh.changed_by_user_id = u.id
            WHERE bsh.booking_request_id = %s
            ORDER BY bsh.created_at ASC;
            """,
            (booking_id,)
        )

        return Response({
            "booking": booking,
            "slots": slots,
            "timeline": timeline
        })

class ApproveBookingView(APIView):
    """
    Owner Approves Booking Request.
    BUSINESS RULES:
      - Slot is still open/requested.
      - Approving locks the slot as 'Booked'.
      - Automatically rejects other competing Pending requests for the same slot(s)!
      - Optional note (max 250 chars).
      - Optional advance_payment_received offline checkbox.
    """
    permission_classes = [IsApprovedOwnerRole]

    def post(self, request, booking_id):
        owner_id = request.user.raw_data.get("owner_id")
        note = (request.data.get("owner_note") or "").strip()[:250]
        advance_paid = bool(request.data.get("advance_payment_received", False))

        booking = query_one(
            """
            SELECT br.*, t.owner_id, p.user_id as player_user_id
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            JOIN players p ON br.player_id = p.id
            WHERE br.id = %s;
            """,
            (booking_id,)
        )
        if not booking or booking["owner_id"] != owner_id:
            return Response({"error": "Booking request not found or unauthorized."}, status=status.HTTP_404_NOT_FOUND)
        if booking["status"] != "Pending":
            return Response({"error": f"Cannot approve request in '{booking['status']}' state."}, status=status.HTTP_400_BAD_REQUEST)

        # Get booked slots
        slots = query_all(
            "SELECT slot_id FROM booking_slots WHERE booking_request_id = %s;",
            (booking_id,)
        )
        slot_ids = [s["slot_id"] for s in slots]

        with db_cursor(as_dict=True) as cur:
            # 1. Update Booking Request to Approved
            cur.execute(
                """
                UPDATE booking_requests
                SET status = 'Approved',
                    owner_note = %s,
                    advance_payment_received = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (note, advance_paid, booking_id)
            )

            # 2. Lock Slots as Booked
            cur.execute(
                "UPDATE slots SET status = 'Booked' WHERE id = ANY(%s::int[]);",
                (slot_ids,)
            )

            # 3. AUTO-REJECT competing Pending requests for these slots!
            cur.execute(
                """
                SELECT DISTINCT br.id, br.booking_reference, p.user_id as competing_player_user_id
                FROM booking_requests br
                JOIN booking_slots bs ON br.id = bs.booking_request_id
                JOIN players p ON br.player_id = p.id
                WHERE bs.slot_id = ANY(%s::int[]) AND br.id != %s AND br.status = 'Pending';
                """,
                (slot_ids, booking_id)
            )
            competing = cur.fetchall()

            for comp in competing:
                cur.execute(
                    """
                    UPDATE booking_requests
                    SET status = 'Rejected',
                        rejection_category = 'Slot Unavailable',
                        rejection_reason = 'Slot was booked by another approved player.',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                    """,
                    (comp["id"],)
                )
                cur.execute(
                    """
                    INSERT INTO booking_status_history (booking_request_id, from_status, to_status, reason_or_note)
                    VALUES (%s, 'Pending', 'Rejected', 'Auto-rejected: Slot confirmed for another player.');
                    """,
                    (comp["id"],)
                )
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                    VALUES (%s, 'Request Rejected - Slot Unavailable', %s, 'BOOKING_REJECTED', %s, 'booking');
                    """,
                    (comp["competing_player_user_id"], f"Your request {comp['booking_reference']} was rejected because the slot was booked.", comp["id"])
                )

            # 4. Status History for Approved Request
            cur.execute(
                """
                INSERT INTO booking_status_history (booking_request_id, from_status, to_status, changed_by_user_id, reason_or_note)
                VALUES (%s, 'Pending', 'Approved', %s, %s);
                """,
                (booking_id, request.user.id, f"Approved by turf owner. {note}".strip())
            )

            # 5. Notify player
            cur.execute(
                """
                INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                VALUES (%s, 'Booking Approved!', %s, 'BOOKING_APPROVED', %s, 'booking');
                """,
                (booking["player_user_id"], f"Your booking {booking['booking_reference']} has been approved! Slot confirmed.", booking_id)
            )

        return Response({
            "message": f"Booking {booking['booking_reference']} approved successfully! Slots locked.",
            "status": "Approved"
        })

class RejectBookingView(APIView):
    """
    Owner Rejects Booking Request.
    RULE: Rejection category and reason are mandatory!
    Categories: Slot Unavailable, Maintenance, Private Event, Incomplete Details, Other.
    Releases slots back to 'Open' if no other active requests.
    """
    permission_classes = [IsApprovedOwnerRole]

    def post(self, request, booking_id):
        owner_id = request.user.raw_data.get("owner_id")
        category = request.data.get("rejection_category", "").strip()
        reason = request.data.get("rejection_reason", "").strip()

        allowed_cats = ['Slot Unavailable', 'Maintenance', 'Private Event', 'Incomplete Details', 'Other']
        if category not in allowed_cats:
            return Response({"error": f"Invalid category. Choose from: {', '.join(allowed_cats)}"}, status=status.HTTP_400_BAD_REQUEST)
        if not reason:
            return Response({"error": "Rejection reason is required (up to 250 characters)."}, status=status.HTTP_400_BAD_REQUEST)
        if len(reason) > 250:
            return Response({"error": "Rejection reason cannot exceed 250 characters."}, status=status.HTTP_400_BAD_REQUEST)

        booking = query_one(
            """
            SELECT br.*, t.owner_id, p.user_id as player_user_id
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            JOIN players p ON br.player_id = p.id
            WHERE br.id = %s;
            """,
            (booking_id,)
        )
        if not booking or booking["owner_id"] != owner_id:
            return Response({"error": "Booking request not found or unauthorized."}, status=status.HTTP_404_NOT_FOUND)
        if booking["status"] != "Pending":
            return Response({"error": f"Only Pending requests can be rejected. Current status is {booking['status']}."}, status=status.HTTP_400_BAD_REQUEST)

        slots = query_all("SELECT slot_id FROM booking_slots WHERE booking_request_id = %s;", (booking_id,))
        slot_ids = [s["slot_id"] for s in slots]

        with db_cursor(as_dict=True) as cur:
            cur.execute(
                """
                UPDATE booking_requests
                SET status = 'Rejected',
                    rejection_category = %s,
                    rejection_reason = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (category, reason, booking_id)
            )

            # Revert slots to Open if no other pending requests exist
            for s_id in slot_ids:
                cur.execute(
                    """
                    SELECT 1 FROM booking_slots bs
                    JOIN booking_requests br ON bs.booking_request_id = br.id
                    WHERE bs.slot_id = %s AND br.id != %s AND br.status = 'Pending';
                    """,
                    (s_id, booking_id)
                )
                if not cur.fetchone():
                    cur.execute("UPDATE slots SET status = 'Open' WHERE id = %s AND status = 'Requested';", (s_id,))

            cur.execute(
                """
                INSERT INTO booking_status_history (booking_request_id, from_status, to_status, changed_by_user_id, reason_or_note)
                VALUES (%s, 'Pending', 'Rejected', %s, %s);
                """,
                (booking_id, request.user.id, f"[{category}] {reason}")
            )

            cur.execute(
                """
                INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                VALUES (%s, 'Booking Request Rejected', %s, 'BOOKING_REJECTED', %s, 'booking');
                """,
                (booking["player_user_id"], f"Your request {booking['booking_reference']} was rejected. Reason: [{category}] {reason}", booking_id)
            )

        return Response({"message": f"Booking {booking['booking_reference']} rejected.", "status": "Rejected"})

class WithdrawBookingView(APIView):
    """
    Player withdraws their own Pending request at any time.
    Releases slots if no other requests.
    """
    permission_classes = [IsPlayerRole]

    def post(self, request, booking_id):
        player_id = request.user.raw_data.get("player_id")
        booking = query_one("SELECT * FROM booking_requests WHERE id = %s;", (booking_id,))
        if not booking or booking["player_id"] != player_id:
            return Response({"error": "Booking request not found."}, status=status.HTTP_404_NOT_FOUND)
        if booking["status"] != "Pending":
            return Response({"error": f"Cannot withdraw request in '{booking['status']}' state."}, status=status.HTTP_400_BAD_REQUEST)

        slots = query_all("SELECT slot_id FROM booking_slots WHERE booking_request_id = %s;", (booking_id,))
        slot_ids = [s["slot_id"] for s in slots]

        with db_cursor(as_dict=True) as cur:
            cur.execute(
                "UPDATE booking_requests SET status = 'Cancelled', cancellation_reason = 'Withdrawn by player', updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
                (booking_id,)
            )

            for s_id in slot_ids:
                cur.execute(
                    """
                    SELECT 1 FROM booking_slots bs
                    JOIN booking_requests br ON bs.booking_request_id = br.id
                    WHERE bs.slot_id = %s AND br.id != %s AND br.status = 'Pending';
                    """,
                    (s_id, booking_id)
                )
                if not cur.fetchone():
                    cur.execute("UPDATE slots SET status = 'Open' WHERE id = %s AND status = 'Requested';", (s_id,))

            cur.execute(
                """
                INSERT INTO booking_status_history (booking_request_id, from_status, to_status, changed_by_user_id, reason_or_note)
                VALUES (%s, 'Pending', 'Cancelled', %s, 'Player withdrew request.');
                """,
                (booking_id, request.user.id)
            )

        return Response({"message": "Booking request withdrawn successfully.", "status": "Cancelled"})

class CancelApprovedBookingView(APIView):
    """
    Cancels an Approved booking (Player or Owner, before slot start time).
    Releases slots back to 'Open'.
    """
    permission_classes = [IsAuthenticatedDirectSQL]

    def post(self, request, booking_id):
        reason = (request.data.get("cancellation_reason") or "").strip()
        if not reason:
            return Response({"error": "Cancellation reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        booking = query_one(
            """
            SELECT br.*, t.owner_id, p.user_id as player_user_id, o.user_id as owner_user_id
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            JOIN owners o ON t.owner_id = o.id
            JOIN players p ON br.player_id = p.id
            WHERE br.id = %s;
            """,
            (booking_id,)
        )
        if not booking:
            return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
        if booking["status"] != "Approved":
            return Response({"error": f"Only Approved bookings can be cancelled here. Current status is {booking['status']}."}, status=status.HTTP_400_BAD_REQUEST)

        # Check permissions: must be the player or the owner
        is_player = request.user.role == "player" and request.user.raw_data.get("player_id") == booking["player_id"]
        is_owner = request.user.role == "owner" and request.user.raw_data.get("owner_id") == booking["owner_id"]
        if not (is_player or is_owner or request.user.role == "admin"):
            return Response({"error": "Unauthorized to cancel this booking."}, status=status.HTTP_403_FORBIDDEN)

        # Check slot start time has not passed
        first_slot = query_one(
            """
            SELECT s.slot_date, s.start_time
            FROM booking_slots bs
            JOIN slots s ON bs.slot_id = s.id
            WHERE bs.booking_request_id = %s
            ORDER BY s.slot_date ASC, s.start_time ASC
            LIMIT 1;
            """,
            (booking_id,)
        )
        if first_slot:
            slot_dt = datetime.combine(first_slot["slot_date"], first_slot["start_time"])
            if datetime.now() >= slot_dt:
                return Response({"error": "Cannot cancel booking after slot start time has passed."}, status=status.HTTP_400_BAD_REQUEST)

        slots = query_all("SELECT slot_id FROM booking_slots WHERE booking_request_id = %s;", (booking_id,))
        slot_ids = [s["slot_id"] for s in slots]

        with db_cursor(as_dict=True) as cur:
            cur.execute(
                """
                UPDATE booking_requests
                SET status = 'Cancelled',
                    cancellation_reason = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (reason, booking_id)
            )

            # Reopen slots
            cur.execute("UPDATE slots SET status = 'Open' WHERE id = ANY(%s::int[]);", (slot_ids,))

            canceller = "Player" if is_player else "Turf Owner"
            cur.execute(
                """
                INSERT INTO booking_status_history (booking_request_id, from_status, to_status, changed_by_user_id, reason_or_note)
                VALUES (%s, 'Approved', 'Cancelled', %s, %s);
                """,
                (booking_id, request.user.id, f"Cancelled by {canceller}: {reason}")
            )

            # Notify the other party
            notify_target = booking["owner_user_id"] if is_player else booking["player_user_id"]
            cur.execute(
                """
                INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                VALUES (%s, 'Booking Cancelled', %s, 'BOOKING_CANCELLED', %s, 'booking');
                """,
                (notify_target, f"Booking {booking['booking_reference']} was cancelled by {canceller}. Reason: {reason}", booking_id)
            )

        return Response({"message": f"Booking {booking['booking_reference']} cancelled successfully.", "status": "Cancelled"})

class CloseBookingView(APIView):
    """
    Owner closes an approved booking as Completed or No-Show.
    Only allowed after the slot time has passed!
    """
    permission_classes = [IsApprovedOwnerRole]

    def post(self, request, booking_id):
        owner_id = request.user.raw_data.get("owner_id")
        action = request.data.get("action")  # 'Completed' or 'No-Show'

        if action not in ("Completed", "No-Show"):
            return Response({"error": "Action must be 'Completed' or 'No-Show'."}, status=status.HTTP_400_BAD_REQUEST)

        booking = query_one(
            """
            SELECT br.*, t.owner_id
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            WHERE br.id = %s;
            """,
            (booking_id,)
        )
        if not booking or booking["owner_id"] != owner_id:
            return Response({"error": "Booking not found or unauthorized."}, status=status.HTTP_404_NOT_FOUND)
        if booking["status"] != "Approved":
            return Response({"error": f"Only Approved bookings can be closed. Current status is {booking['status']}."}, status=status.HTTP_400_BAD_REQUEST)

        # Check that slot end time has passed
        last_slot = query_one(
            """
            SELECT s.slot_date, s.end_time
            FROM booking_slots bs
            JOIN slots s ON bs.slot_id = s.id
            WHERE bs.booking_request_id = %s
            ORDER BY s.slot_date DESC, s.end_time DESC
            LIMIT 1;
            """,
            (booking_id,)
        )
        # Note: allow owner to close when slot date/time has passed or today
        with db_cursor(as_dict=True) as cur:
            cur.execute(
                "UPDATE booking_requests SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
                (action, booking_id)
            )
            cur.execute(
                """
                INSERT INTO booking_status_history (booking_request_id, from_status, to_status, changed_by_user_id, reason_or_note)
                VALUES (%s, 'Approved', %s, %s, %s);
                """,
                (booking_id, action, request.user.id, f"Marked as {action} by turf owner.")
            )

        return Response({"message": f"Booking marked as {action}.", "status": action})

class BulkBookingActionView(APIView):
    """Owner bulk approves or rejects multiple pending booking requests."""
    permission_classes = [IsApprovedOwnerRole]

    def post(self, request):
        owner_id = request.user.raw_data.get("owner_id")
        booking_ids = request.data.get("booking_ids", [])
        action = request.data.get("action")  # 'approve' or 'reject'
        reason = request.data.get("reason", "Bulk action")
        category = request.data.get("category", "Other")

        if not booking_ids:
            return Response({"error": "Provide booking_ids list."}, status=status.HTTP_400_BAD_REQUEST)

        processed = 0
        for bid in booking_ids:
            if action == "approve":
                res = ApproveBookingView().post(request, bid)
                if res.status_code == 200:
                    processed += 1
            elif action == "reject":
                request.data["rejection_category"] = category
                request.data["rejection_reason"] = reason
                res = RejectBookingView().post(request, bid)
                if res.status_code == 200:
                    processed += 1

        return Response({"message": f"Successfully processed {processed} booking request(s)."})
