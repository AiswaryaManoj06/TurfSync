"""
Slot Management Views (Strict Direct SQL - NO ORM)
Handles slot creation with recurrence (Daily, Weekly, Custom), non-overlapping validations,
operating hours boundary checks, blocking with reason, and calendar color-coding.
"""
from datetime import datetime, date, time, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from utilities.permissions import IsApprovedOwnerRole
from database.connection import query_all, query_one, execute_insert, execute_update, db_cursor

def time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute

def minutes_to_time(m: int) -> time:
    return time(hour=(m // 60) % 24, minute=m % 60)

class SlotsListView(APIView):
    """
    List slots for a specific turf on a given date or date range.
    Supports filtering by status and price.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        params = request.query_params
        turf_id = params.get("turf_id")
        slot_date = params.get("date")
        start_date = params.get("start_date")
        end_date = params.get("end_date")
        status_filter = params.get("status")

        if not turf_id:
            return Response({"error": "turf_id parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        sql = """
            SELECT s.*, t.name as turf_name, t.weekday_price_per_hour, t.weekend_price_per_hour,
                   t.max_players as turf_max_players,
                   (
                       SELECT br.id FROM booking_slots bs
                       JOIN booking_requests br ON bs.booking_request_id = br.id
                       WHERE bs.slot_id = s.id AND br.status IN ('Pending', 'Approved')
                       LIMIT 1
                   ) as active_booking_request_id
            FROM slots s
            JOIN turfs t ON s.turf_id = t.id
            WHERE s.turf_id = %s
        """
        sql_params = [int(turf_id)]

        if slot_date:
            sql += " AND s.slot_date = %s"
            sql_params.append(slot_date)
        elif start_date and end_date:
            sql += " AND s.slot_date BETWEEN %s AND %s"
            sql_params.extend([start_date, end_date])
        else:
            sql += " AND s.slot_date >= CURRENT_DATE"

        if status_filter and status_filter != "All":
            sql += " AND s.status = %s"
            sql_params.append(status_filter)

        sql += " ORDER BY s.slot_date ASC, s.start_time ASC;"
        slots = query_all(sql, sql_params)

        # Compute effective price for each slot
        for s in slots:
            dt = s["slot_date"]
            is_weekend = dt.weekday() >= 5 if isinstance(dt, (date, datetime)) else False
            base_hourly = s["weekend_price_per_hour"] if is_weekend else s["weekday_price_per_hour"]
            hourly_rate = float(s["price_override"]) if s["price_override"] is not None else float(base_hourly)
            # Adjust by duration
            duration = s["duration_minutes"]
            s["effective_price"] = round(hourly_rate * (duration / 60.0), 2)

        return Response({"slots": slots})

class CreateSlotsView(APIView):
    """
    Creates slots for a turf.
    Supports recurrence: Does Not Repeat, Daily, Weekly (with selected days), Custom.
    Validations:
      - Inside opening hours
      - Not in past
      - End date >= start date; end time > start time
      - Slot max players <= turf max players
      - No overlap on same turf
    """
    permission_classes = [IsApprovedOwnerRole]

    def post(self, request):
        owner_id = request.user.raw_data.get("owner_id")
        data = request.data

        turf_id = data.get("turf_id")
        duration = int(data.get("duration_minutes", 60))
        repeat_type = data.get("repeat_type", "Does Not Repeat")  # 'Does Not Repeat', 'Daily', 'Weekly', 'Custom'
        selected_days = data.get("selected_days", [])  # e.g. [0, 1, 2, 3, 4, 5, 6] where 0=Monday
        start_date_str = data.get("start_date")
        end_date_str = data.get("end_date")
        start_time_str = data.get("start_time")
        end_time_str = data.get("end_time")
        price_override = data.get("price_override")
        max_players_override = data.get("max_players_override")
        is_peak_hour = bool(data.get("is_peak_hour", False))
        initial_status = data.get("status", "Open")

        if not turf_id:
            return Response({"error": "turf_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if duration not in (30, 60, 90):
            return Response({"error": "Duration must be 30, 60, or 90 minutes."}, status=status.HTTP_400_BAD_REQUEST)
        if not start_date_str or not start_time_str or not end_time_str:
            return Response({"error": "Start date, start time, and end time are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify Turf Ownership
        turf = query_one(
            "SELECT id, owner_id, opening_time, closing_time, max_players, status FROM turfs WHERE id = %s;",
            (turf_id,)
        )
        if not turf:
            return Response({"error": "Turf not found."}, status=status.HTTP_404_NOT_FOUND)
        if turf["owner_id"] != owner_id:
            return Response({"error": "You do not own this turf."}, status=status.HTTP_403_FORBIDDEN)
        if turf["status"] != "Active":
            return Response({"error": "Cannot create slots for an Inactive turf."}, status=status.HTTP_400_BAD_REQUEST)

        if max_players_override and int(max_players_override) > turf["max_players"]:
            return Response({"error": f"Slot max players ({max_players_override}) cannot exceed turf max players ({turf['max_players']})."}, status=status.HTTP_400_BAD_REQUEST)

        # Parse Dates and Times
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date() if end_date_str else start_date
            st_time = datetime.strptime(start_time_str, "%H:%M:%S").time() if len(start_time_str) == 8 else datetime.strptime(start_time_str, "%H:%M").time()
            et_time = datetime.strptime(end_time_str, "%H:%M:%S").time() if len(end_time_str) == 8 else datetime.strptime(end_time_str, "%H:%M").time()
        except ValueError as ve:
            return Response({"error": f"Invalid date or time format: {str(ve)}"}, status=status.HTTP_400_BAD_REQUEST)

        if end_date < start_date:
            return Response({"error": "End date must be on or after start date."}, status=status.HTTP_400_BAD_REQUEST)
        if et_time <= st_time:
            return Response({"error": "End time must be later than start time."}, status=status.HTTP_400_BAD_REQUEST)
        if start_date < date.today():
            return Response({"error": "Cannot generate slots in the past."}, status=status.HTTP_400_BAD_REQUEST)

        # Operating hours boundary validation
        if st_time < turf["opening_time"] or et_time > turf["closing_time"]:
            return Response({
                "error": f"Slots must fall within turf opening hours ({turf['opening_time'].strftime('%H:%M')} - {turf['closing_time'].strftime('%H:%M')})."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Build list of dates
        date_list = []
        curr = start_date
        while curr <= end_date:
            if repeat_type == "Does Not Repeat":
                date_list.append(curr)
                break
            elif repeat_type == "Daily":
                date_list.append(curr)
            elif repeat_type == "Weekly":
                if curr.weekday() in selected_days:
                    date_list.append(curr)
            elif repeat_type == "Custom":
                date_list.append(curr)
            curr += timedelta(days=1)

        # Generate individual slot intervals
        st_min = time_to_minutes(st_time)
        et_min = time_to_minutes(et_time)

        slots_to_create = []
        skipped_overlap = 0

        # Query existing slots for this turf across this date range to prevent overlap
        existing_slots = query_all(
            """
            SELECT slot_date, start_time, end_time
            FROM slots
            WHERE turf_id = %s AND slot_date BETWEEN %s AND %s;
            """,
            (turf_id, start_date, end_date)
        )

        def is_overlapping(dt, s_min, e_min):
            for es in existing_slots:
                if es["slot_date"] == dt:
                    es_st = time_to_minutes(es["start_time"])
                    es_et = time_to_minutes(es["end_time"])
                    # Overlap condition: not (end <= es_st or start >= es_et)
                    if max(s_min, es_st) < min(e_min, es_et):
                        return True
            return False

        with db_cursor(as_dict=True) as cur:
            for d in date_list:
                s_cursor = st_min
                while s_cursor + duration <= et_min:
                    e_cursor = s_cursor + duration
                    if is_overlapping(d, s_cursor, e_cursor):
                        skipped_overlap += 1
                    else:
                        slot_st = minutes_to_time(s_cursor)
                        slot_et = minutes_to_time(e_cursor)
                        cur.execute(
                            """
                            INSERT INTO slots (
                                turf_id, slot_date, start_time, end_time, duration_minutes,
                                price_override, max_players_override, is_peak_hour, status
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                            """,
                            (
                                turf_id, d, slot_st, slot_et, duration,
                                float(price_override) if price_override else None,
                                int(max_players_override) if max_players_override else None,
                                is_peak_hour, initial_status
                            )
                        )
                        # Add to existing_slots list in memory to avoid overlap within same batch
                        existing_slots.append({"slot_date": d, "start_time": slot_st, "end_time": slot_et})
                        slots_to_create.append({"date": d, "start": slot_st, "end": slot_et})
                    s_cursor = e_cursor

        return Response({
            "message": f"Successfully created {len(slots_to_create)} slot(s).",
            "created_count": len(slots_to_create),
            "skipped_overlaps": skipped_overlap
        }, status=status.HTTP_201_CREATED)

class BlockSlotView(APIView):
    """
    Blocks a slot or range of slots for maintenance, holidays, or private events.
    Reason required (max 100 chars).
    RULE: Slot with an approved booking cannot be blocked!
    """
    permission_classes = [IsApprovedOwnerRole]

    def post(self, request):
        owner_id = request.user.raw_data.get("owner_id")
        slot_id = request.data.get("slot_id")
        reason = (request.data.get("block_reason") or "").strip()

        if not slot_id:
            return Response({"error": "slot_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not reason:
            return Response({"error": "A block reason is required (e.g. Turf Maintenance, Private Event, Holiday)."}, status=status.HTTP_400_BAD_REQUEST)
        if len(reason) > 100:
            return Response({"error": "Block reason cannot exceed 100 characters."}, status=status.HTTP_400_BAD_REQUEST)

        slot = query_one(
            """
            SELECT s.*, t.owner_id
            FROM slots s
            JOIN turfs t ON s.turf_id = t.id
            WHERE s.id = %s;
            """,
            (slot_id,)
        )
        if not slot:
            return Response({"error": "Slot not found."}, status=status.HTTP_404_NOT_FOUND)
        if slot["owner_id"] != owner_id:
            return Response({"error": "You do not own the turf for this slot."}, status=status.HTTP_403_FORBIDDEN)

        # Check if slot has an approved booking
        has_approved = query_one(
            """
            SELECT br.id, br.booking_reference
            FROM booking_slots bs
            JOIN booking_requests br ON bs.booking_request_id = br.id
            WHERE bs.slot_id = %s AND br.status = 'Approved';
            """,
            (slot_id,)
        )
        if has_approved:
            return Response({
                "error": f"Cannot block this slot because an approved booking ({has_approved['booking_reference']}) exists for it. Cancel the booking first."
            }, status=status.HTTP_400_BAD_REQUEST)

        execute_update(
            "UPDATE slots SET status = 'Blocked', block_reason = %s WHERE id = %s;",
            (reason, slot_id)
        )
        return Response({"message": f"Slot successfully blocked for: {reason}."})

class UnblockSlotView(APIView):
    """Unblocks a blocked slot, returning its status to Open."""
    permission_classes = [IsApprovedOwnerRole]

    def post(self, request, slot_id):
        owner_id = request.user.raw_data.get("owner_id")
        slot = query_one(
            """
            SELECT s.id, t.owner_id
            FROM slots s
            JOIN turfs t ON s.turf_id = t.id
            WHERE s.id = %s;
            """,
            (slot_id,)
        )
        if not slot or slot["owner_id"] != owner_id:
            return Response({"error": "Slot not found or unauthorized."}, status=status.HTTP_404_NOT_FOUND)

        execute_update("UPDATE slots SET status = 'Open', block_reason = NULL WHERE id = %s;", (slot_id,))
        return Response({"message": "Slot is now Open."})

class DeleteSlotView(APIView):
    """
    Deletes a slot.
    RULE: A slot with an approved booking cannot be deleted until that booking is cancelled!
    """
    permission_classes = [IsApprovedOwnerRole]

    def delete(self, request, slot_id):
        owner_id = request.user.raw_data.get("owner_id")
        slot = query_one(
            """
            SELECT s.*, t.owner_id
            FROM slots s
            JOIN turfs t ON s.turf_id = t.id
            WHERE s.id = %s;
            """,
            (slot_id,)
        )
        if not slot:
            return Response({"error": "Slot not found."}, status=status.HTTP_404_NOT_FOUND)
        if slot["owner_id"] != owner_id:
            return Response({"error": "You do not own this slot."}, status=status.HTTP_403_FORBIDDEN)

        # Check approved booking
        approved_booking = query_one(
            """
            SELECT br.booking_reference
            FROM booking_slots bs
            JOIN booking_requests br ON bs.booking_request_id = br.id
            WHERE bs.slot_id = %s AND br.status = 'Approved';
            """,
            (slot_id,)
        )
        if approved_booking:
            return Response({
                "error": f"Cannot delete slot: it is reserved by approved booking {approved_booking['booking_reference']}."
            }, status=status.HTTP_400_BAD_REQUEST)

        execute_update("DELETE FROM slots WHERE id = %s;", (slot_id,))
        return Response({"message": "Slot deleted successfully."})
