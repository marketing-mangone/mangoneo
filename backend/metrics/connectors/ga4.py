"""
Google Analytics 4 — Data API connector.

Uses OAuth 2.0 with offline access (refresh token stored in env vars).
Run `python manage.py authorize_ga4` once to obtain the refresh token.

Requires: google-analytics-data>=0.18
"""
from datetime import date, timedelta

from django.conf import settings
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request


SCOPES = ['https://www.googleapis.com/auth/analytics.readonly']


def _build_credentials() -> Credentials:
    creds = Credentials(
        token=None,
        refresh_token=settings.GA4_REFRESH_TOKEN,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=settings.GA4_CLIENT_ID,
        client_secret=settings.GA4_CLIENT_SECRET,
        scopes=SCOPES,
    )
    creds.refresh(Request())
    return creds


def _safe_float(value_str: str, default: float = 0.0) -> float:
    try:
        return float(value_str)
    except (TypeError, ValueError):
        return default


def fetch_ga4_report(
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """
    Fetches aggregated GA4 metrics for the date range (default: last 28 days).

    Returns:
        {
            sessions, active_users, new_users, page_views,
            engagement_rate, avg_session_duration, conversions,
            start_date, end_date
        }
    """
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import DateRange, Metric, RunReportRequest

    if end_date is None:
        end_date = date.today() - timedelta(days=1)
    if start_date is None:
        start_date = end_date - timedelta(days=27)

    creds = _build_credentials()
    client = BetaAnalyticsDataClient(credentials=creds)

    request = RunReportRequest(
        property=f'properties/{settings.GA4_PROPERTY_ID}',
        date_ranges=[DateRange(
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
        )],
        metrics=[
            Metric(name='sessions'),
            Metric(name='activeUsers'),
            Metric(name='newUsers'),
            Metric(name='screenPageViews'),
            Metric(name='engagementRate'),
            Metric(name='averageSessionDuration'),
            Metric(name='conversions'),
        ],
    )

    response = client.run_report(request)
    row = response.rows[0].metric_values if response.rows else None

    def val(i: int, as_int: bool = False):
        raw = row[i].value if row else '0'
        f = _safe_float(raw)
        return int(f) if as_int else f

    return {
        'sessions':             val(0, as_int=True),
        'active_users':         val(1, as_int=True),
        'new_users':            val(2, as_int=True),
        'page_views':           val(3, as_int=True),
        'engagement_rate':      round(val(4), 4),          # 0.0 – 1.0
        'avg_session_duration': round(val(5), 2),          # seconds
        'conversions':          val(6, as_int=True),
        'start_date':           start_date.isoformat(),
        'end_date':             end_date.isoformat(),
    }


def fetch_top_pages(
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 10,
) -> list[dict]:
    """
    Returns the top N landing pages by sessions for the given period.
    Each entry: { page_path, page_title, sessions, page_views }
    """
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        DateRange, Dimension, Metric, OrderBy, RunReportRequest,
    )

    if end_date is None:
        end_date = date.today() - timedelta(days=1)
    if start_date is None:
        start_date = end_date - timedelta(days=27)

    creds = _build_credentials()
    client = BetaAnalyticsDataClient(credentials=creds)

    request = RunReportRequest(
        property=f'properties/{settings.GA4_PROPERTY_ID}',
        date_ranges=[DateRange(
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
        )],
        dimensions=[
            Dimension(name='pagePath'),
            Dimension(name='pageTitle'),
        ],
        metrics=[
            Metric(name='sessions'),
            Metric(name='screenPageViews'),
        ],
        order_bys=[OrderBy(
            metric=OrderBy.MetricOrderBy(metric_name='sessions'),
            desc=True,
        )],
        limit=limit,
    )

    response = client.run_report(request)

    pages = []
    for row in response.rows:
        pages.append({
            'page_path':  row.dimension_values[0].value,
            'page_title': row.dimension_values[1].value,
            'sessions':   int(_safe_float(row.metric_values[0].value)),
            'page_views': int(_safe_float(row.metric_values[1].value)),
        })
    return pages
