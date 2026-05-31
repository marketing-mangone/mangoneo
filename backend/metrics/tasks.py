from celery import shared_task
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)

# ── Google Analytics 4 ───────────────────────────────────────────────────────

GA4_SLUGS = {
    'ga4-sessions':             'sessions',
    'ga4-active-users':         'active_users',
    'ga4-new-users':            'new_users',
    'ga4-pageviews':            'page_views',
    'ga4-engagement-rate':      'engagement_rate',
    'ga4-avg-session-duration': 'avg_session_duration',
    'ga4-conversions':          'conversions',
}


def _save_ga4_snapshots(data: dict, period_type: str):
    from .models import MetricDefinition, MetricSnapshot
    start = date.fromisoformat(data['start_date'])
    end   = date.fromisoformat(data['end_date'])
    for slug, key in GA4_SLUGS.items():
        value = data.get(key)
        if value is None:
            continue
        try:
            metric = MetricDefinition.objects.get(slug=slug)
            MetricSnapshot.objects.update_or_create(
                metric=metric,
                period_start=start,
                period_type=period_type,
                defaults={'value': value, 'period_end': end, 'raw_data': data},
            )
        except MetricDefinition.DoesNotExist:
            logger.warning('MetricDefinition %s not found — run seed_ga4_metrics', slug)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def sync_ga4_metrics(self):
    """Fetches GA4 Data API and persists monthly + last 4 weekly snapshots."""
    try:
        from .connectors.ga4 import fetch_ga4_report

        # 28-day aggregate (stored as 'monthly')
        data = fetch_ga4_report()
        _save_ga4_snapshots(data, 'monthly')

        # Last 4 complete weeks
        yesterday      = date.today() - timedelta(days=1)
        current_monday = date.today() - timedelta(days=date.today().weekday())
        for w in range(4):
            week_monday = current_monday - timedelta(weeks=w)
            week_sunday = week_monday + timedelta(days=6)
            actual_end  = min(week_sunday, yesterday)
            if actual_end < week_monday:
                continue
            week_data = fetch_ga4_report(start_date=week_monday, end_date=actual_end)
            _save_ga4_snapshots(week_data, 'weekly')

        logger.info('GA4 metrics synced successfully')
    except Exception as exc:
        logger.error('GA4 sync failed: %s', exc)
        raise self.retry(exc=exc)


# ── YouTube ───────────────────────────────────────────────────────────────────
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


# ── Meta ──────────────────────────────────────────────────────────────────────

META_FB_SLUGS = {
    'meta-fb-impressions': 'fb_impressions',
    'meta-fb-reach':       'fb_reach',
    'meta-fb-engagement':  'fb_engagement',
}

META_IG_SLUGS = {
    'meta-ig-impressions':   'ig_impressions',
    'meta-ig-reach':         'ig_reach',
    'meta-ig-profile-views': 'ig_profile_views',
}

META_ADS_SLUGS = {
    'meta-ads-spend':       'ads_spend',
    'meta-ads-impressions': 'ads_impressions',
    'meta-ads-reach':       'ads_reach',
    'meta-ads-clicks':      'ads_clicks',
}


def _save_meta_snapshots(slug_map, data, period_type, period_start, period_end):
    from .models import MetricDefinition, MetricSnapshot
    for slug, key in slug_map.items():
        value = data.get(key)
        if value is None:
            continue
        try:
            metric = MetricDefinition.objects.get(slug=slug)
            MetricSnapshot.objects.update_or_create(
                metric=metric,
                period_start=period_start,
                period_type=period_type,
                defaults={'value': value, 'period_end': period_end, 'raw_data': data},
            )
        except MetricDefinition.DoesNotExist:
            logger.warning('MetricDefinition %s not found — run seed_meta_metrics', slug)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def sync_meta_metrics(self):
    """Sincroniza Facebook Page, Instagram y Meta Ads — snapshots diarios + últimas 4 semanas."""
    try:
        from .connectors.meta import (
            fetch_page_info, fetch_page_insights,
            fetch_instagram_info, fetch_instagram_insights,
            fetch_ads_insights,
        )
        from .models import MetricDefinition, MetricSnapshot

        today = date.today()

        # Totales punto en el tiempo
        page_info = fetch_page_info()
        if page_info:
            try:
                m = MetricDefinition.objects.get(slug='meta-fb-fans')
                MetricSnapshot.objects.update_or_create(
                    metric=m, period_start=today, period_type='daily',
                    defaults={'value': page_info['fan_count'], 'period_end': today, 'raw_data': page_info},
                )
            except MetricDefinition.DoesNotExist:
                logger.warning('meta-fb-fans not found')

        ig_info = fetch_instagram_info()
        if ig_info:
            try:
                m = MetricDefinition.objects.get(slug='meta-ig-followers')
                MetricSnapshot.objects.update_or_create(
                    metric=m, period_start=today, period_type='daily',
                    defaults={'value': ig_info['followers_count'], 'period_end': today, 'raw_data': ig_info},
                )
            except MetricDefinition.DoesNotExist:
                logger.warning('meta-ig-followers not found')

        # Últimas 4 semanas
        yesterday = today - timedelta(days=1)
        current_monday = today - timedelta(days=today.weekday())
        for w in range(4):
            week_monday = current_monday - timedelta(weeks=w)
            week_sunday = week_monday + timedelta(days=6)
            actual_end = min(week_sunday, yesterday)
            if actual_end < week_monday:
                continue

            fb_data = fetch_page_insights(week_monday, actual_end)
            if fb_data:
                _save_meta_snapshots(META_FB_SLUGS, fb_data, 'weekly', week_monday, actual_end)

            ig_data = fetch_instagram_insights(week_monday, actual_end)
            if ig_data:
                _save_meta_snapshots(META_IG_SLUGS, ig_data, 'weekly', week_monday, actual_end)

            ads_data = fetch_ads_insights(week_monday, actual_end)
            if ads_data:
                _save_meta_snapshots(META_ADS_SLUGS, ads_data, 'weekly', week_monday, actual_end)

        logger.info('Meta metrics synced successfully')
    except Exception as exc:
        logger.error('Meta sync failed: %s', exc)
        raise self.retry(exc=exc)
