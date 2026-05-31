"""
Manual trigger for Google Analytics 4 metrics sync.

Usage:
    python manage.py sync_ga4                          # last 28 days + last 4 weeks
    python manage.py sync_ga4 --weeks 12               # last 28 days + last 12 weeks
    python manage.py sync_ga4 --start 2026-04-01 --end 2026-04-30
    python manage.py sync_ga4 --pages                  # also print top 10 pages
"""
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError


GA4_SLUGS = {
    'ga4-sessions':             'sessions',
    'ga4-active-users':         'active_users',
    'ga4-new-users':            'new_users',
    'ga4-pageviews':            'page_views',
    'ga4-engagement-rate':      'engagement_rate',
    'ga4-avg-session-duration': 'avg_session_duration',
    'ga4-conversions':          'conversions',
}


def save_snapshots(data: dict, period_type: str, stdout) -> int:
    from metrics.models import MetricDefinition, MetricSnapshot
    start = date.fromisoformat(data['start_date'])
    end   = date.fromisoformat(data['end_date'])
    saved = 0
    for slug, key in GA4_SLUGS.items():
        value = data.get(key)
        if value is None:
            continue
        try:
            metric = MetricDefinition.objects.get(slug=slug)
            _, created = MetricSnapshot.objects.update_or_create(
                metric=metric,
                period_start=start,
                period_type=period_type,
                defaults={'value': value, 'period_end': end, 'raw_data': data},
            )
            action = 'creado' if created else 'actualizado'
            stdout.write(f'  ✓ Snapshot {action}: {slug} = {value}')
            saved += 1
        except MetricDefinition.DoesNotExist:
            stdout.write(f'  ✗ MetricDefinition no encontrada: {slug} — ejecuta seed_ga4_metrics')
        except Exception as exc:
            stdout.write(f'  ✗ Error guardando {slug}: {exc}')
    return saved


class Command(BaseCommand):
    help = 'Sync Google Analytics 4 metrics manually'

    def add_arguments(self, parser):
        parser.add_argument('--start',  type=str, help='Fecha inicio YYYY-MM-DD')
        parser.add_argument('--end',    type=str, help='Fecha fin YYYY-MM-DD')
        parser.add_argument('--weeks',  type=int, default=4,
                            help='Semanas pasadas a sincronizar (default: 4)')
        parser.add_argument('--pages',  action='store_true',
                            help='También mostrar top 10 páginas del período')

    def handle(self, *args, **options):
        from metrics.connectors.ga4 import fetch_ga4_report, fetch_top_pages

        start = date.fromisoformat(options['start']) if options['start'] else None
        end   = date.fromisoformat(options['end'])   if options['end']   else None

        # ── Agregado de 28 días ───────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO('\n▸ Obteniendo reporte de 28 días...'))
        try:
            data = fetch_ga4_report(start_date=start, end_date=end)
        except Exception as exc:
            raise CommandError(f'Error al obtener datos de GA4: {exc}') from exc

        self.stdout.write(f"  Período            : {data['start_date']} → {data['end_date']}")
        self.stdout.write(f"  Sesiones           : {data['sessions']:,}")
        self.stdout.write(f"  Usuarios activos   : {data['active_users']:,}")
        self.stdout.write(f"  Usuarios nuevos    : {data['new_users']:,}")
        self.stdout.write(f"  Vistas de página   : {data['page_views']:,}")
        self.stdout.write(f"  Tasa de interacción: {data['engagement_rate']:.1%}")
        self.stdout.write(f"  Duración media     : {data['avg_session_duration']:.0f}s")
        self.stdout.write(f"  Conversiones       : {data['conversions']:,}")

        total = save_snapshots(data, 'monthly', self.stdout)

        # ── Top páginas (opcional) ────────────────────────────────────────────
        if options['pages']:
            self.stdout.write(self.style.HTTP_INFO('\n▸ Top 10 páginas...'))
            try:
                pages = fetch_top_pages(start_date=start, end_date=end)
                for i, p in enumerate(pages, 1):
                    self.stdout.write(
                        f"  {i:2d}. {p['page_path'][:60]:<60} "
                        f"  {p['sessions']:>6,} sesiones"
                    )
            except Exception as exc:
                self.stdout.write(f'  ✗ Error obteniendo páginas: {exc}')

        # ── Semanas recientes ─────────────────────────────────────────────────
        n_weeks = options['weeks']
        self.stdout.write(self.style.HTTP_INFO(f'\n▸ Sincronizando últimas {n_weeks} semanas...'))

        yesterday       = date.today() - timedelta(days=1)
        current_monday  = date.today() - timedelta(days=date.today().weekday())
        weeks_saved     = 0

        for w in range(n_weeks):
            week_monday = current_monday - timedelta(weeks=w)
            week_sunday = week_monday + timedelta(days=6)
            actual_end  = min(week_sunday, yesterday)

            if actual_end < week_monday:
                continue

            iso      = week_monday.isocalendar()
            week_str = f"{iso[0]}-W{iso[1]:02d}"

            try:
                week_data = fetch_ga4_report(start_date=week_monday, end_date=actual_end)
                n = save_snapshots(week_data, 'weekly', self.stdout)
                weeks_saved += n
                self.stdout.write(
                    f'  Semana {week_str}: {week_data["sessions"]:,} sesiones, '
                    f'{week_data["active_users"]:,} usuarios'
                )
            except Exception as exc:
                self.stdout.write(f'  ✗ Semana {week_str} falló: {exc}')

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Listo. {total} snapshots mensuales + {weeks_saved} semanales guardados.'
        ))
