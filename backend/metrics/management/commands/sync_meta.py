"""
Trigger manual de sincronización de métricas de Meta.

Uso:
    python manage.py sync_meta                  # 28-day aggregate + últimas 4 semanas
    python manage.py sync_meta --weeks 12       # últimas 12 semanas
    python manage.py sync_meta --start 2026-04-01 --end 2026-04-30
"""
from datetime import date, timedelta
from django.core.management.base import BaseCommand, CommandError


FB_SLUGS = {
    'meta-fb-impressions': 'fb_impressions',
    'meta-fb-reach':       'fb_reach',
    'meta-fb-engagement':  'fb_engagement',
}

IG_SLUGS = {
    'meta-ig-impressions':   'ig_impressions',
    'meta-ig-reach':         'ig_reach',
    'meta-ig-profile-views': 'ig_profile_views',
}

ADS_SLUGS = {
    'meta-ads-spend':       'ads_spend',
    'meta-ads-impressions': 'ads_impressions',
    'meta-ads-reach':       'ads_reach',
    'meta-ads-clicks':      'ads_clicks',
}


def save_snapshots(slug_map, data, period_type, period_start, period_end, stdout):
    from metrics.models import MetricDefinition, MetricSnapshot
    saved = 0
    for slug, key in slug_map.items():
        value = data.get(key)
        if value is None:
            continue
        try:
            metric = MetricDefinition.objects.get(slug=slug)
            _, created = MetricSnapshot.objects.update_or_create(
                metric=metric,
                period_start=period_start,
                period_type=period_type,
                defaults={'value': value, 'period_end': period_end, 'raw_data': data},
            )
            action = 'creado' if created else 'actualizado'
            stdout.write(f'    ✓ Snapshot {action}: {slug} = {value}')
            saved += 1
        except MetricDefinition.DoesNotExist:
            stdout.write(f'    ✗ MetricDefinition no encontrado: {slug} — corre seed_meta_metrics')
        except Exception as e:
            stdout.write(f'    ✗ Error guardando {slug}: {e}')
    return saved


class Command(BaseCommand):
    help = 'Sincronización manual de métricas de Meta (Facebook + Instagram + Ads)'

    def add_arguments(self, parser):
        parser.add_argument('--start', type=str, help='Fecha inicio YYYY-MM-DD')
        parser.add_argument('--end',   type=str, help='Fecha fin YYYY-MM-DD')
        parser.add_argument('--weeks', type=int, default=4, help='Semanas pasadas a sincronizar (default: 4)')

    def handle(self, *args, **options):
        from metrics.connectors.meta import (
            fetch_page_info, fetch_page_insights,
            fetch_instagram_info, fetch_instagram_insights,
            fetch_ads_insights,
        )
        from metrics.models import MetricDefinition, MetricSnapshot

        start = date.fromisoformat(options['start']) if options['start'] else None
        end   = date.fromisoformat(options['end'])   if options['end']   else None

        total_saved = 0

        # ── Facebook fans totales ─────────────────────────────────────────────
        self.stdout.write('Obteniendo fans totales de Facebook...')
        try:
            info = fetch_page_info()
            if info:
                today = date.today()
                metric = MetricDefinition.objects.get(slug='meta-fb-fans')
                MetricSnapshot.objects.update_or_create(
                    metric=metric, period_start=today, period_type='daily',
                    defaults={'value': info['fan_count'], 'period_end': today, 'raw_data': info},
                )
                self.stdout.write(f'  ✓ Fans totales: {info["fan_count"]:,}  ({info.get("page_name", "")})')
                total_saved += 1
        except MetricDefinition.DoesNotExist:
            self.stdout.write('  ✗ meta-fb-fans no encontrado — corre seed_meta_metrics')
        except Exception as e:
            self.stdout.write(f'  ✗ Error: {e}')

        # ── Instagram seguidores totales ──────────────────────────────────────
        self.stdout.write('Obteniendo seguidores totales de Instagram...')
        try:
            ig_info = fetch_instagram_info()
            if ig_info:
                today = date.today()
                metric = MetricDefinition.objects.get(slug='meta-ig-followers')
                MetricSnapshot.objects.update_or_create(
                    metric=metric, period_start=today, period_type='daily',
                    defaults={'value': ig_info['followers_count'], 'period_end': today, 'raw_data': ig_info},
                )
                self.stdout.write(f'  ✓ Seguidores IG: {ig_info["followers_count"]:,}  (@{ig_info.get("ig_username", "")})')
                total_saved += 1
        except MetricDefinition.DoesNotExist:
            self.stdout.write('  ✗ meta-ig-followers no encontrado — corre seed_meta_metrics')
        except Exception as e:
            self.stdout.write(f'  ✗ Error: {e}')

        # ── Semanas ───────────────────────────────────────────────────────────
        yesterday = date.today() - timedelta(days=1)
        current_monday = date.today() - timedelta(days=date.today().weekday())

        self.stdout.write(f'\nSincronizando últimas {options["weeks"]} semanas...')
        weeks_saved = 0

        for w in range(options['weeks']):
            week_monday = current_monday - timedelta(weeks=w)
            week_sunday = week_monday + timedelta(days=6)
            actual_end  = min(week_sunday, yesterday)

            if actual_end < week_monday:
                continue

            if start and end:
                week_monday, actual_end = start, end

            iso = week_monday.isocalendar()
            week_str = f"{iso[0]}-W{iso[1]:02d}"
            self.stdout.write(f'\n  Semana {week_str} ({week_monday} → {actual_end}):')

            # Facebook insights
            try:
                fb_data = fetch_page_insights(week_monday, actual_end)
                if fb_data:
                    self.stdout.write(f'    FB → impressions: {fb_data["fb_impressions"]:,}  reach: {fb_data["fb_reach"]:,}')
                    n = save_snapshots(FB_SLUGS, fb_data, 'weekly', week_monday, actual_end, self.stdout)
                    weeks_saved += n
            except Exception as e:
                self.stdout.write(f'    ✗ Facebook insights falló: {e}')

            # Instagram insights
            try:
                ig_data = fetch_instagram_insights(week_monday, actual_end)
                if ig_data:
                    self.stdout.write(f'    IG  → impressions: {ig_data["ig_impressions"]:,}  reach: {ig_data["ig_reach"]:,}')
                    n = save_snapshots(IG_SLUGS, ig_data, 'weekly', week_monday, actual_end, self.stdout)
                    weeks_saved += n
            except Exception as e:
                self.stdout.write(f'    ✗ Instagram insights falló: {e}')

            # Ads insights
            try:
                ads_data = fetch_ads_insights(week_monday, actual_end)
                if ads_data:
                    self.stdout.write(f'    Ads → spend: ${ads_data["ads_spend"]:.2f}  clicks: {ads_data["ads_clicks"]:,}')
                    n = save_snapshots(ADS_SLUGS, ads_data, 'weekly', week_monday, actual_end, self.stdout)
                    weeks_saved += n
            except Exception as e:
                self.stdout.write(f'    ✗ Ads insights falló: {e}')

            if start and end:
                break

        self.stdout.write(self.style.SUCCESS(
            f'\nListo. {total_saved} totales diarios + {weeks_saved} snapshots semanales guardados.'
        ))
