"""
Authentication Views (Strict Direct SQL - NO ORM)
Handles Owner Registration, Player Registration, Login, Current User Profile, and Master Geography.
"""
import os
import re
from datetime import datetime, date
from pathlib import Path
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from database.connection import query_one, query_all, execute_insert, execute_update, db_cursor
from utilities.security import hash_password, verify_password, generate_jwt_token
from utilities.permissions import IsAuthenticatedDirectSQL

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validates min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one digit."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character."
    return True, ""

def calculate_age(born_date: date) -> int:
    today = date.today()
    return today.year - born_date.year - ((today.month, today.day) < (born_date.month, born_date.day))

def save_uploaded_file(file_obj, subfolder: str) -> str:
    """Saves an uploaded file to backend/media/uploads/<subfolder> and returns relative URL."""
    target_dir = Path(settings.MEDIA_ROOT) / "uploads" / subfolder
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{int(datetime.now().timestamp())}_{file_obj.name.replace(' ', '_')}"
    target_path = target_dir / filename
    with open(target_path, "wb+") as destination:
        for chunk in file_obj.chunks():
            destination.write(chunk)
    return f"/media/uploads/{subfolder}/{filename}"

class LocationsView(APIView):
    """Provides Countries, States, and Cities for dependent dropdowns."""
    permission_classes = [AllowAny]

    def get(self, request):
        countries = query_all("SELECT id, name, code FROM countries ORDER BY name ASC;")
        states = query_all("SELECT id, country_id, name, code FROM states ORDER BY name ASC;")
        cities = query_all("SELECT id, state_id, name FROM cities ORDER BY name ASC;")
        return Response({
            "countries": countries,
            "states": states,
            "cities": cities
        })

class RegisterOwnerView(APIView):
    """Self-registration for Turf Owners (Pending Approval)."""
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        full_name = data.get("full_name", "").strip()
        brand_name = data.get("brand_name", "").strip()
        email = data.get("email", "").strip().lower()
        mobile = data.get("mobile", "").strip()
        gst_number = data.get("gst_number", "").strip() or None
        bank_account = data.get("bank_account_number", "").strip()
        bank_ifsc = data.get("bank_ifsc", "").strip().upper()
        country_id = data.get("country_id")
        state_id = data.get("state_id")
        city_id = data.get("city_id")
        id_proof_type = data.get("id_proof_type", "").strip()
        owner_type = data.get("owner_type", "").strip()
        sports_offered = request.POST.getlist("sports_offered") or data.get("sports_offered", [])
        if isinstance(sports_offered, str):
            sports_offered = [s.strip() for s in sports_offered.split(",") if s.strip()]
        dob_str = data.get("date_of_birth", "").strip()
        password = data.get("password", "")
        confirm_password = data.get("confirm_password", "")

        # Validations
        if not full_name or not re.match(r"^[A-Za-z\s]+$", full_name):
            return Response({"error": "Full name must contain only letters and spaces."}, status=status.HTTP_400_BAD_REQUEST)
        if not brand_name:
            return Response({"error": "Brand name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not email or "@" not in email:
            return Response({"error": "A valid email address is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not re.match(r"^\d{10}$", mobile):
            return Response({"error": "Mobile number must be exactly 10 digits."}, status=status.HTTP_400_BAD_REQUEST)
        if gst_number and len(gst_number) != 15:
            return Response({"error": "GST number must be 15 characters if provided."}, status=status.HTTP_400_BAD_REQUEST)
        if not (bank_account.isdigit() and 9 <= len(bank_account) <= 18):
            return Response({"error": "Bank account number must be between 9 and 18 digits."}, status=status.HTTP_400_BAD_REQUEST)
        if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", bank_ifsc):
            return Response({"error": "Invalid IFSC code format (e.g. HDFC0001234)."}, status=status.HTTP_400_BAD_REQUEST)
        if not country_id or not state_id or not city_id:
            return Response({"error": "Country, state, and city are required."}, status=status.HTTP_400_BAD_REQUEST)
        if id_proof_type not in ('Aadhaar', 'PAN', 'Passport', 'Driving Licence'):
            return Response({"error": "Invalid ID proof type selected."}, status=status.HTTP_400_BAD_REQUEST)
        if owner_type not in ('Individual', 'Partnership', 'Company'):
            return Response({"error": "Invalid owner type selected."}, status=status.HTTP_400_BAD_REQUEST)
        if not sports_offered:
            return Response({"error": "At least one sport must be selected."}, status=status.HTTP_400_BAD_REQUEST)
        
        # DOB validation (age 18+)
        try:
            dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
            if calculate_age(dob) < 18:
                return Response({"error": "Owner must be at least 18 years old."}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"error": "Invalid date of birth format (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)

        # Password rules
        if password != confirm_password:
            return Response({"error": "Password and confirmation do not match."}, status=status.HTTP_400_BAD_REQUEST)
        is_valid_pw, pw_err = validate_password_strength(password)
        if not is_valid_pw:
            return Response({"error": pw_err}, status=status.HTTP_400_BAD_REQUEST)

        # File uploads validation
        id_proof_file = request.FILES.get("id_proof_file")
        business_proof_file = request.FILES.get("business_proof_file")
        if not id_proof_file:
            return Response({"error": "ID proof document is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not business_proof_file:
            return Response({"error": "Business/ownership proof document is required."}, status=status.HTTP_400_BAD_REQUEST)

        if id_proof_file.size > 2 * 1024 * 1024:
            return Response({"error": "ID proof file size cannot exceed 2 MB."}, status=status.HTTP_400_BAD_REQUEST)
        if business_proof_file.size > 5 * 1024 * 1024:
            return Response({"error": "Business proof file size cannot exceed 5 MB."}, status=status.HTTP_400_BAD_REQUEST)

        # Check unique email and mobile via direct SQL
        existing_user = query_one("SELECT id FROM users WHERE email = %s", (email,))
        if existing_user:
            return Response({"error": "An account with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        existing_owner_mobile = query_one("SELECT id FROM owners WHERE mobile = %s", (mobile,))
        if existing_owner_mobile:
            return Response({"error": "An owner account with this mobile number already exists."}, status=status.HTTP_400_BAD_REQUEST)

        id_proof_path = save_uploaded_file(id_proof_file, "documents")
        business_proof_path = save_uploaded_file(business_proof_file, "documents")
        pw_hash = hash_password(password)

        # Atomic direct SQL insertion using transaction
        try:
            with db_cursor(as_dict=True) as cur:
                cur.execute(
                    """
                    INSERT INTO users (email, password_hash, role, status)
                    VALUES (%s, %s, 'owner', 'Pending Approval')
                    RETURNING id;
                    """,
                    (email, pw_hash)
                )
                user_id = cur.fetchone()["id"]

                cur.execute(
                    """
                    INSERT INTO owners (
                        user_id, full_name, brand_name, mobile, gst_number, bank_account_number, bank_ifsc,
                        country_id, state_id, city_id, id_proof_type, owner_type, sports_offered, date_of_birth,
                        id_proof_file, business_proof_file, account_status
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, 'Pending Approval'
                    ) RETURNING id;
                    """,
                    (
                        user_id, full_name, brand_name, mobile, gst_number, bank_account, bank_ifsc,
                        country_id, state_id, city_id, id_proof_type, owner_type, sports_offered, dob,
                        id_proof_path, business_proof_path
                    )
                )
                owner_id = cur.fetchone()["id"]

                # Notify admins of new registration
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                    SELECT user_id, 'New Owner Registration', %s, 'OWNER_REGISTERED', %s, 'owner'
                    FROM admins;
                    """,
                    (f"Owner {brand_name} ({full_name}) registered and is awaiting verification.", owner_id)
                )

            return Response({
                "message": "Registration successful! Your account has been submitted for admin approval.",
                "owner_id": owner_id,
                "status": "Pending Approval"
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Database registration failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RegisterPlayerView(APIView):
    """Self-registration for Players (Age 16+)."""
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        full_name = data.get("full_name", "").strip()
        email = data.get("email", "").strip().lower()
        mobile = data.get("mobile", "").strip()
        team_name = data.get("team_name", "").strip() or None
        gender = data.get("gender", "").strip()
        state_id = data.get("state_id")
        city_id = data.get("city_id")
        preferred_sports = request.POST.getlist("preferred_sports") or data.get("preferred_sports", [])
        if isinstance(preferred_sports, str):
            preferred_sports = [s.strip() for s in preferred_sports.split(",") if s.strip()]
        dob_str = data.get("date_of_birth", "").strip()
        password = data.get("password", "")
        confirm_password = data.get("confirm_password", "")

        # Validations
        if not full_name or not re.match(r"^[A-Za-z\s]+$", full_name):
            return Response({"error": "Full name must contain only letters and spaces (no numbers or special characters)."}, status=status.HTTP_400_BAD_REQUEST)
        if not email or "@" not in email:
            return Response({"error": "A valid email is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not re.match(r"^\d{10}$", mobile):
            return Response({"error": "Mobile must be a valid 10-digit number."}, status=status.HTTP_400_BAD_REQUEST)
        if team_name and len(team_name) > 30:
            return Response({"error": "Team name cannot exceed 30 characters."}, status=status.HTTP_400_BAD_REQUEST)
        if gender not in ('Male', 'Female', 'Other'):
            return Response({"error": "Gender must be Male, Female, or Other."}, status=status.HTTP_400_BAD_REQUEST)
        if not state_id or not city_id:
            return Response({"error": "State and City are required."}, status=status.HTTP_400_BAD_REQUEST)

        # DOB validation (age 16+)
        try:
            dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
            if calculate_age(dob) < 16:
                return Response({"error": "Player must be at least 16 years of age."}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"error": "Invalid date of birth (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)

        if password != confirm_password:
            return Response({"error": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)
        is_valid_pw, pw_err = validate_password_strength(password)
        if not is_valid_pw:
            return Response({"error": pw_err}, status=status.HTTP_400_BAD_REQUEST)

        # Optional Profile Photo
        profile_photo = request.FILES.get("profile_photo")
        photo_path = None
        if profile_photo:
            if profile_photo.size > 1 * 1024 * 1024:
                return Response({"error": "Profile photo cannot exceed 1 MB."}, status=status.HTTP_400_BAD_REQUEST)
            photo_path = save_uploaded_file(profile_photo, "profiles")

        # Check existing user
        if query_one("SELECT id FROM users WHERE email = %s", (email,)):
            return Response({"error": "Email is already registered."}, status=status.HTTP_400_BAD_REQUEST)
        if query_one("SELECT id FROM players WHERE mobile = %s", (mobile,)):
            return Response({"error": "Mobile number is already registered."}, status=status.HTTP_400_BAD_REQUEST)

        pw_hash = hash_password(password)

        try:
            with db_cursor(as_dict=True) as cur:
                cur.execute(
                    """
                    INSERT INTO users (email, password_hash, role, status)
                    VALUES (%s, %s, 'player', 'Active')
                    RETURNING id;
                    """,
                    (email, pw_hash)
                )
                user_id = cur.fetchone()["id"]

                cur.execute(
                    """
                    INSERT INTO players (
                        user_id, full_name, mobile, team_name, gender, state_id, city_id,
                        preferred_sports, date_of_birth, profile_photo
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s
                    ) RETURNING id;
                    """,
                    (
                        user_id, full_name, mobile, team_name, gender, state_id, city_id,
                        preferred_sports, dob, photo_path
                    )
                )
                player_id = cur.fetchone()["id"]

            token = generate_jwt_token(user_id, email, "player", "Active", {"player_id": player_id, "full_name": full_name})
            return Response({
                "message": "Player registration successful!",
                "token": token,
                "user": {
                    "id": user_id,
                    "player_id": player_id,
                    "email": email,
                    "full_name": full_name,
                    "role": "player",
                    "status": "Active"
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Registration failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoginView(APIView):
    """Unified Login for Admin, Turf Owner, and Player."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not email or not password:
            return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user_row = query_one(
            "SELECT id, email, password_hash, role, status FROM users WHERE email = %s",
            (email,)
        )
        if not user_row:
            return Response({"error": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

        if not verify_password(password, user_row["password_hash"]):
            return Response({"error": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

        role = user_row["role"]
        user_id = user_row["id"]
        status_val = user_row["status"]

        # Role specific status checks
        profile_data = {}
        if role == "admin":
            admin_row = query_one("SELECT id, full_name, status FROM admins WHERE user_id = %s", (user_id,))
            if not admin_row or admin_row["status"] != "Active":
                return Response({"error": "Admin account is inactive. Access denied."}, status=status.HTTP_403_FORBIDDEN)
            profile_data = {
                "admin_id": admin_row["id"],
                "full_name": admin_row["full_name"],
            }
        elif role == "owner":
            owner_row = query_one(
                "SELECT id, full_name, brand_name, account_status, rejection_reason FROM owners WHERE user_id = %s",
                (user_id,)
            )
            if not owner_row:
                return Response({"error": "Owner profile not found."}, status=status.HTTP_404_NOT_FOUND)
            profile_data = {
                "owner_id": owner_row["id"],
                "full_name": owner_row["full_name"],
                "brand_name": owner_row["brand_name"],
                "account_status": owner_row["account_status"],
                "rejection_reason": owner_row["rejection_reason"]
            }
        elif role == "player":
            player_row = query_one(
                "SELECT id, full_name, mobile, profile_photo FROM players WHERE user_id = %s",
                (user_id,)
            )
            if not player_row:
                return Response({"error": "Player profile not found."}, status=status.HTTP_404_NOT_FOUND)
            profile_data = {
                "player_id": player_row["id"],
                "full_name": player_row["full_name"],
                "mobile": player_row["mobile"],
                "profile_photo": player_row["profile_photo"]
            }

        token = generate_jwt_token(user_id, email, role, status_val, profile_data)
        return Response({
            "token": token,
            "user": {
                "id": user_id,
                "email": email,
                "role": role,
                "status": status_val,
                **profile_data
            }
        })

class CurrentUserView(APIView):
    """Returns current authenticated user details."""
    permission_classes = [IsAuthenticatedDirectSQL]

    def get(self, request):
        return Response({"user": request.user.raw_data})

class ExternalCitiesView(APIView):
    """
    Fetches cities dynamically for a chosen state using external location API
    with automatic database sync & caching.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        state_id = request.query_params.get("state_id")
        state_name = request.query_params.get("state", "").strip()

        if not state_id and not state_name:
            return Response({"error": "state_id or state parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup state
        if state_id:
            try:
                st = query_one("SELECT id, name FROM states WHERE id = %s;", (int(state_id),))
            except (ValueError, TypeError):
                st = None
        else:
            st = query_one("SELECT id, name FROM states WHERE LOWER(name) = LOWER(%s) OR name ILIKE %s;", (state_name, f"%{state_name}%"))

        if not st:
            return Response({"error": "State not found."}, status=status.HTTP_404_NOT_FOUND)

        actual_state_id = st["id"]
        actual_state_name = st["name"]

        # Try external location API (CountriesNow)
        external_cities = []
        try:
            import urllib.request, urllib.parse, json, ssl
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            api_state = actual_state_name
            url = f"https://countriesnow.space/api/v0.1/countries/state/cities/q?country=India&state={urllib.parse.quote(api_state)}"
            req = urllib.request.Request(url, headers={"User-Agent": "TurfSync/1.0"})
            with urllib.request.urlopen(req, context=ctx, timeout=4) as resp:
                data = json.loads(resp.read().decode())
                if not data.get("error") and data.get("data"):
                    external_cities = data.get("data", [])
        except Exception:
            external_cities = []

        # If external cities discovered, insert any missing ones into DB
        if external_cities:
            with db_cursor(as_dict=True) as cur:
                for city_name in external_cities:
                    clean_city = str(city_name).strip()
                    if clean_city:
                        cur.execute("SELECT id FROM cities WHERE state_id = %s AND LOWER(name) = LOWER(%s);", (actual_state_id, clean_city))
                        if not cur.fetchone():
                            cur.execute("INSERT INTO cities (state_id, name) VALUES (%s, %s);", (actual_state_id, clean_city))

        # Return full updated list from database sorted alphabetically
        cities = query_all("SELECT id, state_id, name FROM cities WHERE state_id = %s ORDER BY name ASC;", (actual_state_id,))
        return Response({
            "state_id": actual_state_id,
            "state_name": actual_state_name,
            "source": "External Location API (CountriesNow) + Persistent Cache",
            "count": len(cities),
            "cities": cities
        })

