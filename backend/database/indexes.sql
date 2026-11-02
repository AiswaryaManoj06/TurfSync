-- TurfSync Database Indexes (PostgreSQL)

-- Indexes on Users and Authentication
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Indexes on Owners
CREATE INDEX idx_owners_user_id ON owners(user_id);
CREATE INDEX idx_owners_account_status ON owners(account_status);
CREATE INDEX idx_owners_city_id ON owners(city_id);
CREATE INDEX idx_owners_state_id ON owners(state_id);
CREATE INDEX idx_owners_owner_type ON owners(owner_type);
CREATE INDEX idx_owners_created_at ON owners(created_at DESC);

-- Indexes on Turfs
CREATE INDEX idx_turfs_owner_id ON turfs(owner_id);
CREATE INDEX idx_turfs_city_id ON turfs(city_id);
CREATE INDEX idx_turfs_sport ON turfs(sport);
CREATE INDEX idx_turfs_status ON turfs(status);
CREATE INDEX idx_turfs_weekday_price ON turfs(weekday_price_per_hour);
CREATE INDEX idx_turfs_weekend_price ON turfs(weekend_price_per_hour);

-- Indexes on Slots
CREATE INDEX idx_slots_turf_date ON slots(turf_id, slot_date);
CREATE INDEX idx_slots_status ON slots(status);
CREATE INDEX idx_slots_start_time ON slots(start_time);

-- Indexes on Booking Requests
CREATE INDEX idx_bookings_player_id ON booking_requests(player_id);
CREATE INDEX idx_bookings_turf_id ON booking_requests(turf_id);
CREATE INDEX idx_bookings_status ON booking_requests(status);
CREATE INDEX idx_bookings_date ON booking_requests(booking_date);
CREATE INDEX idx_bookings_created_at ON booking_requests(created_at DESC);
CREATE INDEX idx_bookings_expires_at ON booking_requests(expires_at);

-- Indexes on Booking Slots & History
CREATE INDEX idx_booking_slots_slot_id ON booking_slots(slot_id);
CREATE INDEX idx_booking_slots_req_id ON booking_slots(booking_request_id);
CREATE INDEX idx_booking_history_req_id ON booking_status_history(booking_request_id);

-- Indexes on Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- Indexes on Admin Audit Logs
CREATE INDEX idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_target_owner ON admin_audit_logs(target_owner_id);
CREATE INDEX idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);
