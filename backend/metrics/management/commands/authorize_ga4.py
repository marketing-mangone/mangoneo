"""
One-time command to authorize Google Analytics 4 OAuth and save the refresh token.

Usage:
    python manage.py authorize_ga4

Steps:
  1. Go to Google Cloud Console → APIs & Services → Credentials
  2. Create (or reuse) an OAuth 2.0 Client ID of type "Desktop app"
  3. Download the JSON file and save it as:
       backend/client_secret_ga4.json
  4. Enable "Google Analytics Data API" in your GCP project
  5. Run this command — it opens a browser for Google sign-in
  6. Sign in with the Google account that has read access to your GA4 property
  7. Copy the printed env vars into your .env and Railway variables

Note: if you already have a client_secret_youtube.json from the same GCP project,
you can copy it: cp client_secret_youtube.json client_secret_ga4.json
The same OAuth client can request multiple scopes.
"""
from pathlib import Path

from django.core.management.base import BaseCommand

CLIENT_SECRET_PATH = Path(__file__).resolve().parents[3] / 'client_secret_ga4.json'

SCOPES = ['https://www.googleapis.com/auth/analytics.readonly']


class Command(BaseCommand):
    help = 'Authorize Google Analytics 4 OAuth and print the refresh token'

    def handle(self, *args, **options):
        try:
            from google_auth_oauthlib.flow import InstalledAppFlow
        except ImportError:
            self.stderr.write('google-auth-oauthlib is not installed.')
            return

        if not CLIENT_SECRET_PATH.exists():
            self.stderr.write(self.style.ERROR(
                f'\nclient_secret_ga4.json not found at:\n  {CLIENT_SECRET_PATH}\n'
            ))
            self.stderr.write('Steps to get it:')
            self.stderr.write('  1. console.cloud.google.com → APIs & Services → Credentials')
            self.stderr.write('  2. Create OAuth 2.0 Client ID → Desktop app')
            self.stderr.write('  3. Download JSON → save as client_secret_ga4.json in the backend/ folder')
            self.stderr.write('  4. Enable "Google Analytics Data API" in your GCP project')
            self.stderr.write('')
            self.stderr.write('Tip: if you already have client_secret_youtube.json you can reuse it:')
            self.stderr.write('  cp client_secret_youtube.json client_secret_ga4.json')
            return

        self.stdout.write('Opening browser for Google authorization...')
        self.stdout.write('Sign in with the Google account that has READ access to your GA4 property.\n')

        flow = InstalledAppFlow.from_client_secrets_file(
            str(CLIENT_SECRET_PATH), scopes=SCOPES,
        )
        creds = flow.run_local_server(port=0, open_browser=True)

        self.stdout.write(self.style.SUCCESS('\n✓ Authorization successful!\n'))
        self.stdout.write('Add these to your .env and Railway environment variables:\n')
        self.stdout.write(f'GA4_CLIENT_ID={creds.client_id}')
        self.stdout.write(f'GA4_CLIENT_SECRET={creds.client_secret}')
        self.stdout.write(f'GA4_REFRESH_TOKEN={creds.refresh_token}')
        self.stdout.write('')
        self.stdout.write('Also set your GA4 property ID (numeric only, e.g. 123456789):')
        self.stdout.write('GA4_PROPERTY_ID=<your-property-id>')
        self.stdout.write('')
        self.stdout.write('Find your property ID:')
        self.stdout.write('  analytics.google.com → Admin → Property Settings → Property ID')
