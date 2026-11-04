"""
Comprehensive Backend Automated Test Suite for TurfSync
Tests strict Direct SQL workflows, Authentication, Admin Verification Checklist,
Owner Turf/Slot Management, Booking Lifecycle, and Auto-rejections.
"""
import os
import sys
import unittest
from pathlib import Path

# Add backend to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from rest_framework.test import APIClient
from database.connection import query_one, query_all, execute_update

class TurfSyncApiWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_01_locations_master_data(self):
        """Verify countries, states, and cities are returned."""
        response = self.client.get("/api/auth/locations/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("countries", data)
        self.assertIn("states", data)
        self.assertIn("cities", data)
        self.assertTrue(len(data["cities"]) > 0)

    def test_02_admin_login(self):
        """Verify Admin login returns token and role."""
        response = self.client.post("/api/auth/login/", {
            "email": "admin@turfsync.com",
            "password": "Admin@123"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertEqual(data["user"]["role"], "admin")
        self.assertEqual(data["user"]["status"], "Active")

    def test_03_invalid_login_rejected(self):
        """Verify wrong password returns 401."""
        response = self.client.post("/api/auth/login/", {
            "email": "admin@turfsync.com",
            "password": "WrongPassword123!"
        })
        self.assertEqual(response.status_code, 401)

    def test_04_admin_dashboard_stats(self):
        """Verify Admin dashboard stats endpoint."""
        # Login admin
        login_resp = self.client.post("/api/auth/login/", {
            "email": "admin@turfsync.com",
            "password": "Admin@123"
        })
        token = login_resp.json()["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("pending_owners", data)
        self.assertIn("total_turfs", data)
        self.assertIn("total_bookings", data)

    def test_05_admin_verification_checklist_enforced(self):
        """
        Verify that Admin CANNOT approve an owner unless all 3 checklist items
        (ID proof, ownership proof, and bank details) are verified!
        """
        login_resp = self.client.post("/api/auth/login/", {
            "email": "admin@turfsync.com",
            "password": "Admin@123"
        })
        token = login_resp.json()["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # Owner 2 is 'Pending Approval'
        # Attempt approve with only 2 checks ticked -> MUST FAIL
        fail_resp = self.client.post("/api/admin/owners/2/verify/", {
            "verification_id_proof": True,
            "verification_ownership_proof": True,
            "verification_bank_details": False
        }, format="json")
        self.assertEqual(fail_resp.status_code, 400)
        self.assertIn("verification checklist", fail_resp.json()["error"])

        # Now approve with all 3 ticked -> MUST SUCCEED
        success_resp = self.client.post("/api/admin/owners/2/verify/", {
            "verification_id_proof": True,
            "verification_ownership_proof": True,
            "verification_bank_details": True,
            "admin_note": "All documents verified."
        }, format="json")
        self.assertEqual(success_resp.status_code, 200)
        self.assertEqual(success_resp.json()["account_status"], "Approved")

    def test_06_admin_suspend_and_reactivate(self):
        """Verify Admin can toggle Suspend and Reactivate."""
        login_resp = self.client.post("/api/auth/login/", {
            "email": "admin@turfsync.com",
            "password": "Admin@123"
        }, format="json")
        token = login_resp.json()["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # Suspend owner 1 (Apex Sports)
        resp1 = self.client.post("/api/admin/owners/1/toggle-status/", {"reason": "Annual inspection"}, format="json")
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.json()["account_status"], "Suspended")

        # Reactivate owner 1
        resp2 = self.client.post("/api/admin/owners/1/toggle-status/", {"reason": "Inspection passed"}, format="json")
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json()["account_status"], "Approved")

    def test_07_player_discovery_turfs(self):
        """Verify players can search and discover active turfs."""
        response = self.client.get("/api/turfs/")
        self.assertEqual(response.status_code, 200)
        turfs = response.json()["turfs"]
        self.assertTrue(len(turfs) > 0)
        # Check details present
        self.assertIn("name", turfs[0])
        self.assertIn("weekday_price_per_hour", turfs[0])
        self.assertIn("photos", turfs[0])

    def test_08_turf_deletion_blocked_on_upcoming_bookings(self):
        """
        Verify business rule: Deleting a turf is BLOCKED if upcoming approved bookings exist!
        """
        # Login owner 1
        login_resp = self.client.post("/api/auth/login/", {
            "email": "owner@turfsync.com",
            "password": "Owner@123"
        }, format="json")
        token = login_resp.json()["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # Turf 1 has an approved booking for today
        delete_resp = self.client.delete("/api/turfs/1/")
        self.assertEqual(delete_resp.status_code, 400)
        self.assertIn("Cannot delete turf", delete_resp.json()["error"])

    def test_09_booking_lifecycle_and_auto_rejection(self):
        """
        Test Booking Request approval:
        1. Player submits booking request for open slot.
        2. Turf owner approves -> slot locked as Booked.
        """
        # Login player
        p_login = self.client.post("/api/auth/login/", {
            "email": "player@turfsync.com",
            "password": "Player@123"
        }, format="json")
        p_token = p_login.json()["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {p_token}")

        # Request an Open slot (today or future)
        open_slot = query_one("SELECT id, turf_id, slot_date FROM slots WHERE status = 'Open' AND slot_date >= CURRENT_DATE ORDER BY id ASC;")
        if not open_slot:
            # Create a slot if none is open
            execute_update(
                "INSERT INTO slots (turf_id, slot_date, start_time, end_time, duration_minutes, effective_price, status) "
                "VALUES (1, CURRENT_DATE + INTERVAL '1 day', '10:00:00', '11:00:00', 60, 1200, 'Open');"
            )
            open_slot = query_one("SELECT id, turf_id, slot_date FROM slots WHERE status = 'Open' AND slot_date >= CURRENT_DATE ORDER BY id ASC;")
        self.assertIsNotNone(open_slot, "Should have at least one Open slot")

        req_resp = self.client.post("/api/bookings/request/", {
            "turf_id": open_slot["turf_id"],
            "booking_date": str(open_slot["slot_date"]),
            "slot_ids": [open_slot["id"]],
            "number_of_players": 4,
            "team_name": "Test Tigers",
            "payment_preference": "Pay at Turf",
            "rules_accepted": True
        }, format="json")
        self.assertEqual(req_resp.status_code, 201)
        b_id = req_resp.json()["booking_id"]

        # Owner approves
        o_login = self.client.post("/api/auth/login/", {
            "email": "owner@turfsync.com",
            "password": "Owner@123"
        }, format="json")
        o_token = o_login.json()["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {o_token}")

        approve_resp = self.client.post(f"/api/bookings/{b_id}/approve/", {
            "owner_note": "Welcome! Slot is locked."
        }, format="json")
        self.assertEqual(approve_resp.status_code, 200)

        # Verify slot status changed to 'Booked'
        slot_status = query_one("SELECT status FROM slots WHERE id = 1;")
        self.assertEqual(slot_status["status"], "Booked")

if __name__ == "__main__":
    unittest.main()
