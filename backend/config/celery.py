"""
Celery Configuration for TurfSync Scheduled Background Tasks
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('turfsync')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks(['utilities'])

app.conf.beat_schedule = {
    'auto-expire-stale-bookings-every-5-minutes': {
        'task': 'utilities.tasks.task_auto_expire_stale_bookings',
        'schedule': 300.0,
    },
}
