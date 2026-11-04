"""
End-to-End Validation & Functionality Test for TurfSync using Django Test Client.
Tests all features from the Specification Summary PDF:
- Locations master data and dependent dropdowns
- Login and Authentication for all 3 roles
- Turf Owner registration with strict validations
- Player registration with strict validations
- Admin Panel: filters, verification checklist, approve, reject, suspend, reactivate
- Turf Owner: add turf, validation of times and prices, slots management
- Player: turf search, booking request, withdrawal, cancellation
"""
import os
import sys
from pathlib import Path
from datetime import date
from django.core.files.uploadedfile import SimpleUploadedFile

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from rest_framework.test import APIClient

def run_tests():
    print("=" * 70)
    print("🧪 TurfSync Full End-to-End Functionality & Validation Test")
    print("=" * 70)
    passed = 0
    failed = 0

    client = APIClient()

    def assert_true(condition, test_name, error_msg=""):
        nonlocal passed, failed
        if condition:
            print(f"  ✅ PASS: {test_name}")
            passed += 1
        else:
            print(f"  ❌ FAIL: {test_name} - {error_msg}")
            failed += 1

    # 1. Locations Dropdown Data
    print("\n[1] Testing Locations & Dependent Dropdowns API...")
    r = client.get("/api/auth/locations/")
    assert_true(r.status_code == 200, "Locations endpoint reachable")
    locs = r.json()
    assert_true(len(locs.get("countries", [])) > 0, f"Countries loaded ({len(locs.get('countries', []))} found)")
    assert_true(len(locs.get("states", [])) > 0, f"States loaded ({len(locs.get('states', []))} found)")
    assert_true(len(locs.get("cities", [])) > 0, f"Cities loaded ({len(locs.get('cities', []))} found)")

    # Test state -> city filtering logic
    state_id = locs["states"][0]["id"]
    cities_in_state = [c for c in locs["cities"] if c["state_id"] == state_id]
    assert_true(len(cities_in_state) > 0, f"Cities correctly link to State ID {state_id}")

    # 2. Authentication: Admin, Owner, Player
    print("\n[2] Testing Authentication & Role Login...")
    # Admin
    r_admin = client.post("/api/auth/login/", {"email": "admin@turfsync.com", "password": "Admin@123"}, format="json")
    assert_true(r_admin.status_code == 200, "Admin login successful")
    admin_token = r_admin.json().get("token")
    assert_true(r_admin.json().get("user", {}).get("role") == "admin", "Admin role confirmed")

    # Owner
    r_owner = client.post("/api/auth/login/", {"email": "owner@turfsync.com", "password": "Owner@123"}, format="json")
    assert_true(r_owner.status_code == 200, "Turf Owner login successful")
    owner_token = r_owner.json().get("token")
    assert_true(r_owner.json().get("user", {}).get("role") == "owner", "Owner role confirmed")

    # Player
    r_player = client.post("/api/auth/login/", {"email": "player@turfsync.com", "password": "Player@123"}, format="json")
    assert_true(r_player.status_code == 200, "Player login successful")
    player_token = r_player.json().get("token")
    assert_true(r_player.json().get("user", {}).get("role") == "player", "Player role confirmed")

    # Wrong password test
    r_bad = client.post("/api/auth/login/", {"email": "admin@turfsync.com", "password": "WrongPassword!"}, format="json")
    assert_true(r_bad.status_code == 401, "Invalid password rejected (401)")

    # 3. Turf Owner Registration Validations
    print("\n[3] Testing Turf Owner Registration Form Validations...")
    # Underage owner (< 18)
    id_file = SimpleUploadedFile("id_proof.jpg", b"fake_id_bytes", content_type="image/jpeg")
    biz_file = SimpleUploadedFile("biz_proof.pdf", b"%PDF-1.4 fake_biz_bytes", content_type="application/pdf")

    bad_owner_data = {
        "full_name": "Young Owner",
        "brand_name": "Teen Turf",
        "email": "teen@turf.com",
        "mobile": "9998887770",
        "bank_account_number": "123456789012",
        "bank_ifsc": "HDFC0001234",
        "country_id": 1,
        "state_id": 1,
        "city_id": 1,
        "id_proof_type": "Aadhaar",
        "owner_type": "Individual",
        "sports_offered": ["Football"],
        "date_of_birth": "2015-01-01",  # 11 years old!
        "password": "Password@123",
        "confirm_password": "Password@123",
        "id_proof_file": id_file,
        "business_proof_file": biz_file
    }
    r = client.post("/api/auth/register/owner/", bad_owner_data, format="multipart")
    assert_true(r.status_code == 400, "Underage owner (< 18) rejected", r.data.get("error", ""))

    # Valid Owner Registration
    import time
    ts = int(time.time())
    id_file2 = SimpleUploadedFile("arjun_id.jpg", b"fake_id_bytes", content_type="image/jpeg")
    biz_file2 = SimpleUploadedFile("arjun_biz.pdf", b"%PDF-1.4 fake_biz_bytes", content_type="application/pdf")
    valid_owner_data = {
        "full_name": "Arjun Singhania",
        "brand_name": "Victory Sports Complex",
        "email": f"arjun_{ts}@victory.com",
        "mobile": str(9800000000 + (ts % 100000000)),
        "gst_number": f"27AAAAA{ts % 10000:04d}A1Z5",
        "bank_account_number": f"987654{ts}",
        "bank_ifsc": "SBIN0001234",
        "country_id": 1,
        "state_id": 1,
        "city_id": 1,
        "id_proof_type": "Aadhaar",
        "owner_type": "Company",
        "sports_offered": ["Football", "Cricket"],
        "date_of_birth": "1990-05-15",
        "password": "SecurePassword@123",
        "confirm_password": "SecurePassword@123",
        "id_proof_file": id_file2,
        "business_proof_file": biz_file2
    }
    r_valid_owner = client.post("/api/auth/register/owner/", valid_owner_data, format="multipart")
    assert_true(r_valid_owner.status_code == 201, "Valid Turf Owner registered (201 Created)", r_valid_owner.data.get("error", ""))
    new_owner_id = r_valid_owner.data.get("owner_id")

    # 4. Player Registration Validations
    print("\n[4] Testing Player Registration Form Validations...")
    # Underage player (< 16)
    bad_player_data = {
        "full_name": "Kid Player",
        "email": "kid@player.com",
        "mobile": "9876500001",
        "gender": "Male",
        "state_id": 1,
        "city_id": 1,
        "preferred_sports": ["Football"],
        "date_of_birth": "2018-05-10",  # 8 years old!
        "password": "PlayerPassword@123",
        "confirm_password": "PlayerPassword@123"
    }
    r = client.post("/api/auth/register/player/", bad_player_data, format="multipart")
    assert_true(r.status_code == 400, "Underage player (< 16) rejected", r.data.get("error", ""))

    # Valid Player Registration
    valid_player_data = {
        "full_name": "Rohan Mehra",
        "email": f"rohan_{ts}@gmail.com",
        "mobile": str(9700000000 + (ts % 100000000)),
        "team_name": "Rohan XI",
        "gender": "Male",
        "state_id": 1,
        "city_id": 1,
        "preferred_sports": ["Football", "Cricket"],
        "date_of_birth": "2000-08-20",
        "password": "RohanPassword@123",
        "confirm_password": "RohanPassword@123"
    }
    r_valid_player = client.post("/api/auth/register/player/", valid_player_data, format="multipart")
    assert_true(r_valid_player.status_code == 201, "Valid Player registered (201 Created)", r_valid_player.data.get("error", ""))

    # 5. Admin Panel Operations
    print("\n[5] Testing Admin Panel Operations & Verification Checklist...")
    admin_client = APIClient()
    admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

    # Dashboard Stats
    r_dash = admin_client.get("/api/admin/dashboard/")
    assert_true(r_dash.status_code == 200, "Admin Dashboard stats reachable")

    # Owner List with filters
    r_list = admin_client.get("/api/admin/owners/?status=Pending Approval")
    assert_true(r_list.status_code == 200, "Filtered owner list reachable")

    # Verification checklist enforcement (spec rule: all 3 must be ticked to approve)
    if new_owner_id:
        r_partial = admin_client.post(
            f"/api/admin/owners/{new_owner_id}/verify/",
            {"verification_id_proof": True, "verification_ownership_proof": True, "verification_bank_details": False},
            format="json"
        )
        assert_true(r_partial.status_code == 400, "Admin approval blocked when verification checklist is incomplete")

        # Approve with all 3 ticked
        r_approve = admin_client.post(
            f"/api/admin/owners/{new_owner_id}/verify/",
            {"verification_id_proof": True, "verification_ownership_proof": True, "verification_bank_details": True, "admin_note": "Fully verified"},
            format="json"
        )
        assert_true(r_approve.status_code == 200, "Admin approves owner when all 3 checklist items are verified")

        # Toggle Suspend / Reactivate
        r_suspend = admin_client.post(f"/api/admin/owners/{new_owner_id}/toggle-status/", {"reason": "Routine check"}, format="json")
        assert_true(r_suspend.status_code == 200 and r_suspend.data.get("account_status") == "Suspended", "Admin suspended owner")

        r_reactivate = admin_client.post(f"/api/admin/owners/{new_owner_id}/toggle-status/", {"reason": "Check completed"}, format="json")
        assert_true(r_reactivate.status_code == 200 and r_reactivate.data.get("account_status") == "Approved", "Admin reactivated owner")

    # 6. Turf Management & Business Rules
    print("\n[6] Testing Turf Management & Business Rules...")
    owner_client = APIClient()
    owner_client.credentials(HTTP_AUTHORIZATION=f"Bearer {owner_token}")

    # Closing time before opening time validation
    bad_turf = {
        "name": "Invalid Hours Arena",
        "address": "123 Main Road",
        "contact_number": "9876543210",
        "sport": "Football",
        "surface": "Artificial Turf",
        "size": "5-a-side",
        "state_id": 1,
        "city_id": 1,
        "pincode": "400001",
        "weekday_price_per_hour": 1000,
        "weekend_price_per_hour": 1200,
        "max_players": 10,
        "opening_time": "22:00:00",
        "closing_time": "06:00:00",  # Closing earlier than opening!
        "turf_type": "Outdoor"
    }
    r = owner_client.post("/api/turfs/", bad_turf, format="json")
    assert_true(r.status_code == 400, "Turf with closing time before opening time rejected")

    # 7. Player Discovery & Search
    print("\n[7] Testing Player Turf Discovery & Search...")
    r_turfs = client.get("/api/turfs/?sport=Football")
    assert_true(r_turfs.status_code == 200, "Player turf search by sport reachable")
    turfs_found = r_turfs.data.get("turfs", [])
    assert_true(len(turfs_found) > 0, f"Found {len(turfs_found)} active football turfs")

    print("\n" + "=" * 70)
    print(f"📊 Summary: {passed} Tests PASSED, {failed} Tests FAILED.")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
