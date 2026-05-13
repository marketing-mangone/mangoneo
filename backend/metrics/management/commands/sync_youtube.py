"""
Manual trigger for YouTube metrics sync.

Usage:
    python manage.py sync_youtube                  # 28-day aggregate + last 4 weeks
    python manage.py sync_youtube --weeks 12       # 28-day aggregate + last 12 weeks
    python manage.py sync_youtube --start 2026-04-01 --end 2026-04-30
"""
from datetime import date, timedelta
from django.core.management.base import BaseCommand, CommandError

MONTHLY_SLUGS = {
    'youtube-views': 'views',
    'youtube-watch-time': 'watch_time_minutes',
    'youtube-net-subscribers': 'net_subscribers',
    'youtube-likes': 'likes',
    'youtube-comments': 'comments',
    'youtube-shares': 'shares',
}


def save_snapshots(data, period_type, stdout):
    from metrics.models import MetricDefinition, MetricSnapshot
    start_date = date.fromisoformat(data['start_date'])
    end_date = date.fromisoformat(data['end_date'])
    saved = 0
    for slug, key in MONTHLY_SLUGS.items():
        value = data.get(key)
        if value is None:
            continue
        try:
            metric = MetricDefinition.objects.get(slug=slug)
            _, created = MetricSnapshot.objects.update_or_create(
                metric=metric,
                period_start=start_date,
                period_type=period_type,
                defaults={'value': value, 'period_end': end_date, 'raw_data': data},
            )
            action = 'created' if created else 'updated'
            stdout.write(f'  ✓ Snapshot {action}: {slug} = {value}')
            saved += 1
        except MetricDefinition.DoesNotExist:
            stdout.write(f'  ✗ MetricDefinition not found: {slug} — run seed_youtube_metrics')
        except Exception as e:
            stdout.write(f'  ✗ Error saving {slug}: {e}')
    return saved


class Command(BaseCommand):
    help = 'Manually sync YouTube Analytics metrics'

    def add_arguments(self, parser):
        parser.add_argument('--start', type=str, help='Start date YYYY-MM-DD')
        parser.add_argument('--end', type=str, help='End date YYYY-MM-DD')
        parser.add_argument('--weeks', type=int, default=4, help='Number of past weeks to sync (default: 4)')

    def handle(self, *args, **options):
        from metrics.connectors.youtube import fetch_channel_analytics, fetch_channel_info
        from metrics.models import MetricDefinition, MetricSnapshot

        # ── 28-day aggregate ──────────────────────────────────────────────────
        start = date.fromisoformat(options['start']) if options['start'] else None
        end = date.fromisoformat(options['end']) if options['end'] else None

        self.stdout.write('Fetching 28-day aggregate...')
        try:
            data = fetch_channel_analytics(start_date=start, end_date=end)
        except Exception as exc:
            raise CommandError(f'Failed to fetch YouTube data: {exc}') from exc

        self.stdout.write(f"  Period  : {data['start_date']} → {data['end_date']}")
        self.stdout.write(f"  Views   : {data['views']:,}")
        self.stdout.write(f"  Watch   : {data['watch_time_minutes']:,.0f} min")
        self.stdout.write(f"  Net subs: {data['net_subscribers']:+d}")
        self.stdout.write(f"  Likes   : {data['likes']:,}")
        self.stdout.write(f"  Comments: {data['comments']:,}")
        self.stdout.write(f"  Shares  : {data['shares']:,}")

        total = save_snapshots(data, 'monthly', self.stdout)

        # ── Subscriber total ──────────────────────────────────────────────────
        self.stdout.write('Fetching subscriber total...')
        try:
            info = fetch_channel_info()
            if info:
                metric = MetricDefinition.objects.get(slug='youtube-subscribers-total')
                today = date.today()
                MetricSnapshot.objects.update_or_create(
                    metric=metric,
                    period_start=today,
                    period_type='daily',
                    defaults={'value': info['subscriber_count'], 'period_end': today, 'raw_data': info},
                )
                self.stdout.write(f"  ✓ Subscribers total: {info['subscriber_count']:,}")
        except MetricDefinition.DoesNotExist:
            self.stdout.write('  ✗ youtube-subscribers-total not found — run seed_youtube_metrics')
        except Exception as e:
            self.stdout.write(f'  ✗ Error saving subscribers total: {e}')

        # ── Weekly snapshots ──────────────────────────────────────────────────
        self.stdout.write(f'Syncing last {options["weeks"]} weeks...')
        yesterday = date.today() - timedelta(days=1)
        today_weekday = date.today().weekday()
        current_monday = date.today() - timedelta(days=today_weekday)

        weeks_saved = 0
        for w in range(options['weeks']):
            week_monday = current_monday - timedelta(weeks=w)
            week_sunday = week_monday + timedelta(days=6)
            actual_end = min(week_sunday, yesterday)

            if actual_end < week_monday:
                continue

            iso = week_monday.isocalendar()
            week_str = f"{iso[0]}-W{iso[1]:02d}"

            try:
                week_data = fetch_channel_analytics(start_date=week_monday, end_date=actual_end)
                week_data['start_date'] = week_monday.isoformat()
                week_data['end_date'] = actual_end.isoformat()
                n = save_snapshots(week_data, 'weekly', self.stdout)
                weeks_saved += n
                self.stdout.write(f'  Week {week_str}: {week_data["views"]:,} views')
            except Exception as e:
                self.stdout.write(f'  ✗ Week {week_str} failed: {e}')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {total} monthly + {weeks_saved} weekly snapshot(s) saved.'
        ))
