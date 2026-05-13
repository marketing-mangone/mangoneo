from celery import shared_task
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def sync_youtube_metrics(self):
    """Fetches YouTube Analytics for the last 28 days and persists snapshots."""
    try:
        from .connectors.youtube import fetch_channel_analytics
        from .models import MetricDefinition, MetricSnapshot

        data = fetch_channel_analytics()
        end_date = date.fromisoformat(data['end_date'])
        start_date = date.fromisoformat(data['start_date'])

        metric_values = {
            'youtube-views': data['views'],
            'youtube-watch-time': data['watch_time_minutes'],
            'youtube-net-subscribers': data['net_subscribers'],
        }

        for slug, value in metric_values.items():
            try:
                metric = MetricDefinition.objects.get(slug=slug)
                MetricSnapshot.objects.update_or_create(
                    metric=metric,
                    period_start=start_date,
                    period_type='monthly',
                    defaults={
                        'value': value,
                        'period_end': end_date,
                        'raw_data': data,
                    },
                )
            except MetricDefinition.DoesNotExist:
                logger.warning('MetricDefinition %s not found — run seed_youtube_metrics first', slug)

        logger.info('YouTube metrics synced: %s views, %s min watched', data['views'], data['watch_time_minutes'])
    except Exception as exc:
        logger.error('YouTube sync failed: %s', exc)
        raise self.retry(exc=exc)
