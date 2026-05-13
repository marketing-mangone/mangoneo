"""
One-time command to authorize the YouTube OAuth flow and save the refresh token.

Usage:
    python manage.py authorize_youtube

This opens a browser window. Sign in with the Google account that owns the
YouTube channel. After approval, the refresh token is printed — copy it into
your .env file as YOUTUBE_REFRESH_TOKEN.
"""
import json
import os
from pathlib import Path

from django.core.management.base import BaseCommand

CLIENT_SECRET_PATH = Path(__file__).resolve().parents[3] / 'client_secret_youtube.json'

SCOPES = [
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/youtube.readonly',
]


class Command(BaseCommand):
    help = 'Authorize YouTube OAuth and print the refresh token'

    def handle(self, *args, **options):
        try:
            from google_auth_oauthlib.flow import InstalledAppFlow
        except ImportError:
            self.stderr.write('google-auth-oauthlib is not installed. Run: pip install google-auth-oauthlib')
            return

        if not CLIENT_SECRET_PATH.exists():
            self.stderr.write(f'client_secret_youtube.json not found at:\n  {CLIENT_SECRET_PATH}')
            self.stderr.write('Download it from Google Cloud Console → Credentials → your OAuth 2.0 client.')
            return

        flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET_PATH), scopes=SCOPES)
        creds = flow.run_local_server(port=0, open_browser=True)

        self.stdout.write(self.style.SUCCESS('\n✓ Authorization successful!\n'))
        self.stdout.write('Add these to your .env / Railway environment variables:\n')
        self.stdout.write(f'YOUTUBE_CLIENT_ID={creds.client_id}')
        self.stdout.write(f'YOUTUBE_CLIENT_SECRET={creds.client_secret}')
        self.stdout.write(f'YOUTUBE_REFRESH_TOKEN={creds.refresh_token}')
        self.stdout.write('')
        self.stdout.write('Also set YOUTUBE_CHANNEL_ID to your channel ID (e.g. UCxxxxxxxxxxxxxxxx).')
        self.stdout.write('Find it at: youtube.com/account_advanced (or leave blank to use the authenticated account\'s channel).')
