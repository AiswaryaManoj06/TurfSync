from django.urls import path
from .views import (
    AdminDashboardStatsView,
    AdminOwnersListView,
    AdminOwnerDetailView,
    AdminVerifyOwnerView,
    AdminRejectOwnerView,
    AdminToggleSuspendOwnerView,
    AdminBulkActionView,
    AdminAuditLogsView,
    AdminSoftDeleteOwnerView,
)

urlpatterns = [
    path("dashboard/", AdminDashboardStatsView.as_view(), name="admin_dashboard"),
    path("owners/", AdminOwnersListView.as_view(), name="admin_owners_list"),
    path("owners/<int:owner_id>/", AdminOwnerDetailView.as_view(), name="admin_owner_detail"),
    path("owners/<int:owner_id>/verify/", AdminVerifyOwnerView.as_view(), name="admin_verify_owner"),
    path("owners/<int:owner_id>/reject/", AdminRejectOwnerView.as_view(), name="admin_reject_owner"),
    path("owners/<int:owner_id>/toggle-status/", AdminToggleSuspendOwnerView.as_view(), name="admin_toggle_suspend"),
    path("owners/<int:owner_id>/delete/", AdminSoftDeleteOwnerView.as_view(), name="admin_delete_owner"),
    path("owners/bulk-action/", AdminBulkActionView.as_view(), name="admin_bulk_action"),
    path("audit-logs/", AdminAuditLogsView.as_view(), name="admin_audit_logs"),
]
