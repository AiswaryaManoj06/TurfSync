"""
Scheduled Background Tasks for TurfSync
"""
from celery import shared_task
from apps.bookings.views import auto_expire_stale_bookings

@shared_task
def task_auto_expire_stale_bookings():
    """
    Scheduled task that auto-expires pending booking requests older than 12 hours
    or where the slot start time has already passed.
    """
    auto_expire_stale_bookings()
    return "Stale bookings checked and expired if necessary."
