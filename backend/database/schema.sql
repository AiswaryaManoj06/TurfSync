-- TurfSync Database Schema (PostgreSQL)
-- Strict Direct SQL Implementation - NO ORM

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS admin_audit_logs CASCADE;
DROP TABLE IF EXISTS booking_status_history CASCADE;
DROP TABLE IF EXISTS booking_slots CASCADE;
DROP TABLE IF EXISTS booking_requests CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP TABLE IF EXISTS turfs CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS owners CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS states CASCADE;
DROP TABLE IF EXISTS countries CASCADE;

-- Master Geography Tables
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Core Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'owner', 'player')),
    status VARCHAR(25) NOT NULL DEFAULT 'Active' CHECK (status IN ('Pending Approval', 'Approved', 'Rejected', 'Suspended', 'Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admin Details (Admins are inserted directly in DB; no registration form)
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Turf Owner Details
CREATE TABLE owners (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    brand_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    gst_number VARCHAR(15),
    bank_account_number VARCHAR(25) NOT NULL,
    bank_ifsc VARCHAR(15) NOT NULL,
    country_id INTEGER REFERENCES countries(id),
    state_id INTEGER REFERENCES states(id),
    city_id INTEGER REFERENCES cities(id),
    id_proof_type VARCHAR(50) NOT NULL CHECK (id_proof_type IN ('Aadhaar', 'PAN', 'Passport', 'Driving Licence')),
    owner_type VARCHAR(50) NOT NULL CHECK (owner_type IN ('Individual', 'Partnership', 'Company')),
    sports_offered TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    date_of_birth DATE NOT NULL,
    id_proof_file VARCHAR(500) NOT NULL,
    business_proof_file VARCHAR(500) NOT NULL,
    verification_id_proof BOOLEAN NOT NULL DEFAULT FALSE,
    verification_ownership_proof BOOLEAN NOT NULL DEFAULT FALSE,
    verification_bank_details BOOLEAN NOT NULL DEFAULT FALSE,
    rejection_category VARCHAR(100),
    rejection_reason VARCHAR(250),
    admin_note VARCHAR(250),
    account_status VARCHAR(25) NOT NULL DEFAULT 'Pending Approval' CHECK (account_status IN ('Pending Approval', 'Approved', 'Rejected', 'Suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Player Details
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    team_name VARCHAR(30),
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    state_id INTEGER REFERENCES states(id),
    city_id INTEGER REFERENCES cities(id),
    preferred_sports TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    date_of_birth DATE NOT NULL,
    profile_photo VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Turfs Table
CREATE TABLE turfs (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    landmark VARCHAR(255),
    contact_number VARCHAR(15) NOT NULL,
    google_maps_link VARCHAR(500),
    description VARCHAR(500),
    rules VARCHAR(500),
    cancellation_policy TEXT DEFAULT 'Full refund if cancelled at least 24 hours prior to slot start time.',
    sport VARCHAR(50) NOT NULL CHECK (sport IN ('Football', 'Cricket', 'Badminton', 'Basketball', 'Tennis', 'Pickleball')),
    surface VARCHAR(50) NOT NULL CHECK (surface IN ('Natural Grass', 'Artificial Turf', 'Wooden', 'Synthetic')),
    size VARCHAR(50) NOT NULL CHECK (size IN ('5-a-side', '7-a-side', '9-a-side', 'Full Size')),
    state_id INTEGER NOT NULL REFERENCES states(id),
    city_id INTEGER NOT NULL REFERENCES cities(id),
    pincode VARCHAR(10) NOT NULL,
    weekday_price_per_hour NUMERIC(10, 2) NOT NULL CHECK (weekday_price_per_hour > 0),
    weekend_price_per_hour NUMERIC(10, 2) NOT NULL CHECK (weekend_price_per_hour > 0),
    max_players INTEGER NOT NULL CHECK (max_players > 0),
    advance_booking_limit_days INTEGER NOT NULL DEFAULT 30 CHECK (advance_booking_limit_days BETWEEN 1 AND 90),
    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,
    turf_type VARCHAR(20) NOT NULL CHECK (turf_type IN ('Indoor', 'Outdoor')),
    booking_approval_mode VARCHAR(20) NOT NULL DEFAULT 'Manual',
    amenities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    photos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_turf_owner_city_name UNIQUE (owner_id, city_id, name),
    CONSTRAINT chk_closing_after_opening CHECK (closing_time > opening_time)
);

-- Slots Table
CREATE TABLE slots (
    id SERIAL PRIMARY KEY,
    turf_id INTEGER NOT NULL REFERENCES turfs(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (30, 60, 90)),
    price_override NUMERIC(10, 2) CHECK (price_override IS NULL OR price_override >= 0),
    max_players_override INTEGER CHECK (max_players_override IS NULL OR max_players_override > 0),
    is_peak_hour BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Requested', 'Booked', 'Blocked', 'Closed')),
    block_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_slot_end_after_start CHECK (end_time > start_time),
    CONSTRAINT uq_turf_slot_time UNIQUE (turf_id, slot_date, start_time, end_time)
);

-- Booking Requests Table
CREATE TABLE booking_requests (
    id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(30) UNIQUE NOT NULL,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    turf_id INTEGER NOT NULL REFERENCES turfs(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    number_of_players INTEGER NOT NULL CHECK (number_of_players > 0),
    team_name VARCHAR(50),
    add_ons JSONB NOT NULL DEFAULT '[]'::JSONB,
    payment_preference VARCHAR(50) NOT NULL CHECK (payment_preference IN ('Pay at Turf', 'Pay Online After Approval')),
    special_requests VARCHAR(250),
    rules_accepted BOOLEAN NOT NULL DEFAULT TRUE CHECK (rules_accepted = TRUE),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    advance_payment_received BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Expired', 'Cancelled', 'Completed', 'No-Show')),
    rejection_category VARCHAR(100) CHECK (rejection_category IS NULL OR rejection_category IN ('Slot Unavailable', 'Maintenance', 'Private Event', 'Incomplete Details', 'Other')),
    rejection_reason VARCHAR(250),
    cancellation_reason VARCHAR(250),
    owner_note VARCHAR(250),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Booking Slots Join Table
CREATE TABLE booking_slots (
    id SERIAL PRIMARY KEY,
    booking_request_id INTEGER NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
    slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    slot_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_booking_slot UNIQUE (booking_request_id, slot_id)
);

-- Booking Request Status History (Timeline tracking)
CREATE TABLE booking_status_history (
    id SERIAL PRIMARY KEY,
    booking_request_id INTEGER NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason_or_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admin Audit Logs
CREATE TABLE admin_audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    target_owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    reason_or_note VARCHAR(250),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- In-App Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    reference_id INTEGER,
    reference_type VARCHAR(50),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
