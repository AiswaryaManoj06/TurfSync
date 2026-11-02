from django.urls import path
from .views import (
    PlayerCreateBookingRequestView,
    PlayerRequestsListView,
    OwnerRequestsListView,
    BookingDetailView,
    ApproveBookingView,
    RejectBookingView,
    WithdrawBookingView,
    CancelApprovedBookingView,
    CloseBookingView,
    BulkBookingActionView,
)

urlpatterns = [
    path("request/", PlayerCreateBookingRequestView.as_view(), name="booking_request"),
    path("my-requests/", PlayerRequestsListView.as_view(), name="player_my_requests"),
    path("owner-requests/", OwnerRequestsListView.as_view(), name="owner_requests_list"),
    path("<int:booking_id>/", BookingDetailView.as_view(), name="booking_detail"),
    path("<int:booking_id>/approve/", ApproveBookingView.as_view(), name="booking_approve"),
    path("<int:booking_id>/reject/", RejectBookingView.as_view(), name="booking_reject"),
    path("<int:booking_id>/withdraw/", WithdrawBookingView.as_view(), name="booking_withdraw"),
    path("<int:booking_id>/cancel/", CancelApprovedBookingView.as_view(), name="booking_cancel"),
    path("<int:booking_id>/close/", CloseBookingView.as_view(), name="booking_close"),
    path("bulk-action/", BulkBookingActionView.as_view(), name="booking_bulk_action"),
]
