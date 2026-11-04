"""
TurfSync SQLite Fallback Engine.
Provides a 100% compatible Direct-SQL layer when PostgreSQL is unavailable.
Translates Postgres queries (e.g. %s -> ?, ILIKE -> LIKE, ANY(%s::int[]), CURRENT_DATE)
and automatically initializes tables with seed data.
"""
import os
import re
import json
import sqlite3
import contextlib
from pathlib import Path
from datetime import datetime, date, time

DB_PATH = Path(__file__).resolve().parent / "turfsync_fallback.sqlite3"

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        name = col[0]
        val = row[idx]
        # Auto-parse JSON columns for arrays
        if name in ("sports_offered", "preferred_sports", "amenities", "photos", "add_ons", "metadata") and isinstance(val, str):
            try:
                val = json.loads(val)
            except Exception:
                pass
        elif name in ("start_time", "end_time", "opening_time", "closing_time") and isinstance(val, str):
            try:
                from datetime import time as dt_time
                val = dt_time.fromisoformat(val)
            except Exception:
                pass
        elif name in ("slot_date", "booking_date", "date_of_birth") and isinstance(val, str):
            try:
                val = date.fromisoformat(val)
            except Exception:
                pass
        elif name in ("slot_start_times", "slot_end_times"):
            if isinstance(val, str):
                val = [s.strip() for s in val.split(",") if s.strip()]
            elif val is None:
                val = []
        d[name] = val
    return d

def get_sqlite_connection():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def translate_query_and_params(query: str, params=None):
    """
    Translates PostgreSQL specific SQL into SQLite compatible SQL:
    - s.id = ANY(%s::int[]) -> s.id IN (?, ?, ...)
    - %s -> ?
    - ILIKE -> LIKE
    - CURRENT_DATE + INTERVAL '1 day' -> date('now', '+1 day')
    - CURRENT_DATE + 1 -> date('now', '+1 day')
    - CURRENT_TIMESTAMP - INTERVAL 'X hours' -> datetime('now', '-X hours')
    - CURRENT_TIMESTAMP + INTERVAL 'X hours' -> datetime('now', '+X hours')
    - Strips ::int[], ::JSONB, ::TEXT[], etc.
    """
    if params is None:
        params = ()
    elif isinstance(params, (list, tuple)):
        params = list(params)
    elif isinstance(params, dict):
        return query, params

    new_query = query
    new_params = []

    # Replace ILIKE with LIKE
    new_query = re.sub(r"\bILIKE\b", "LIKE", new_query, flags=re.IGNORECASE)

    # Replace ARRAY_AGG with GROUP_CONCAT
    new_query = re.sub(r"ARRAY_AGG\s*\(\s*([^)]*?)\s+ORDER\s+BY\s+[^)]*?\)", r"GROUP_CONCAT(\1)", new_query, flags=re.IGNORECASE)
    new_query = re.sub(r"ARRAY_AGG\s*\(\s*([^)]*?)\s*\)", r"GROUP_CONCAT(\1)", new_query, flags=re.IGNORECASE)

    # Replace INTERVAL patterns
    new_query = re.sub(r"CURRENT_DATE\s*\+\s*INTERVAL\s*'(\d+)\s*day'", r"date('now', '+\1 day')", new_query, flags=re.IGNORECASE)
    new_query = re.sub(r"CURRENT_DATE\s*\+\s*1\b", "date('now', '+1 day')", new_query, flags=re.IGNORECASE)
    new_query = re.sub(r"CURRENT_TIMESTAMP\s*-\s*INTERVAL\s*'(\d+)\s*hours?'", r"datetime('now', '-\1 hours')", new_query, flags=re.IGNORECASE)
    new_query = re.sub(r"CURRENT_TIMESTAMP\s*\+\s*INTERVAL\s*'(\d+)\s*hours?'", r"datetime('now', '+\1 hours')", new_query, flags=re.IGNORECASE)

    # Replace ANY(%s::int[]) or ANY(%s)
    any_pattern = re.compile(r"=\s*ANY\s*\(\s*%s(?:::int\[\]|::text\[\])?\s*\)", re.IGNORECASE)

    # Walk through tokens and parameters
    parts = any_pattern.split(new_query)
    if len(parts) > 1:
        # We have ANY(...) matches
        # Tokenize by %s
        rebuilt = []
        param_idx = 0
        matches = any_pattern.findall(new_query)
        for i, part in enumerate(parts):
            # In this part, count %s
            sub_parts = part.split("%s")
            for j in range(len(sub_parts) - 1):
                new_params.append(serialize_param(params[param_idx]))
                param_idx += 1
            rebuilt.append("?".join(sub_parts))

            if i < len(parts) - 1:
                # Insert IN (?, ?, ...)
                list_arg = params[param_idx]
                param_idx += 1
                if not list_arg:
                    rebuilt.append("IN (NULL)")
                else:
                    placeholders = ", ".join("?" for _ in list_arg)
                    rebuilt.append(f"IN ({placeholders})")
                    for item in list_arg:
                        new_params.append(item)
        new_query = "".join(rebuilt)
    else:
        # Normal query with %s
        sub_parts = new_query.split("%s")
        for i, part in enumerate(sub_parts[:-1]):
            new_params.append(serialize_param(params[i]))
        new_query = "?".join(sub_parts)

    # Clean up any leftover Postgres casts
    new_query = re.sub(r"::\w+(?:\[\])?", "", new_query)

    return new_query, tuple(new_params)

def serialize_param(val):
    if isinstance(val, (list, dict)):
        return json.dumps(val)
    if isinstance(val, time):
        return val.isoformat()
    if isinstance(val, date) and not isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, datetime):
        return val.isoformat()
    return val

class SqliteCursorWrapper:
    def __init__(self, raw_cursor, as_dict=True):
        self.cursor = raw_cursor
        self.as_dict = as_dict
        self.last_inserted_id = None

    def execute(self, query, params=None):
        clean_query, clean_params = translate_query_and_params(query, params)
        res = self.cursor.execute(clean_query, clean_params)
        self.last_inserted_id = self.cursor.lastrowid
        return res

    def executemany(self, query, param_list):
        for p in param_list:
            self.execute(query, p)
        return self

    def fetchone(self):
        row = self.cursor.fetchone()
        if not row:
            return None
        return row

    def fetchall(self):
        return self.cursor.fetchall()

    @property
    def rowcount(self):
        return self.cursor.rowcount

    def close(self):
        self.cursor.close()

@contextlib.contextmanager
def sqlite_cursor(as_dict=True, autocommit=False):
    conn = get_sqlite_connection()
    try:
        cur = conn.cursor()
        wrapper = SqliteCursorWrapper(cur, as_dict=as_dict)
        yield wrapper
        if not autocommit:
            conn.commit()
    except Exception:
        if not autocommit:
            conn.rollback()
        raise
    finally:
        conn.close()

def query_all(query, params=None):
    with sqlite_cursor(as_dict=True) as cur:
        cur.execute(query, params or ())
        return cur.fetchall()

def query_one(query, params=None):
    with sqlite_cursor(as_dict=True) as cur:
        cur.execute(query, params or ())
        return cur.fetchone()

def execute_insert(query, params=None, returning=None):
    with sqlite_cursor(as_dict=True) as cur:
        cur.execute(query, params or ())
        if returning:
            # Check if query returned rows directly
            try:
                row = cur.fetchone()
                if row and returning in row:
                    return row[returning]
            except Exception:
                pass
            return cur.last_inserted_id
        return cur.rowcount

def execute_update(query, params=None):
    with sqlite_cursor(as_dict=True) as cur:
        cur.execute(query, params or ())
        return cur.rowcount

def execute_batch(query, param_list):
    with sqlite_cursor(as_dict=True) as cur:
        cur.executemany(query, param_list)
        return cur.rowcount

def init_sqlite_db():
    """Initializes tables and seeds data if database is new."""
    conn = get_sqlite_connection()
    cur = conn.cursor()

    # Check if initialized
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
    if cur.fetchone():
        conn.close()
        return

    print("📦 Initializing TurfSync SQLite Fallback Database...")

    cur.executescript("""
    CREATE TABLE IF NOT EXISTS countries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'owner', 'player')),
        status TEXT NOT NULL DEFAULT 'Active',
        is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS owners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        mobile TEXT UNIQUE NOT NULL,
        gst_number TEXT,
        bank_account_number TEXT NOT NULL,
        bank_ifsc TEXT NOT NULL,
        country_id INTEGER REFERENCES countries(id),
        state_id INTEGER REFERENCES states(id),
        city_id INTEGER REFERENCES cities(id),
        id_proof_type TEXT NOT NULL,
        owner_type TEXT NOT NULL,
        sports_offered TEXT NOT NULL DEFAULT '[]',
        date_of_birth TEXT NOT NULL,
        id_proof_file TEXT NOT NULL,
        business_proof_file TEXT NOT NULL,
        verification_id_proof INTEGER NOT NULL DEFAULT 0,
        verification_ownership_proof INTEGER NOT NULL DEFAULT 0,
        verification_bank_details INTEGER NOT NULL DEFAULT 0,
        rejection_category TEXT,
        rejection_reason TEXT,
        admin_note TEXT,
        account_status TEXT NOT NULL DEFAULT 'Pending Approval',
        is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        mobile TEXT UNIQUE NOT NULL,
        team_name TEXT,
        gender TEXT NOT NULL,
        state_id INTEGER REFERENCES states(id),
        city_id INTEGER REFERENCES cities(id),
        preferred_sports TEXT NOT NULL DEFAULT '[]',
        date_of_birth TEXT NOT NULL,
        profile_photo TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS turfs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        landmark TEXT,
        contact_number TEXT NOT NULL,
        google_maps_link TEXT,
        description TEXT,
        rules TEXT,
        cancellation_policy TEXT DEFAULT 'Full refund if cancelled at least 24 hours prior to slot start time.',
        sport TEXT NOT NULL,
        surface TEXT NOT NULL,
        size TEXT NOT NULL,
        state_id INTEGER NOT NULL REFERENCES states(id),
        city_id INTEGER NOT NULL REFERENCES cities(id),
        pincode TEXT NOT NULL,
        weekday_price_per_hour REAL NOT NULL,
        weekend_price_per_hour REAL NOT NULL,
        max_players INTEGER NOT NULL,
        advance_booking_limit_days INTEGER NOT NULL DEFAULT 30,
        opening_time TEXT NOT NULL,
        closing_time TEXT NOT NULL,
        turf_type TEXT NOT NULL,
        booking_approval_mode TEXT NOT NULL DEFAULT 'Manual',
        amenities TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'Active',
        is_deleted INTEGER NOT NULL DEFAULT 0,
        photos TEXT NOT NULL DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        turf_id INTEGER NOT NULL REFERENCES turfs(id) ON DELETE CASCADE,
        slot_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        price_override REAL,
        effective_price REAL,
        max_players_override INTEGER,
        is_peak_hour INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Open',
        block_reason TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS booking_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_reference TEXT UNIQUE NOT NULL,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        turf_id INTEGER NOT NULL REFERENCES turfs(id) ON DELETE CASCADE,
        booking_date TEXT NOT NULL,
        number_of_players INTEGER NOT NULL,
        team_name TEXT,
        add_ons TEXT NOT NULL DEFAULT '[]',
        payment_preference TEXT NOT NULL,
        special_requests TEXT,
        rules_accepted INTEGER NOT NULL DEFAULT 1,
        total_amount REAL NOT NULL,
        advance_payment_received INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Pending',
        rejection_category TEXT,
        rejection_reason TEXT,
        cancellation_reason TEXT,
        owner_note TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS booking_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_request_id INTEGER NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
        slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
        slot_price REAL NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS booking_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_request_id INTEGER NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
        from_status TEXT,
        to_status TEXT NOT NULL,
        changed_by_user_id INTEGER,
        reason_or_note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        target_owner_id INTEGER,
        action TEXT NOT NULL,
        previous_status TEXT,
        new_status TEXT,
        reason_or_note TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        reference_id INTEGER,
        reference_type TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    );
    """)

    # Seed Geography
    cur.execute("INSERT OR IGNORE INTO countries (id, name, code) VALUES (1, 'India', 'IN');")
    
    states_data = [
        (1, 1, 'Maharashtra', 'MH'), (2, 1, 'Karnataka', 'KA'), (3, 1, 'Kerala', 'KL'),
        (4, 1, 'Tamil Nadu', 'TN'), (5, 1, 'Delhi', 'DL'), (6, 1, 'Gujarat', 'GJ'),
        (7, 1, 'Andhra Pradesh', 'AP'), (8, 1, 'Arunachal Pradesh', 'AR'), (9, 1, 'Assam', 'AS'),
        (10, 1, 'Bihar', 'BR'), (11, 1, 'Chhattisgarh', 'CG'), (12, 1, 'Goa', 'GA'),
        (13, 1, 'Haryana', 'HR'), (14, 1, 'Himachal Pradesh', 'HP'), (15, 1, 'Jharkhand', 'JH'),
        (16, 1, 'Madhya Pradesh', 'MP'), (17, 1, 'Manipur', 'MN'), (18, 1, 'Meghalaya', 'ML'),
        (19, 1, 'Mizoram', 'MZ'), (20, 1, 'Nagaland', 'NL'), (21, 1, 'Odisha', 'OD'),
        (22, 1, 'Punjab', 'PB'), (23, 1, 'Rajasthan', 'RJ'), (24, 1, 'Sikkim', 'SK'),
        (25, 1, 'Telangana', 'TG'), (26, 1, 'Tripura', 'TR'), (27, 1, 'Uttar Pradesh', 'UP'),
        (28, 1, 'Uttarakhand', 'UK'), (29, 1, 'West Bengal', 'WB')
    ]
    cur.executemany("INSERT OR IGNORE INTO states (id, country_id, name, code) VALUES (?, ?, ?, ?);", states_data)

    cities_data = [
        (1, 1, 'Mumbai'), (2, 1, 'Pune'), (3, 1, 'Navi Mumbai'), (4, 1, 'Thane'), (5, 1, 'Nagpur'),
        (6, 2, 'Bengaluru'), (7, 2, 'Mysuru'), (8, 2, 'Mangaluru'),
        (9, 3, 'Kochi'), (10, 3, 'Kozhikode'), (11, 3, 'Thiruvananthapuram'),
        (12, 4, 'Chennai'), (13, 4, 'Coimbatore'),
        (14, 5, 'New Delhi'), (15, 5, 'South Delhi'),
        (16, 6, 'Ahmedabad'), (17, 6, 'Surat'),
        (18, 7, 'Visakhapatnam'), (19, 7, 'Vijayawada'),
        (20, 12, 'Panaji'), (21, 12, 'Margao'),
        (22, 13, 'Gurugram'), (23, 13, 'Faridabad'),
        (24, 23, 'Jaipur'), (25, 25, 'Hyderabad'),
        (26, 27, 'Lucknow'), (27, 27, 'Noida'),
        (28, 29, 'Kolkata')
    ]
    cur.executemany("INSERT OR IGNORE INTO cities (id, state_id, name) VALUES (?, ?, ?);", cities_data)

    # Seed Users
    # Admin: admin@turfsync.com / Admin@123
    # Owner: owner@turfsync.com / Owner@123
    # Player: player@turfsync.com / Player@123
    users_data = [
        (1, 'admin@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$gm9VYwNcaSiKJS9My5BVWjqNWWTxjr01mgxjYiNyAks=', 'admin', 'Active'),
        (2, 'owner@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$i179d3rRs3fEVIJKgegz0JVYuPpkyMyiuLn1/Ck/M4k=', 'owner', 'Approved'),
        (3, 'pending.owner@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$i179d3rRs3fEVIJKgegz0JVYuPpkyMyiuLn1/Ck/M4k=', 'owner', 'Pending Approval'),
        (4, 'suspended.owner@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$i179d3rRs3fEVIJKgegz0JVYuPpkyMyiuLn1/Ck/M4k=', 'owner', 'Suspended'),
        (5, 'player@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$v3/4TlfLwoF3bTBU4HzWGwL9TAY3Wv05ojgSWXW2pbQ=', 'player', 'Active'),
        (6, 'player2@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$v3/4TlfLwoF3bTBU4HzWGwL9TAY3Wv05ojgSWXW2pbQ=', 'player', 'Active'),
    ]
    cur.executemany("INSERT OR IGNORE INTO users (id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?);", users_data)

    # Seed Admin
    cur.execute("INSERT OR IGNORE INTO admins (id, user_id, full_name, status) VALUES (1, 1, 'TurfSync Platform Administrator', 'Active');")

    # Seed Owners
    owners_data = [
        (1, 2, 'Vikram Malhotra', 'Apex Sports Arena', '9876543210', '27ABCDE1234F1Z5', '123456789012', 'HDFC0001234', 1, 1, 1, 'Aadhaar', 'Company', json.dumps(['Football', 'Cricket', 'Badminton']), '1988-06-15', '/media/uploads/documents/vikram_id.pdf', '/media/uploads/documents/apex_ownership.pdf', 1, 1, 1, 'Approved'),
        (2, 3, 'Suresh Patel', 'Kickoff Sports Hub', '9876543222', '24AABCS1429B1Z2', '987654321098', 'SBIN0004567', 1, 6, 16, 'PAN', 'Individual', json.dumps(['Football', 'Tennis']), '1992-09-20', '/media/uploads/documents/suresh_id.pdf', '/media/uploads/documents/kickoff_proof.pdf', 0, 0, 0, 'Pending Approval'),
        (3, 4, 'Rajesh Kumar', 'Metro Sports Complex', '9876543333', '29XYZAB8899K1Z9', '555666777888', 'ICIC0009876', 1, 2, 6, 'Passport', 'Partnership', json.dumps(['Cricket', 'Badminton']), '1985-11-10', '/media/uploads/documents/rajesh_id.pdf', '/media/uploads/documents/metro_proof.pdf', 1, 1, 1, 'Suspended')
    ]
    cur.executemany("""
    INSERT OR IGNORE INTO owners (
        id, user_id, full_name, brand_name, mobile, gst_number, bank_account_number, bank_ifsc,
        country_id, state_id, city_id, id_proof_type, owner_type, sports_offered, date_of_birth,
        id_proof_file, business_proof_file, verification_id_proof, verification_ownership_proof,
        verification_bank_details, account_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, owners_data)

    # Seed Players
    players_data = [
        (1, 5, 'Rahul Sharma', '9123456780', 'Thunder Strikers', 'Male', 1, 1, json.dumps(['Football', 'Cricket']), '1998-04-12', '/media/uploads/profiles/rahul.jpg'),
        (2, 6, 'Ananya Verma', '9123456781', 'Smashers FC', 'Female', 2, 6, json.dumps(['Badminton', 'Tennis']), '2001-08-25', '/media/uploads/profiles/ananya.jpg')
    ]
    cur.executemany("INSERT OR IGNORE INTO players (id, user_id, full_name, mobile, team_name, gender, state_id, city_id, preferred_sports, date_of_birth, profile_photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", players_data)

    # Seed Turfs
    turfs_data = [
        (1, 1, 'Apex Arena 1 - FIFA AstroTurf', 'Plot 45, Andheri Sports Complex Road, Andheri West', 'Opposite Citi Mall', '9876543210', 'https://maps.google.com/?q=19.1363,72.8276', 'Premium FIFA-certified 5-a-side artificial turf with professional shock pads and floodlights.', 'Only turf shoes or studs allowed. No smoking or chewing gum on the pitch.', 'Full refund if cancelled at least 24 hours prior to slot start time.', 'Football', 'Artificial Turf', '5-a-side', 1, 1, '400053', 1200.0, 1500.0, 14, 30, '06:00:00', '23:00:00', 'Outdoor', 'Manual', json.dumps(['Floodlights', 'Changing Room', 'Washroom', 'Drinking Water', 'Parking', 'Equipment Rental']), 'Active', json.dumps(['https://images.unsplash.com/photo-1529900240041-dd2c1bb52b11?auto=format&fit=crop&w=1000&q=80', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80'])),
        (2, 1, 'Apex Indoor Box Cricket', 'Plot 47, Andheri Sports Complex Road, Andheri West', 'Near Metro Station', '9876543210', 'https://maps.google.com/?q=19.1365,72.8280', 'Air-conditioned high-ceiling indoor turf designed for box cricket and badminton.', 'Non-marking shoes only. Soft leather or tennis balls provided on request.', 'Full refund if cancelled at least 24 hours prior to slot start time.', 'Cricket', 'Synthetic', 'Full Size', 1, 1, '400053', 1000.0, 1300.0, 16, 30, '07:00:00', '22:00:00', 'Indoor', 'Manual', json.dumps(['Floodlights', 'Washroom', 'Drinking Water', 'Parking', 'Equipment Rental', 'Cafeteria']), 'Active', json.dumps(['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1000&q=80'])),
        (3, 1, 'Apex Shuttle Pro Badminton Court', 'Level 2, Apex Complex, Andheri West', 'Beside Fun Republic', '9876543210', 'https://maps.google.com/?q=19.1370,72.8290', 'BWF approved wooden surface badminton court with glare-free LED lighting.', 'Strictly non-marking indoor shoes. Carry your own rackets or rent at front desk.', 'Full refund if cancelled at least 24 hours prior to slot start time.', 'Badminton', 'Wooden', 'Full Size', 1, 1, '400053', 600.0, 800.0, 6, 14, '06:00:00', '22:00:00', 'Indoor', 'Manual', json.dumps(['Changing Room', 'Washroom', 'Drinking Water', 'Parking', 'Equipment Rental']), 'Active', json.dumps(['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=80']))
    ]
    cur.executemany("""
    INSERT OR IGNORE INTO turfs (
        id, owner_id, name, address, landmark, contact_number, google_maps_link,
        description, rules, cancellation_policy, sport, surface, size, state_id, city_id,
        pincode, weekday_price_per_hour, weekend_price_per_hour, max_players,
        advance_booking_limit_days, opening_time, closing_time, turf_type,
        booking_approval_mode, amenities, status, photos
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, turfs_data)

    # Seed Slots for next 7 days
    from datetime import timedelta
    today_dt = date.today()
    slots_data = []
    slot_id_counter = 1

    turf_schedules = [
        (1, [('06:00:00', '07:00:00'), ('07:00:00', '08:00:00'), ('08:00:00', '09:00:00'), ('09:00:00', '10:00:00'), ('16:00:00', '17:00:00'), ('17:00:00', '18:00:00'), ('18:00:00', '19:00:00'), ('19:00:00', '20:00:00'), ('20:00:00', '21:00:00'), ('21:00:00', '22:00:00')], 1200.0),
        (2, [('07:00:00', '08:00:00'), ('08:00:00', '09:00:00'), ('09:00:00', '10:00:00'), ('10:00:00', '11:00:00'), ('16:00:00', '17:00:00'), ('17:00:00', '18:00:00'), ('18:00:00', '19:00:00'), ('19:00:00', '20:00:00'), ('20:00:00', '21:00:00')], 1000.0),
        (3, [('06:00:00', '07:00:00'), ('07:00:00', '08:00:00'), ('08:00:00', '09:00:00'), ('17:00:00', '18:00:00'), ('18:00:00', '19:00:00'), ('19:00:00', '20:00:00'), ('20:00:00', '21:00:00')], 600.0)
    ]

    for day_offset in range(8):
        s_date = (today_dt + timedelta(days=day_offset)).isoformat()
        for t_id, times, price in turf_schedules:
            for st, et in times:
                is_peak = 1 if st >= '17:00:00' else 0
                status_val = 'Booked' if (day_offset == 0 and t_id == 1 and st == '17:00:00') else 'Open'
                slots_data.append((slot_id_counter, t_id, s_date, st, et, 60, None, price, None, is_peak, status_val, None))
                slot_id_counter += 1

    cur.executemany("INSERT OR IGNORE INTO slots (id, turf_id, slot_date, start_time, end_time, duration_minutes, price_override, effective_price, max_players_override, is_peak_hour, status, block_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", slots_data)

    # Seed Bookings
    cur.execute("""
    INSERT OR IGNORE INTO booking_requests (
        id, booking_reference, player_id, turf_id, booking_date, number_of_players, team_name,
        add_ons, payment_preference, special_requests, rules_accepted, total_amount,
        advance_payment_received, status
    ) VALUES (
        1, 'TS-20261102-001', 1, 1, ?, 10, 'Thunder Strikers',
        '[{"name": "Equipment Rental", "price": 100}]', 'Pay at Turf',
        'Please keep footballs ready.', 1, 1300.0, 1, 'Approved'
    );
    """, (today,))

    cur.execute("INSERT OR IGNORE INTO booking_slots (id, booking_request_id, slot_id, slot_price) VALUES (1, 1, 3, 1200.0);")

    # High-Performance Indexes for Instant Queries
    cur.executescript("""
    CREATE INDEX IF NOT EXISTS idx_slots_turf_date ON slots(turf_id, slot_date);
    CREATE INDEX IF NOT EXISTS idx_slots_turf_status ON slots(turf_id, status);
    CREATE INDEX IF NOT EXISTS idx_booking_slots_slot ON booking_slots(slot_id);
    CREATE INDEX IF NOT EXISTS idx_booking_slots_request ON booking_slots(booking_request_id);
    CREATE INDEX IF NOT EXISTS idx_booking_requests_turf ON booking_requests(turf_id, status);
    CREATE INDEX IF NOT EXISTS idx_booking_requests_player ON booking_requests(player_id);
    CREATE INDEX IF NOT EXISTS idx_turfs_owner ON turfs(owner_id, is_deleted);
    CREATE INDEX IF NOT EXISTS idx_turfs_sport_status ON turfs(sport, status);
    CREATE INDEX IF NOT EXISTS idx_cities_state ON cities(state_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    """)

    conn.commit()
    conn.close()
    print("✅ TurfSync SQLite Fallback Database initialized successfully!")

# Ensure database exists on load
init_sqlite_db()
