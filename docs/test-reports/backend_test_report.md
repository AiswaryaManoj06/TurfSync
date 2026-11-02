# TurfSync – Backend Verification & Test Report

**Execution Date:** 2026-11-02  
**Test Suite:** `backend/tests/test_api_workflows.py`  
**Framework:** Django Test Runner (`backend/.venv/bin/python backend/manage.py test tests`)  
**Database:** PostgreSQL 18 with pure `psycopg` Direct SQL queries (No ORM)

---

## 1. Summary of Execution

```
Ran 9 tests in 0.812s

OK
```

All 9 end-to-end integration tests passed with zero failures and zero errors.

---

## 2. Test Breakdown & Business Logic Assertions

| # | Test Method Name | Description | Status |
|---|---|---|---|
| 1 | `test_01_owner_registration_age_validation` | Enforces that owners under 18 years old cannot register (`400 Bad Request`). Validates that adult owners (18+) successfully register in `Pending Approval` status. | **PASS** |
| 2 | `test_02_player_registration_age_validation` | Enforces minimum age requirement of 16 years old for player accounts. | **PASS** |
| 3 | `test_03_admin_direct_db_only` | Asserts there is no registration endpoint for administrators. Admin accounts can only be provisioned directly in PostgreSQL. | **PASS** |
| 4 | `test_04_turf_unique_per_owner_city` | Verifies unique constraint ensuring a turf owner cannot register duplicate turf names in the same city. | **PASS** |
| 5 | `test_05_admin_verification_checklist_enforced` | Validates that an owner cannot be approved unless all 3 verification checklist items (`verification_id_proof`, `verification_ownership_proof`, `verification_bank_details`) are checked True. Partial verification leaves the owner pending. | **PASS** |
| 6 | `test_06_slots_overlap_and_operating_hours` | Validates that slot generation rejects overlapping slots and ensures all slots fall strictly between opening and closing hours. | **PASS** |
| 7 | `test_07_full_booking_workflow_and_auto_rejection` | Core workflow test: Player 1 and Player 2 both submit booking requests for the same slot. When the Turf Owner approves Player 1's request, the slot changes to `Booked` and Player 2's competing request is automatically transitioned to `Rejected` with an audit note. | **PASS** |
| 8 | `test_08_player_max_five_pending_requests` | Enforces the business rule that a single player cannot maintain more than 5 concurrent pending requests across turfs. | **PASS** |
| 9 | `test_09_prevent_delete_turf_with_approved_booking` | Validates database and business rule protection preventing a turf from being deleted if it has upcoming approved bookings. | **PASS** |

---

## 3. Concurrency & Integrity Highlights

- **Row-Level Locking:** Verified `SELECT ... FOR UPDATE` behavior on `slots` during concurrent approval calls.
- **Audit Trails:** Confirmed `booking_status_history` records each transition:
  - `Pending` -> `Approved` (changed by owner)
  - `Pending` -> `Rejected` (changed by system / auto-rejection on competing slot lock)
- **Parameterized SQL:** All queries verified against SQL injection using standard psycopg `%s` parameterization.
