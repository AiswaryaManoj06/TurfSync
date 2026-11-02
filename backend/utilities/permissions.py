"""
Role-based Permissions for TurfSync (Strict Direct SQL - NO ORM)
"""
from rest_framework.permissions import BasePermission

class IsAuthenticatedDirectSQL(BasePermission):
    """Requires a valid authenticated direct SQL user."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

class IsAdminUserRole(BasePermission):
    """Allows access only to active Admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin' and
            request.user.status == 'Active'
        )

class IsApprovedOwnerRole(BasePermission):
    """
    Allows access only to Approved Turf Owners.
    Pending, Rejected, or Suspended owners are blocked from managing turfs/slots.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role == 'owner'):
            return False
        # Must be approved
        account_status = request.user.raw_data.get('account_status')
        return account_status == 'Approved'

class IsOwnerRole(BasePermission):
    """Allows access to any Turf Owner (e.g. for checking profile/approval status)."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'owner'
        )

class IsPlayerRole(BasePermission):
    """Allows access only to registered Players."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'player'
        )
