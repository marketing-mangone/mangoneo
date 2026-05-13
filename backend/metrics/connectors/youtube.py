"""
YouTube Analytics + Data API connector.

Uses OAuth 2.0 with offline access (refresh token) stored in env vars.
Run `python manage.py authorize_youtube` once to obtain the refresh token.
"""
from datetime import date, timedelta

from django.conf import settings
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


def _build_credentials() -> Credentials:
    creds = Credentials(
        token=None,
        refresh_token=settings.YOUTUBE_REFRESH_TOKEN,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=settings.YOUTUBE_CLIENT_ID,
        client_secret=settings.YOUTUBE_CLIENT_SECRET,
        scopes=[
            'https://www.googleapis.com/auth/yt-analytics.readonly',
            'https://www.googleapis.com/auth/youtube.readonly',
        ],
    )
    creds.refresh(Request())
    return creds


def fetch_channel_analytics(
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """
    Returns aggregated channel metrics for the given date range.
    Defaults to the last 28 days.
    """
    if end_date is None:
        end_date = date.today() - timedelta(days=1)
    if start_date is None:
        start_date = end_date - timedelta(days=27)

    creds = _build_credentials()
    service = build('youtubeAnalytics', 'v2', credentials=creds)

    channel_id = settings.YOUTUBE_CHANNEL_ID or 'MINE'
    ids = f'channel=={channel_id}' if channel_id != 'MINE' else 'channel==MINE'

    resp = service.reports().query(
        ids=ids,
        startDate=start_date.isoformat(),
        endDate=end_date.isoformat(),
        metrics='views,estimatedMinutesWatched,subscribersGained,subscribersLost,uniqueViewers',
    ).execute()

    rows = resp.get('rows', [[0, 0, 0, 0, 0]])
    row = rows[0] if rows else [0, 0, 0, 0, 0]

    return {
        'views': int(row[0]),
        'watch_time_minutes': float(row[1]),
        'subscribers_gained': int(row[2]),
        'subscribers_lost': int(row[3]),
        'net_subscribers': int(row[2]) - int(row[3]),
        'unique_viewers': int(row[4]),
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
    }


def fetch_channel_info() -> dict:
    """Returns basic channel stats (subscriber count, total views, video count)."""
    creds = _build_credentials()
    service = build('youtube', 'v3', credentials=creds)

    channel_id = settings.YOUTUBE_CHANNEL_ID
    kwargs = {'id': channel_id} if channel_id else {'mine': True}

    resp = service.channels().list(
        part='statistics,snippet',
        **kwargs,
    ).execute()

    items = resp.get('items', [])
    if not items:
        return {}

    stats = items[0].get('statistics', {})
    snippet = items[0].get('snippet', {})
    return {
        'channel_title': snippet.get('title', ''),
        'subscriber_count': int(stats.get('subscriberCount', 0)),
        'total_views': int(stats.get('viewCount', 0)),
        'video_count': int(stats.get('videoCount', 0)),
    }
