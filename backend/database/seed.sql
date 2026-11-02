-- TurfSync Seed Data (PostgreSQL)

-- 1. Master Countries, States, Cities
INSERT INTO countries (name, code) VALUES
('India', 'IN')
ON CONFLICT (code) DO NOTHING;

INSERT INTO states (country_id, name, code) VALUES
(1, 'Maharashtra', 'MH'),
(1, 'Karnataka', 'KA'),
(1, 'Kerala', 'KL'),
(1, 'Tamil Nadu', 'TN'),
(1, 'Delhi', 'DL'),
(1, 'Gujarat', 'GJ'),
(1, 'Andhra Pradesh', 'AP'),
(1, 'Arunachal Pradesh', 'AR'),
(1, 'Assam', 'AS'),
(1, 'Bihar', 'BR'),
(1, 'Chhattisgarh', 'CG'),
(1, 'Goa', 'GA'),
(1, 'Haryana', 'HR'),
(1, 'Himachal Pradesh', 'HP'),
(1, 'Jharkhand', 'JH'),
(1, 'Madhya Pradesh', 'MP'),
(1, 'Manipur', 'MN'),
(1, 'Meghalaya', 'ML'),
(1, 'Mizoram', 'MZ'),
(1, 'Nagaland', 'NL'),
(1, 'Odisha', 'OD'),
(1, 'Punjab', 'PB'),
(1, 'Rajasthan', 'RJ'),
(1, 'Sikkim', 'SK'),
(1, 'Telangana', 'TG'),
(1, 'Tripura', 'TR'),
(1, 'Uttar Pradesh', 'UP'),
(1, 'Uttarakhand', 'UK'),
(1, 'West Bengal', 'WB'),
(1, 'Andaman and Nicobar Islands', 'AN'),
(1, 'Chandigarh', 'CH'),
(1, 'Dadra and Nagar Haveli and Daman and Diu', 'DN'),
(1, 'Jammu and Kashmir', 'JK'),
(1, 'Ladakh', 'LA'),
(1, 'Lakshadweep', 'LD'),
(1, 'Puducherry', 'PY');

INSERT INTO cities (state_id, name) VALUES
(1, 'Mumbai'), (1, 'Pune'), (1, 'Navi Mumbai'), (1, 'Thane'), (1, 'Nagpur'), (1, 'Nashik'),
(2, 'Bengaluru'), (2, 'Mysuru'), (2, 'Mangaluru'), (2, 'Hubballi'),
(3, 'Kochi'), (3, 'Kozhikode'), (3, 'Thiruvananthapuram'), (3, 'Thrissur'),
(4, 'Chennai'), (4, 'Coimbatore'), (4, 'Madurai'), (4, 'Tiruchirappalli'),
(5, 'New Delhi'), (5, 'South Delhi'), (5, 'North Delhi'), (5, 'Central Delhi'),
(6, 'Ahmedabad'), (6, 'Surat'), (6, 'Vadodara'), (6, 'Rajkot'),
(7, 'Visakhapatnam'), (7, 'Vijayawada'), (7, 'Guntur'), (7, 'Tirupati'),
(8, 'Itanagar'), (8, 'Naharlagun'), (8, 'Pasighat'),
(9, 'Guwahati'), (9, 'Silchar'), (9, 'Dibrugarh'), (9, 'Jorhat'),
(10, 'Patna'), (10, 'Gaya'), (10, 'Bhagalpur'), (10, 'Muzaffarpur'),
(11, 'Raipur'), (11, 'Bhilai'), (11, 'Bilaspur'), (11, 'Korba'),
(12, 'Panaji'), (12, 'Margao'), (12, 'Vasco da Gama'), (12, 'Mapusa'),
(13, 'Gurugram'), (13, 'Faridabad'), (13, 'Panipat'), (13, 'Ambala'),
(14, 'Shimla'), (14, 'Dharamshala'), (14, 'Solan'), (14, 'Mandi'),
(15, 'Ranchi'), (15, 'Jamshedpur'), (15, 'Dhanbad'), (15, 'Bokaro'),
(16, 'Bhopal'), (16, 'Indore'), (16, 'Gwalior'), (16, 'Jabalpur'),
(17, 'Imphal'), (17, 'Churachandpur'), (17, 'Thoubal'),
(18, 'Shillong'), (18, 'Tura'), (18, 'Jowai'),
(19, 'Aizawl'), (19, 'Lunglei'), (19, 'Champhai'),
(20, 'Kohima'), (20, 'Dimapur'), (20, 'Mokokchung'),
(21, 'Bhubaneswar'), (21, 'Cuttack'), (21, 'Rourkela'), (21, 'Puri'),
(22, 'Ludhiana'), (22, 'Amritsar'), (22, 'Jalandhar'), (22, 'Patiala'), (22, 'Mohali'),
(23, 'Jaipur'), (23, 'Jodhpur'), (23, 'Udaipur'), (23, 'Kota'),
(24, 'Gangtok'), (24, 'Namchi'), (24, 'Geyzing'),
(25, 'Hyderabad'), (25, 'Warangal'), (25, 'Nizamabad'), (25, 'Karimnagar'),
(26, 'Agartala'), (26, 'Dharmanagar'), (26, 'Udaipur'),
(27, 'Lucknow'), (27, 'Noida'), (27, 'Kanpur'), (27, 'Varanasi'), (27, 'Agra'), (27, 'Ghaziabad'),
(28, 'Dehradun'), (28, 'Haridwar'), (28, 'Roorkee'), (28, 'Rishikesh'),
(29, 'Kolkata'), (29, 'Howrah'), (29, 'Siliguri'), (29, 'Durgapur'),
(30, 'Port Blair'),
(31, 'Chandigarh'),
(32, 'Daman'), (32, 'Diu'), (32, 'Silvassa'),
(33, 'Srinagar'), (33, 'Jammu'), (33, 'Anantnag'),
(34, 'Leh'), (34, 'Kargil'),
(35, 'Kavaratti'), (35, 'Agatti'),
(36, 'Puducherry'), (36, 'Karaikal');

-- 2. Users (Admin, Owners, Players)
-- Passwords:
-- Admin@123  -> pbkdf2_sha256$390000$turfsyncsalt123$gm9VYwNcaSiKJS9My5BVWjqNWWTxjr01mgxjYiNyAks=
-- Owner@123  -> pbkdf2_sha256$390000$turfsyncsalt123$i179d3rRs3fEVIJKgegz0JVYuPpkyMyiuLn1/Ck/M4k=
-- Player@123 -> pbkdf2_sha256$390000$turfsyncsalt123$v3/4TlfLwoF3bTBU4HzWGwL9TAY3Wv05ojgSWXW2pbQ=

INSERT INTO users (id, email, password_hash, role, status) VALUES
(1, 'admin@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$gm9VYwNcaSiKJS9My5BVWjqNWWTxjr01mgxjYiNyAks=', 'admin', 'Active'),
(2, 'owner@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$i179d3rRs3fEVIJKgegz0JVYuPpkyMyiuLn1/Ck/M4k=', 'owner', 'Approved'),
(3, 'pending.owner@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$i179d3rRs3fEVIJKgegz0JVYuPpkyMyiuLn1/Ck/M4k=', 'owner', 'Pending Approval'),
(4, 'suspended.owner@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$i179d3rRs3fEVIJKgegz0JVYuPpkyMyiuLn1/Ck/M4k=', 'owner', 'Suspended'),
(5, 'player@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$v3/4TlfLwoF3bTBU4HzWGwL9TAY3Wv05ojgSWXW2pbQ=', 'player', 'Active'),
(6, 'player2@turfsync.com', 'pbkdf2_sha256$390000$turfsyncsalt123$v3/4TlfLwoF3bTBU4HzWGwL9TAY3Wv05ojgSWXW2pbQ=', 'player', 'Active');

ALTER SEQUENCE users_id_seq RESTART WITH 10;

-- 3. Admin Details (Inserted directly in database)
INSERT INTO admins (id, user_id, full_name, status) VALUES
(1, 1, 'TurfSync Platform Administrator', 'Active');

ALTER SEQUENCE admins_id_seq RESTART WITH 5;

-- 4. Owners Details
INSERT INTO owners (
    id, user_id, full_name, brand_name, mobile, gst_number, bank_account_number, bank_ifsc,
    country_id, state_id, city_id, id_proof_type, owner_type, sports_offered, date_of_birth,
    id_proof_file, business_proof_file, verification_id_proof, verification_ownership_proof,
    verification_bank_details, account_status
) VALUES
(
    1, 2, 'Vikram Malhotra', 'Apex Sports Arena', '9876543210', '27ABCDE1234F1Z5', '123456789012', 'HDFC0001234',
    1, 1, 1, 'Aadhaar', 'Company', ARRAY['Football', 'Cricket', 'Badminton'], '1988-06-15',
    '/media/uploads/documents/vikram_id.pdf', '/media/uploads/documents/apex_ownership.pdf',
    TRUE, TRUE, TRUE, 'Approved'
),
(
    2, 3, 'Suresh Patel', 'Kickoff Sports Hub', '9876543222', '24AABCS1429B1Z2', '987654321098', 'SBIN0004567',
    1, 6, 8, 'PAN', 'Individual', ARRAY['Football', 'Tennis'], '1992-09-20',
    '/media/uploads/documents/suresh_id.pdf', '/media/uploads/documents/kickoff_proof.pdf',
    FALSE, FALSE, FALSE, 'Pending Approval'
),
(
    3, 4, 'Rajesh Kumar', 'Metro Sports Complex', '9876543333', '29XYZAB8899K1Z9', '555666777888', 'ICIC0009876',
    1, 2, 3, 'Passport', 'Partnership', ARRAY['Cricket', 'Badminton'], '1985-11-10',
    '/media/uploads/documents/rajesh_id.pdf', '/media/uploads/documents/metro_proof.pdf',
    TRUE, TRUE, TRUE, 'Suspended'
);

ALTER SEQUENCE owners_id_seq RESTART WITH 10;

-- 5. Players Details
INSERT INTO players (
    id, user_id, full_name, mobile, team_name, gender, state_id, city_id,
    preferred_sports, date_of_birth, profile_photo
) VALUES
(
    1, 5, 'Rahul Sharma', '9123456780', 'Thunder Strikers', 'Male', 1, 1,
    ARRAY['Football', 'Cricket'], '1998-04-12', '/media/uploads/profiles/rahul.jpg'
),
(
    2, 6, 'Ananya Verma', '9123456781', 'Smashers FC', 'Female', 2, 3,
    ARRAY['Badminton', 'Tennis'], '2001-08-25', '/media/uploads/profiles/ananya.jpg'
);

ALTER SEQUENCE players_id_seq RESTART WITH 10;

-- 6. Turfs Details
INSERT INTO turfs (
    id, owner_id, name, address, landmark, contact_number, google_maps_link,
    description, rules, cancellation_policy, sport, surface, size, state_id, city_id,
    pincode, weekday_price_per_hour, weekend_price_per_hour, max_players,
    advance_booking_limit_days, opening_time, closing_time, turf_type,
    booking_approval_mode, amenities, status, photos
) VALUES
(
    1, 1, 'Apex Arena 1 - FIFA AstroTurf', 'Plot 45, Andheri Sports Complex Road, Andheri West', 'Opposite Citi Mall',
    '9876543210', 'https://maps.google.com/?q=19.1363,72.8276',
    'Premium FIFA-certified 5-a-side artificial turf with professional shock pads and floodlights.',
    'Only turf shoes or studs allowed. No smoking or chewing gum on the pitch. Arrive 10 mins before slot.',
    'Full refund if cancelled at least 24 hours prior to slot start time.',
    'Football', 'Artificial Turf', '5-a-side', 1, 1, '400053',
    1200.00, 1500.00, 14, 30, '06:00:00', '23:00:00', 'Outdoor', 'Manual',
    ARRAY['Floodlights', 'Changing Room', 'Washroom', 'Drinking Water', 'Parking', 'Equipment Rental'],
    'Active',
    ARRAY['https://images.unsplash.com/photo-1529900240041-dd2c1bb52b11?auto=format&fit=crop&w=1000&q=80', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80']
),
(
    2, 1, 'Apex Indoor Box Cricket', 'Plot 47, Andheri Sports Complex Road, Andheri West', 'Near Metro Station',
    '9876543210', 'https://maps.google.com/?q=19.1365,72.8280',
    'Air-conditioned high-ceiling indoor turf designed for box cricket and badminton.',
    'Non-marking shoes only. Soft leather or tennis balls provided on request.',
    'Full refund if cancelled at least 24 hours prior to slot start time.',
    'Cricket', 'Synthetic', 'Full Size', 1, 1, '400053',
    1000.00, 1300.00, 16, 30, '07:00:00', '22:00:00', 'Indoor', 'Manual',
    ARRAY['Floodlights', 'Washroom', 'Drinking Water', 'Parking', 'Equipment Rental', 'Cafeteria'],
    'Active',
    ARRAY['https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1000&q=80']
),
(
    3, 1, 'Apex Shuttle Pro Badminton Court', 'Level 2, Apex Complex, Andheri West', 'Beside Fun Republic',
    '9876543210', 'https://maps.google.com/?q=19.1370,72.8290',
    'BWF approved wooden surface badminton court with glare-free LED lighting.',
    'Strictly non-marking indoor shoes. Carry your own rackets or rent at front desk.',
    'Full refund if cancelled at least 24 hours prior to slot start time.',
    'Badminton', 'Wooden', 'Full Size', 1, 1, '400053',
    600.00, 800.00, 6, 14, '06:00:00', '22:00:00', 'Indoor', 'Manual',
    ARRAY['Changing Room', 'Washroom', 'Drinking Water', 'Parking', 'Equipment Rental'],
    'Active',
    ARRAY['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=80']
);

ALTER SEQUENCE turfs_id_seq RESTART WITH 10;

-- 7. Slots for Today and Tomorrow
-- Current date slots
INSERT INTO slots (id, turf_id, slot_date, start_time, end_time, duration_minutes, is_peak_hour, status) VALUES
(1, 1, CURRENT_DATE, '06:00:00', '07:00:00', 60, FALSE, 'Open'),
(2, 1, CURRENT_DATE, '07:00:00', '08:00:00', 60, FALSE, 'Open'),
(3, 1, CURRENT_DATE, '17:00:00', '18:00:00', 60, TRUE, 'Booked'),
(4, 1, CURRENT_DATE, '18:00:00', '19:00:00', 60, TRUE, 'Requested'),
(5, 1, CURRENT_DATE, '19:00:00', '20:00:00', 60, TRUE, 'Open'),
(6, 1, CURRENT_DATE, '20:00:00', '21:00:00', 60, TRUE, 'Blocked'),

-- Tomorrow slots
(7, 1, CURRENT_DATE + 1, '06:00:00', '07:00:00', 60, FALSE, 'Open'),
(8, 1, CURRENT_DATE + 1, '07:00:00', '08:00:00', 60, FALSE, 'Open'),
(9, 1, CURRENT_DATE + 1, '18:00:00', '19:00:00', 60, TRUE, 'Open'),
(10, 1, CURRENT_DATE + 1, '19:00:00', '20:00:00', 60, TRUE, 'Open'),

-- Turf 2 Slots
(11, 2, CURRENT_DATE, '07:00:00', '08:00:00', 60, FALSE, 'Open'),
(12, 2, CURRENT_DATE, '08:00:00', '09:00:00', 60, FALSE, 'Open'),
(13, 2, CURRENT_DATE, '19:00:00', '20:00:00', 60, TRUE, 'Open'),
(14, 2, CURRENT_DATE + 1, '19:00:00', '20:00:00', 60, TRUE, 'Open'),

-- Turf 3 Slots
(15, 3, CURRENT_DATE, '06:00:00', '07:00:00', 60, FALSE, 'Open'),
(16, 3, CURRENT_DATE, '07:00:00', '08:00:00', 60, FALSE, 'Open'),
(17, 3, CURRENT_DATE, '18:00:00', '19:00:00', 60, TRUE, 'Open');

ALTER SEQUENCE slots_id_seq RESTART WITH 50;

-- 8. Booking Requests
INSERT INTO booking_requests (
    id, booking_reference, player_id, turf_id, booking_date, number_of_players, team_name,
    add_ons, payment_preference, special_requests, rules_accepted, total_amount,
    advance_payment_received, status, created_at, expires_at
) VALUES
(
    1, 'TS-20261102-001', 1, 1, CURRENT_DATE, 10, 'Thunder Strikers',
    '[{"name": "Equipment Rental", "price": 100}]'::JSONB, 'Pay at Turf',
    'Please keep footballs ready.', TRUE, 1300.00,
    TRUE, 'Approved', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP + INTERVAL '10 hours'
),
(
    2, 'TS-20261102-002', 2, 1, CURRENT_DATE, 10, 'Smashers FC',
    '[]'::JSONB, 'Pay Online After Approval',
    'First time booking, looking forward.', TRUE, 1200.00,
    FALSE, 'Pending', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '11 hours'
);

ALTER SEQUENCE booking_requests_id_seq RESTART WITH 10;

-- 9. Booking Slots
INSERT INTO booking_slots (booking_request_id, slot_id, slot_price) VALUES
(1, 3, 1200.00),
(2, 4, 1200.00);

-- 10. Status History
INSERT INTO booking_status_history (booking_request_id, from_status, to_status, changed_by_user_id, reason_or_note) VALUES
(1, 'Pending', 'Pending', 5, 'Booking request submitted by player'),
(1, 'Pending', 'Approved', 2, 'Approved by turf owner Vikram Malhotra. Slot confirmed.'),
(2, 'Pending', 'Pending', 6, 'Booking request submitted by player');

-- 11. Notifications
INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type) VALUES
(2, 'New Booking Request', 'Player Rahul Sharma sent a booking request TS-20261102-001 for Apex Arena 1.', 'BOOKING_REQUEST', 1, 'booking'),
(5, 'Booking Approved!', 'Your booking TS-20261102-001 has been approved by Apex Sports Arena.', 'BOOKING_APPROVED', 1, 'booking'),
(2, 'New Booking Request', 'Player Ananya Verma sent a booking request TS-20261102-002 for Apex Arena 1.', 'BOOKING_REQUEST', 2, 'booking');

-- 12. Audit Logs
INSERT INTO admin_audit_logs (admin_id, target_owner_id, action, previous_status, new_status, reason_or_note) VALUES
(1, 1, 'APPROVE_OWNER', 'Pending Approval', 'Approved', 'Verified ID proof, company registration and bank details.'),
(1, 3, 'SUSPEND_OWNER', 'Approved', 'Suspended', 'Suspended due to renovation and pending licensing updates.');
