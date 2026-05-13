from celery import shared_task
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)

MONTHLY_SLUGS = {
    'youtube-views': 'views',
    'youtube-watch-time': 'watch_time_minutes',
    'youtube-net-subscribers': 'net_subscribers',
    'youtube-likes': 'likes',
    'youtube-comments': 'comments',
    'youtube-shares': 'shares',
}


def _save_snapshots(data, period_type):
    from .models import MetricDefinition, MetricSnapshot
    start_date = date.fromisoformat(data['start_date'])
    end_date = date.fromisoformat(data['end_date'])
    for slug, key in MONTHLY_SLUGS.items():
        value = data.get(key)
        if value is None:
            continue
        try:
            metric = MetricDefinition.objects.get(slug=slug)
            MetricSnapshot.objects.update_or_create(
                metric=metric,
                period_start=start_date,
                period_type=period_type,
                defaults={'value': value, 'period_end': end_date, 'raw_data': data},
            )
        except MetricDefinition.DoesNotExist:
            logger.warning('MetricDefinition %s not found — run seed_youtube_metrics', slug)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def sync_youtube_metrics(self):
    """Fetches YouTube Analytics and persists monthly + last 4 weekly snapshots."""
    try:
        from .connectors.youtube import fetch_channel_analytics, fetch_channel_info
        from .models import MetricDefinition, MetricSnapshot

        # 28-day aggregate
        data = fetch_channel_analytics()
        _save_snapshots(data, 'monthly')

        # Subscriber total
        info = fetch_channel_info()
        if info:
            today = date.today()
            try:
                metric = MetricDefinition.objects.get(slug='youtube-subscribers-total')
                MetricSnapshot.objects.update_or_create(
                    metric=metric,
                    period_start=today,
                    period_type='daily',
                    defaults={'value': info['subscriber_count'], 'period_end': today, 'raw_data': info},
                )
            except MetricDefinition.DoesNotExist:
                logger.warning('youtube-subscribers-total not found')

        # Last 4 weeks
        yesterday = date.today() - timedelta(days=1)
        current_monday = date.today() - timedelta(days=date.today().weekday())
        for w in range(4):
            week_monday = current_monday - timedelta(weeks=w)
            week_sunday = week_monday + timedelta(days=6)
            actual_end = min(week_sunday, yesterday)
            if actual_end < week_monday:
                continue
            week_data = fetch_channel_analytics(start_date=week_monday, end_date=actual_end)
            week_data['start_date'] = week_monday.isoformat()
            week_data['end_date'] = actual_end.isoformat()
            _save_snapshots(week_data, 'weekly')

        logger.info('YouTube metrics synced successfully')
    except Exception as exc:
        logger.error('YouTube sync failed: %s', exc)
        raise self.retry(exc=exc)
