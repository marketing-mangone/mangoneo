import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('marketing_hub')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'sync-youtube-metrics-every-6h': {
        'task': 'metrics.tasks.sync_youtube_metrics',
        'schedule': crontab(minute=0, hour='*/6'),
    },
    'sync-meta-metrics-every-2h': {
        'task': 'metrics.tasks.sync_meta_metrics',
        'schedule': crontab(minute=30, hour='*/2'),
    },
    'publish-scheduled-posts-every-5m': {
        'task': 'grillas.publish_scheduled_posts',
        'schedule': crontab(minute='*/5'),
    },
}
