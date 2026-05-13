"""
Manual trigger for YouTube metrics sync (same as the Celery task, but synchronous).

Usage:
    python manage.py sync_youtube
    python manage.py sync_youtube --start 2026-04-01 --end 2026-04-30
"""
from datetime import date
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Manually sync YouTube Analytics metrics'

    def add_arguments(self, parser):
        parser.add_argument('--start', type=str, help='Start date YYYY-MM-DD (default: 28 days ago)')
        parser.add_argument('--end', type=str, help='End date YYYY-MM-DD (default: yesterday)')

    def handle(self, *args, **options):
        from metrics.connectors.youtube import fetch_channel_analytics
        from metrics.models import MetricDefinition, MetricSnapshot

        start = date.fromisoformat(options['start']) if options['start'] else None
        end = date.fromisoformat(options['end']) if options['end'] else None

        self.stdout.write('Fetching YouTube Analytics...')
        try:
            data = fetch_channel_analytics(start_date=start, end_date=end)
        except Exception as exc:
            raise CommandError(f'Failed to fetch YouTube data: {exc}') from exc

        self.stdout.write(f"  Period : {data['start_date']} → {data['end_date']}")
        self.stdout.write(f"  Views   : {data['views']:,}")
        self.stdout.write(f"  Watch   : {data['watch_time_minutes']:,.0f} min")
        self.stdout.write(f"  Net subs: {data['net_subscribers']:+d}")

        end_date = date.fromisoformat(data['end_date'])
        start_date = date.fromisoformat(data['start_date'])

        metric_values = {
            'youtube-views': data['views'],
            'youtube-watch-time': data['watch_time_minutes'],
            'youtube-net-subscribers': data['net_subscribers'],
        }

        saved = 0
        for slug, value in metric_values.items():
            try:
                metric = MetricDefinition.objects.get(slug=slug)
                _, created = MetricSnapshot.objects.update_or_create(
                    metric=metric,
                    period_start=start_date,
                    period_type='monthly',
                    defaults={'value': value, 'period_end': end_date, 'raw_data': data},
                )
                action = 'created' if created else 'updated'
                self.stdout.write(f'  ✓ Snapshot {action}: {slug}')
                saved += 1
            except MetricDefinition.DoesNotExist:
                self.stderr.write(f'  ✗ MetricDefinition not found: {slug}')
                self.stderr.write('    Run: python manage.py seed_youtube_metrics')

        self.stdout.write(self.style.SUCCESS(f'\nDone. {saved} snapshot(s) saved.'))
