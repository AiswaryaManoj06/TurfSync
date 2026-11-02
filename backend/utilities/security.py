"""
Security and JWT Authentication Utilities for TurfSync.
Strictly NO-ORM: Authenticates against raw SQL user records.
"""
import os
import hmac
import hashlib
import base64
import jwt
from datetime import datetime, timedelta, timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from database.connection import query_one

SECRET_KEY = os.getenv("SECRET_KEY", "turfsync-super-secret-key-production-ready-2026-secure!@#")
JWT_SECRET = os.getenv("JWT_SECRET", "turfsync-jwt-secret-token-key-2026-auth")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

def hash_password(password: str, salt: str = None) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with 390,000 iterations."""
    if not salt:
        salt = base64.b64encode(os.urandom(16)).decode('ascii').strip().replace('=', '')
    iterations = 390000
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    b64_hash = base64.b64encode(key).decode('ascii').strip()
    return f"pbkdf2_sha256${iterations}${salt}${b64_hash}"

def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verifies a plain password against the stored PBKDF2 hash."""
    try:
        parts = stored_hash.split('$')
        if len(parts) != 4 or parts[0] != 'pbkdf2_sha256':
            return False
        iterations = int(parts[1])
        salt = parts[2]
        expected_hash = parts[3]
        key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), iterations)
        b64_hash = base64.b64encode(key).decode('ascii').strip()
        return hmac.compare_digest(b64_hash, expected_hash)
    except Exception:
        return False

def generate_jwt_token(user_id: int, email: str, role: str, status: str, extra_data: dict = None) -> str:
    """Generates a signed JWT access token for an authenticated user."""
    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "email": email,
        "role": role,
        "status": status,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    if extra_data:
        payload.update(extra_data)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    """Decodes and validates a JWT token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise exceptions.AuthenticationFailed("Token has expired.")
    except jwt.InvalidTokenError:
        raise exceptions.AuthenticationFailed("Invalid authentication token.")

class RawSQLUser:
    """Lightweight user object attached to request.user without using Django ORM."""
    def __init__(self, data: dict):
        self.id = data.get("id")
        self.pk = self.id
        self.email = data.get("email")
        self.role = data.get("role")
        self.status = data.get("status")
        self.full_name = data.get("full_name") or data.get("brand_name") or self.email
        self.is_authenticated = True
        self.is_active = self.status in ('Active', 'Approved')
        self.raw_data = data

    def __str__(self):
        return f"{self.email} ({self.role})"

class DirectSQLJWTAuthentication(BaseAuthentication):
    """
    Custom DRF Authentication class reading direct SQL users.
    Prohibits Django ORM calls.
    """
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        
        token = parts[1]
        payload = decode_jwt_token(token)
        user_id = payload.get("user_id")
        if not user_id:
            raise exceptions.AuthenticationFailed("Malformed token payload.")
        
        # Direct SQL fetch to verify current user state
        user_row = query_one(
            "SELECT id, email, role, status FROM users WHERE id = %s",
            (user_id,)
        )
        if not user_row:
            raise exceptions.AuthenticationFailed("User not found or deleted.")
        
        # Check active status for admin and player
        if user_row["role"] == "admin" and user_row["status"] != "Active":
            raise exceptions.AuthenticationFailed("Admin account is inactive.")
        
        # Gather role-specific details
        role = user_row["role"]
        extra = {}
        if role == "owner":
            owner_row = query_one("SELECT id, full_name, brand_name, account_status FROM owners WHERE user_id = %s", (user_id,))
            if owner_row:
                extra["owner_id"] = owner_row["id"]
                extra["full_name"] = owner_row["full_name"]
                extra["brand_name"] = owner_row["brand_name"]
                extra["account_status"] = owner_row["account_status"]
        elif role == "player":
            player_row = query_one("SELECT id, full_name, mobile FROM players WHERE user_id = %s", (user_id,))
            if player_row:
                extra["player_id"] = player_row["id"]
                extra["full_name"] = player_row["full_name"]
        elif role == "admin":
            admin_row = query_one("SELECT id, full_name, status FROM admins WHERE user_id = %s", (user_id,))
            if admin_row:
                extra["admin_id"] = admin_row["id"]
                extra["full_name"] = admin_row["full_name"]
        
        combined_data = {**user_row, **extra}
        return (RawSQLUser(combined_data), token)
