th/login/` | User credentials verification, returns JWT and user profile | Public |
| GET | `/api/auth/me/` | Current authenticated user profile | Yes |
| GET | `/api/auth/locations/` | Geo dataset (countries, states, cities) | Public |

---

## 2. Administrator Operations (`/api/admin/`)

Role Required: `admin`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/dashboard/` | High-level metrics: pending owners, total turfs, active slots, 24h bookings |
| GET | `/api/admin/owners/` | Filterable list of owners (by search, status, date) |
| GET | `/api/admin/owners/<id>/` | Detailed owner review with unmasked bank IFSC and uploaded document proofs |
| POST | `/api/admin/owners/<id>/verify/` | Verify checklist (requires `id_proof`, `ownership_proof`, `bank_details` all True to Approve) |
| POST | `/api/admin/owners/<id>/reject/` | Reject registration with category (`Incomplete Documents`, `Invalid Bank Details`, etc.) and reason |
| POST | `/api/admin/owners/<id>/suspend/` | Toggle account suspension (`Suspended` <-> `Approved`) |
| POST | `/api/admin/owners/bulk-action/` | Perform bulk approve/reject on multiple owner records |
| GET | `/api/admin/audit-logs/` | Immutable log of administrative decisions with timestamps and notes |

---

## 3. Turf Management (`/api/turfs/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/turfs/` | Discover active turfs with multi-parameter filtering (sport, city, surface, size, price) | Public |
| GET | `/api/turfs/<id>/` | Full details, ground rules, cancellation policy, operating hours | Public |
| POST | `/api/turfs/` | Create new turf (Approved owners only; unique per owner & city) | Approved Owner |
| PUT | `/api/turfs/<id>/` | Update turf configurations | Approved Owner |
| DELETE | `/api/turfs/<id>/` | Delete turf (strictly blocked if upcoming approved bookings exist) | Approved Owner |

---

## 4. Slot Management (`/api/slots/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/slots/?turf_id=<id>&date=<YYYY-MM-DD>` | List live slots with status (`Open`, `Booked`, `Blocked`, `Requested`) | Public |
| POST | `/api/slots/create/` | Generate recurring slots (daily, weekly, custom) with overlap avoidance | Approved Owner |
| POST | `/api/slots/block/` | Block slot for maintenance with reason | Approved Owner |
| POST | `/api/slots/<id>/unblock/` | Restore blocked slot to Open status | Approved Owner |
| DELETE | `/api/slots/<id>/delete/` | Delete slot (blocked if slot is associated with approved booking) | Approved Owner |

---

## 5. Booking Workflow (`/api/bookings/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/bookings/request/` | Submit booking request for consecutive open slots (max 5 pending per player) | Player |
| GET | `/api/bookings/my-requests/` | View player's booking requests with filter tabs | Player |
| GET | `/api/bookings/owner-requests/` | View requests received by owner for their venues | Owner |
| GET | `/api/bookings/<id>/` | Detailed view including slot items and status lifecycle timeline | Authenticated |
| POST | `/api/bookings/<id>/approve/` | Approve request (locks slots to Booked, auto-rejects competing pending requests) | Owner |
| POST | `/api/bookings/<id>/reject/` | Reject request with category and explanation | Owner |
| POST | `/api/bookings/<id>/withdraw/` | Withdraw pending request | Player |
| POST | `/api/bookings/<id>/cancel/` | Cancel approved booking before start time with reason | Player / Owner |
| POST | `/api/bookings/<id>/close/` | Mark booking as Completed or No-Show | Owner |

---

## 6. Notifications (`/api/notifications/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/notifications/` | List user's notifications and unread count | Authenticated |
| POST | `/api/notifications/<id>/read/` | Mark notification as read | Authenticated |
| POST | `/api/notifications/mark-all-read/` | Mark all unread notifications as read | Authenticated |
# TurfSync REST API Reference

Base URL: `http://localhost:8080/api`

All authenticated endpoints require an `Authorization: Bearer <JWT>` header.

---

## 1. Authentication (`/api/auth/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register/owner/` | Multipart form submission for owner registration (age 18+, PDF/image docs) | Public |
| POST | `/api/auth/register/player/` | Player registration (age 16+, favorite sports) | Public |
| POST | `/api/au