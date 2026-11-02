export type Role = 'admin' | 'owner' | 'player';
export type AccountStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Suspended' | 'Active' | 'Inactive';
export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Expired' | 'Cancelled' | 'Completed' | 'No-Show';
export type SlotStatus = 'Open' | 'Requested' | 'Booked' | 'Blocked' | 'Closed';

export interface User {
  id: number;
  email: string;
  role: Role;
  status: AccountStatus;
  full_name?: string;
  brand_name?: string;
  admin_id?: number;
  owner_id?: number;
  player_id?: number;
  account_status?: AccountStatus;
  rejection_reason?: string;
  mobile?: string;
  profile_photo?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface State {
  id: number;
  country_id: number;
  name: string;
  code?: string;
}

export interface City {
  id: number;
  state_id: number;
  name: string;
}

export interface LocationsResponse {
  countries: Country[];
  states: State[];
  cities: City[];
}

export interface Owner {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  brand_name: string;
  mobile: string;
  gst_number?: string;
  bank_account_number: string;
  masked_bank_account?: string;
  bank_ifsc: string;
  country_id?: number;
  state_id?: number;
  city_id?: number;
  state_name?: string;
  city_name?: string;
  country_name?: string;
  id_proof_type: 'Aadhaar' | 'PAN' | 'Passport' | 'Driving Licence';
  owner_type: 'Individual' | 'Partnership' | 'Company';
  sports_offered: string[];
  date_of_birth: string;
  id_proof_file: string;
  business_proof_file: string;
  verification_id_proof: boolean;
  verification_ownership_proof: boolean;
  verification_bank_details: boolean;
  rejection_category?: string;
  rejection_reason?: string;
  admin_note?: string;
  account_status: AccountStatus;
  turf_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Turf {
  id: number;
  owner_id: number;
  name: string;
  address: string;
  landmark?: string;
  contact_number: string;
  google_maps_link?: string;
  description?: string;
  rules?: string;
  cancellation_policy?: string;
  sport: 'Football' | 'Cricket' | 'Badminton' | 'Basketball' | 'Tennis' | 'Pickleball';
  surface: 'Natural Grass' | 'Artificial Turf' | 'Wooden' | 'Synthetic';
  size: '5-a-side' | '7-a-side' | '9-a-side' | 'Full Size';
  state_id: number;
  city_id: number;
  state_name?: string;
  city_name?: string;
  pincode: string;
  weekday_price_per_hour: number;
  weekend_price_per_hour: number;
  max_players: number;
  advance_booking_limit_days: number;
  opening_time: string;
  closing_time: string;
  turf_type: 'Indoor' | 'Outdoor';
  booking_approval_mode: string;
  amenities: string[];
  status: 'Active' | 'Inactive';
  photos: string[];
  owner_brand?: string;
  owner_name?: string;
  owner_mobile?: string;
  available_slots_today?: number;
  active_slots_count?: number;
  pending_requests_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface Slot {
  id: number;
  turf_id: number;
  turf_name?: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  price_override?: number;
  effective_price?: number;
  max_players_override?: number;
  is_peak_hour: boolean;
  status: SlotStatus;
  block_reason?: string;
  active_booking_request_id?: number;
  created_at?: string;
}

export interface AddOnItem {
  name: string;
  price: number;
}

export interface BookingRequest {
  id: number;
  booking_reference: string;
  player_id: number;
  turf_id: number;
  turf_name?: string;
  turf_address?: string;
  turf_sport?: string;
  owner_brand?: string;
  owner_contact?: string;
  player_name?: string;
  player_mobile?: string;
  booking_date: string;
  number_of_players: number;
  team_name?: string;
  add_ons: AddOnItem[];
  payment_preference: 'Pay at Turf' | 'Pay Online After Approval';
  special_requests?: string;
  rules_accepted: boolean;
  total_amount: number;
  advance_payment_received: boolean;
  status: BookingStatus;
  rejection_category?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  owner_note?: string;
  slot_start_times?: string[];
  slot_end_times?: string[];
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface BookingHistory {
  id: number;
  booking_request_id: number;
  from_status?: string;
  to_status: string;
  changed_by_email?: string;
  changed_by_role?: string;
  reason_or_note?: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  reference_id?: number;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  previous_status?: string;
  new_status?: string;
  reason_or_note?: string;
  created_at: string;
  admin_email?: string;
  admin_name?: string;
  owner_brand?: string;
  owner_name?: string;
  owner_id?: number;
}
