"""
Turf Management Views (Strict Direct SQL - NO ORM)
Handles Turf CRUD, validation rules, blocking deletion on upcoming approved bookings,
and player turf discovery search.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from utilities.permissions import IsApprovedOwnerRole, IsAuthenticatedDirectSQL
from database.connection import query_all, query_one, execute_insert, execute_update, db_cursor

class TurfListCreateView(APIView):
    """
    GET: List turfs.
      - If requested by an authenticated Owner: returns only their own turfs (filtered by sport, city, status).
      - If requested by Player / Anonymous: returns active turfs with filters (sport, city, state, price range, turf_type, size, amenities).
    POST: Create a turf (Approved Owner only).
    """
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsApprovedOwnerRole()]
        return [AllowAny()]

    def get(self, request):
        params = request.query_params
        user = getattr(request, "user", None)
        is_owner_view = bool(user and user.is_authenticated and user.role == "owner")

        if is_owner_view:
            # Owner sees only their own turfs
            owner_id = user.raw_data.get("owner_id")
            sport = params.get("sport")
            city_id = params.get("city_id")
            status_filter = params.get("status")

            sql = """
                SELECT t.*, s.name as state_name, c.name as city_name,
                       (SELECT COUNT(*) FROM slots sl WHERE sl.turf_id = t.id AND sl.slot_date >= CURRENT_DATE) as active_slots_count,
                       (SELECT COUNT(*) FROM booking_requests br WHERE br.turf_id = t.id AND br.status = 'Pending') as pending_requests_count
                FROM turfs t
                LEFT JOIN states s ON t.state_id = s.id
                LEFT JOIN cities c ON t.city_id = c.id
                WHERE t.owner_id = %s
            """
            sql_params = [owner_id]
            if sport and sport != "All":
                sql += " AND t.sport = %s"
                sql_params.append(sport)
            if city_id:
                sql += " AND t.city_id = %s"
                sql_params.append(int(city_id))
            if status_filter and status_filter != "All":
                sql += " AND t.status = %s"
                sql_params.append(status_filter)

            sql += " ORDER BY t.created_at DESC;"
            turfs = query_all(sql, sql_params)
            return Response({"turfs": turfs})

        else:
            # Player discovery: Only show Active turfs whose owners are Approved (not Suspended!)
            state_id = params.get("state_id")
            city_id = params.get("city_id")
            sport = params.get("sport")
            turf_size = params.get("size")
            turf_type = params.get("turf_type")
            min_price = params.get("min_price")
            max_price = params.get("max_price")
            search = params.get("search", "").strip()
            sort_by = params.get("sort_by", "newest")
            booking_date = params.get("date")

            sql = """
                SELECT t.*, o.brand_name as owner_brand, o.full_name as owner_name,
                       s.name as state_name, c.name as city_name,
                       (SELECT COUNT(*) FROM slots sl WHERE sl.turf_id = t.id AND sl.slot_date = %s AND sl.status = 'Open') as available_slots_today
                FROM turfs t
                JOIN owners o ON t.owner_id = o.id
                LEFT JOIN states s ON t.state_id = s.id
                LEFT JOIN cities c ON t.city_id = c.id
                WHERE t.status = 'Active' AND o.account_status = 'Approved'
            """
            from datetime import date as dt_date
            target_date = booking_date if booking_date else dt_date.today()
            sql_params = [target_date]

            if state_id:
                sql += " AND t.state_id = %s"
                sql_params.append(int(state_id))
            if city_id:
                sql += " AND t.city_id = %s"
                sql_params.append(int(city_id))
            if sport and sport != "All":
                sql += " AND t.sport = %s"
                sql_params.append(sport)
            if turf_size and turf_size != "All":
                sql += " AND t.size = %s"
                sql_params.append(turf_size)
            if turf_type and turf_type != "Any":
                sql += " AND t.turf_type = %s"
                sql_params.append(turf_type)
            if min_price:
                sql += " AND t.weekday_price_per_hour >= %s"
                sql_params.append(float(min_price))
            if max_price:
                sql += " AND t.weekday_price_per_hour <= %s"
                sql_params.append(float(max_price))
            if search:
                sql += " AND (t.name ILIKE %s OR o.brand_name ILIKE %s OR t.address ILIKE %s)"
                pattern = f"%{search}%"
                sql_params.extend([pattern, pattern, pattern])

            if sort_by == "price_low":
                sql += " ORDER BY t.weekday_price_per_hour ASC"
            elif sort_by == "price_high":
                sql += " ORDER BY t.weekday_price_per_hour DESC"
            else:
                sql += " ORDER BY t.created_at DESC"

            turfs = query_all(sql, sql_params)
            return Response({"turfs": turfs})

    def post(self, request):
        owner_id = request.user.raw_data.get("owner_id")
        data = request.data

        name = data.get("name", "").strip()
        address = data.get("address", "").strip()
        landmark = data.get("landmark", "").strip() or None
        contact_number = data.get("contact_number", "").strip()
        google_maps_link = data.get("google_maps_link", "").strip() or None
        description = data.get("description", "").strip() or None
        rules = data.get("rules", "").strip() or None
        cancellation_policy = data.get("cancellation_policy", "").strip() or "Full refund if cancelled at least 24 hours prior to slot start time."
        sport = data.get("sport", "").strip()
        surface = data.get("surface", "").strip()
        size = data.get("size", "").strip()
        state_id = data.get("state_id")
        city_id = data.get("city_id")
        pincode = data.get("pincode", "").strip()
        weekday_price = data.get("weekday_price_per_hour")
        weekend_price = data.get("weekend_price_per_hour")
        max_players = data.get("max_players")
        advance_limit = data.get("advance_booking_limit_days", 30)
        opening_time = data.get("opening_time")
        closing_time = data.get("closing_time")
        turf_type = data.get("turf_type", "Outdoor")
        status_val = data.get("status", "Active")
        amenities = data.get("amenities", [])
        if isinstance(amenities, str):
            amenities = [a.strip() for a in amenities.split(",") if a.strip()]

        photos = data.get("photos", [])
        if isinstance(photos, str):
            photos = [p.strip() for p in photos.split(",") if p.strip()]

        # Validations
        if not name or not address or not contact_number:
            return Response({"error": "Name, address, and 10-digit contact number are required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(contact_number) != 10 or not contact_number.isdigit():
            return Response({"error": "Contact number must be exactly 10 digits."}, status=status.HTTP_400_BAD_REQUEST)
        if not state_id or not city_id:
            return Response({"error": "State and City are required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(pincode) != 6 or not pincode.isdigit():
            return Response({"error": "Pincode must be exactly 6 digits."}, status=status.HTTP_400_BAD_REQUEST)
        if not weekday_price or float(weekday_price) <= 0:
            return Response({"error": "Weekday price must be a positive number."}, status=status.HTTP_400_BAD_REQUEST)
        if not weekend_price or float(weekend_price) <= 0:
            return Response({"error": "Weekend price must be a positive number."}, status=status.HTTP_400_BAD_REQUEST)
        if not max_players or int(max_players) <= 0:
            return Response({"error": "Max players must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)
        if not opening_time or not closing_time:
            return Response({"error": "Opening and closing times are required."}, status=status.HTTP_400_BAD_REQUEST)
        if closing_time <= opening_time:
            return Response({"error": "Closing time must be later than opening time."}, status=status.HTTP_400_BAD_REQUEST)
        if not photos or len(photos) == 0:
            return Response({"error": "At least 1 turf photo is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Check unique turf name per owner and city
        existing = query_one(
            "SELECT id FROM turfs WHERE owner_id = %s AND city_id = %s AND LOWER(name) = LOWER(%s);",
            (owner_id, city_id, name)
        )
        if existing:
            return Response({"error": "You already have a turf with this name in the selected city."}, status=status.HTTP_400_BAD_REQUEST)

        insert_sql = """
            INSERT INTO turfs (
                owner_id, name, address, landmark, contact_number, google_maps_link,
                description, rules, cancellation_policy, sport, surface, size,
                state_id, city_id, pincode, weekday_price_per_hour, weekend_price_per_hour,
                max_players, advance_booking_limit_days, opening_time, closing_time,
                turf_type, booking_approval_mode, amenities, status, photos
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, 'Manual', %s, %s, %s
            ) RETURNING id;
        """
        params = (
            owner_id, name, address, landmark, contact_number, google_maps_link,
            description, rules, cancellation_policy, sport, surface, size,
            state_id, city_id, pincode, float(weekday_price), float(weekend_price),
            int(max_players), int(advance_limit), opening_time, closing_time,
            turf_type, amenities, status_val, photos
        )
        new_id = execute_insert(insert_sql, params, returning="id")
        return Response({"message": "Turf created successfully!", "turf_id": new_id}, status=status.HTTP_201_CREATED)

class TurfDetailView(APIView):
    """
    GET: Retrieve single turf details.
    PUT: Update turf details (Owner only).
    DELETE: Delete turf (Owner only, BLOCKED if upcoming approved bookings exist).
    """
    def get_permissions(self):
        if self.request.method in ("PUT", "DELETE"):
            return [IsApprovedOwnerRole()]
        return [AllowAny()]

    def get(self, request, turf_id):
        turf = query_one(
            """
            SELECT t.*, o.brand_name as owner_brand, o.full_name as owner_name, o.mobile as owner_mobile,
                   s.name as state_name, c.name as city_name
            FROM turfs t
            JOIN owners o ON t.owner_id = o.id
            LEFT JOIN states s ON t.state_id = s.id
            LEFT JOIN cities c ON t.city_id = c.id
            WHERE t.id = %s;
            """,
            (turf_id,)
        )
        if not turf:
            return Response({"error": "Turf not found."}, status=status.HTTP_404_NOT_FOUND)

        # Contact visibility rule:
        # "Owner contact is shown only after approval" for player booking, but for turf inquiry general contact is shown
        return Response({"turf": turf})

    def put(self, request, turf_id):
        owner_id = request.user.raw_data.get("owner_id")
        turf = query_one("SELECT id, owner_id FROM turfs WHERE id = %s;", (turf_id,))
        if not turf:
            return Response({"error": "Turf not found."}, status=status.HTTP_404_NOT_FOUND)
        if turf["owner_id"] != owner_id:
            return Response({"error": "You do not have permission to edit this turf."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        name = data.get("name", "").strip()
        address = data.get("address", "").strip()
        landmark = data.get("landmark", "").strip() or None
        contact_number = data.get("contact_number", "").strip()
        google_maps_link = data.get("google_maps_link", "").strip() or None
        description = data.get("description", "").strip() or None
        rules = data.get("rules", "").strip() or None
        cancellation_policy = data.get("cancellation_policy", "").strip() or "Full refund if cancelled at least 24 hours prior to slot start time."
        sport = data.get("sport", "").strip()
        surface = data.get("surface", "").strip()
        size = data.get("size", "").strip()
        state_id = data.get("state_id")
        city_id = data.get("city_id")
        pincode = data.get("pincode", "").strip()
        weekday_price = data.get("weekday_price_per_hour")
        weekend_price = data.get("weekend_price_per_hour")
        max_players = data.get("max_players")
        advance_limit = data.get("advance_booking_limit_days", 30)
        opening_time = data.get("opening_time")
        closing_time = data.get("closing_time")
        turf_type = data.get("turf_type", "Outdoor")
        status_val = data.get("status", "Active")
        amenities = data.get("amenities", [])
        if isinstance(amenities, str):
            amenities = [a.strip() for a in amenities.split(",") if a.strip()]

        photos = data.get("photos", [])
        if isinstance(photos, str):
            photos = [p.strip() for p in photos.split(",") if p.strip()]

        if closing_time <= opening_time:
            return Response({"error": "Closing time must be later than opening time."}, status=status.HTTP_400_BAD_REQUEST)

        # Check unique name in city for other turfs
        existing = query_one(
            "SELECT id FROM turfs WHERE owner_id = %s AND city_id = %s AND LOWER(name) = LOWER(%s) AND id != %s;",
            (owner_id, city_id, name, turf_id)
        )
        if existing:
            return Response({"error": "You already have another turf with this name in this city."}, status=status.HTTP_400_BAD_REQUEST)

        update_sql = """
            UPDATE turfs SET
                name = %s, address = %s, landmark = %s, contact_number = %s,
                google_maps_link = %s, description = %s, rules = %s, cancellation_policy = %s,
                sport = %s, surface = %s, size = %s, state_id = %s, city_id = %s, pincode = %s,
                weekday_price_per_hour = %s, weekend_price_per_hour = %s, max_players = %s,
                advance_booking_limit_days = %s, opening_time = %s, closing_time = %s,
                turf_type = %s, amenities = %s, status = %s, photos = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """
        execute_update(update_sql, (
            name, address, landmark, contact_number, google_maps_link, description, rules,
            cancellation_policy, sport, surface, size, state_id, city_id, pincode,
            float(weekday_price), float(weekend_price), int(max_players), int(advance_limit),
            opening_time, closing_time, turf_type, amenities, status_val, photos, turf_id
        ))
        return Response({"message": "Turf updated successfully!"})

    def delete(self, request, turf_id):
        owner_id = request.user.raw_data.get("owner_id")
        turf = query_one("SELECT id, owner_id, name FROM turfs WHERE id = %s;", (turf_id,))
        if not turf:
            return Response({"error": "Turf not found."}, status=status.HTTP_404_NOT_FOUND)
        if turf["owner_id"] != owner_id:
            return Response({"error": "You do not have permission to delete this turf."}, status=status.HTTP_403_FORBIDDEN)

        # BUSINESS RULE CHECK: Block deletion while upcoming approved bookings exist!
        upcoming_approved = query_one(
            """
            SELECT COUNT(*) as count
            FROM booking_requests
            WHERE turf_id = %s AND status = 'Approved' AND booking_date >= CURRENT_DATE;
            """,
            (turf_id,)
        )
        if upcoming_approved and upcoming_approved["count"] > 0:
            return Response({
                "error": f"Cannot delete turf '{turf['name']}'. There are {upcoming_approved['count']} upcoming approved booking(s) scheduled on this turf. Cancel or complete them first."
            }, status=status.HTTP_400_BAD_REQUEST)

        execute_update("DELETE FROM turfs WHERE id = %s;", (turf_id,))
        return Response({"message": f"Turf '{turf['name']}' deleted successfully."})
