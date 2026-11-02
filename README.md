# TurfSync – Smart Turf Booking & Management System

TurfSync is an enterprise-grade full-stack platform for sports arena discovery, real-time slot scheduling, and host-moderated booking workflows.

Built strictly adhering to the architectural requirement of **Direct SQL with `psycopg` (NO ORM)** in Django, paired with a modern **Angular** frontend.

---

## 1. System Roles & Features

### 🛡️ Administrator Portal
- **Direct Database Entry:** Admin accounts are created directly in PostgreSQL; no public registration endpoint.
- **Verification Checklist:** Inspects owner ID proof, business/ownership certificate, and unmasked bank details. **All 3 items must be verified** before approving an owner.
- **Moderation:** Rejects owner registrations with standardized categories and reason; suspends or reactivates accounts; performs bulk reviews.
- **Audit Logs:** Immutable audit log tracking all administrative decisions with admin timestamps.

### 🏟️ Turf Owner Portal
- **Self-Registration:** Requires age 18+, identity documentation, bank account, and sports offered. Begins in `Pending Approval` status.
- **Turf Operations:** Add/manage sports grounds (Football, Cricket, Badminton, Basketball, Tennis, Pickleball) with operating hours, surface, amenities, ground rules, and cancellation policies. Unique name per owner/city.
- **Slot Generation:** Automated recurring generation of 30, 60, and 90-minute non-overlapping slots within operating hours. Block/unblock slots for maintenance.
- **Booking Request Review:**
  - Approve requests (locks slots to `Booked` and **automatically rejects competing pending requests** on the same slots).
  - Reject requests with structured categories and reasons.
  - Advance payment received toggle.
  - Mark matches as `Completed` or `No-Show`.
  - Upcoming approved bookings deletion guard preventing venue deletion with active games.

### 🏃 Player Experience
- **Discovery & Search:** Live search across active turfs with filters for sport, city, surface, dimensions, indoor/outdoor, amenities, and hourly rate.
- **Interactive Slot Picker:** Visual calendar and time grid with status coloring (Open, Selected, Booked, Blocked). Enforces **consecutive slot selection**.
- **Booking Requests:** Add-on services (balls/bibs, certified referee, hydration packs), team name, payment preference, player capacity limit check ($\le$ max players), and mandatory agreement to ground rules.
- **Request Limits:** Restricts players to a maximum of 5 concurrent pending requests.
- **My Bookings & Match History:** Filter tabs (All, Pending, Approved, Completed, Cancelled/Rejected), request withdrawal, match cancellation with reason, lifecycle audit timeline, and quick "Book Again".

---

## 2. Technology Stack

- **Backend:** Python 3.12, Django 5.2, Django REST Framework, JWT Authentication (`pyjwt`), PBKDF2 password hashing.
- **Database:** PostgreSQL 18 with direct SQL queries via `psycopg` (v3) connection pooling, parameterized queries, and ACID transactions. **Strictly NO Django ORM**.
- **Frontend:** Angular, TypeScript, Vanilla CSS design tokens, Bootstrap Icons, SweetAlert2.

---

## 3. Running the Application

### Ports & Services
- **Django REST API:** `http://localhost:8080/api`
- **Angular Frontend:** `http://localhost:4500`
- **PostgreSQL Database:** `localhost:5432` (`turfsync_db`)

### Default Demo Credentials

| Role | Email | Password | Quick Login |
|---|---|---|---|
| **Admin** | `admin@turfsync.com` | `Admin@123` | Click **Demo Admin** on `/login` |
| **Turf Owner** | `owner@apexarena.com` | `Owner@123` | Click **Demo Owner** on `/login` |
| **Player** | `player@gmail.com` | `Player@123` | Click **Demo Player** on `/login` |

### Starting Backend Manually
```bash
cd backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8080
```

### Starting Frontend Manually
```bash
cd frontend
npm install
npm start -- --port 4500
```

### Running Backend Integration Tests
```bash
cd backend
.venv/bin/python manage.py test tests
```

---

## 4. Workspace Structure

```
TurfSync/
├── frontend/                     # Angular Single Page Application
│   ├── src/app/core/             # Models, Guards, Interceptors, Services
│   ├── src/app/features/         # Auth, Admin, Owner, Player modules
│   └── src/app/layout/           # Navbar, Sidebar, Footer
├── backend/                      # Django Direct SQL REST API
│   ├── apps/                     # Auth, Admin, Owners, Turfs, Slots, Bookings, Notifications
│   ├── config/                   # Django settings, URLs, Celery
│   ├── database/                 # Raw SQL schemas, indexes, seed data, connection pool
│   └── tests/                    # Integration test suite (9 test workflows)
└── docs/                         # Architecture, API specifications, and test reports
```
