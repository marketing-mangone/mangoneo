"""
Creates the MetricDefinition records needed for Google Analytics 4.
Safe to run multiple times (uses get_or_create).

Usage:
    python manage.py seed_ga4_metrics
"""
from django.core.management.base import BaseCommand
from metrics.models import MetricDefinition


GA4_METRICS = [
    {
        'name':        'GA4 — Sesiones',
        'slug':        'ga4-sessions',
        'category':    'acquisition',
        'unit':        'count',
        'description': 'Total de sesiones en el período',
    },
    {
        'name':        'GA4 — Usuarios Activos',
        'slug':        'ga4-active-users',
        'category':    'acquisition',
        'unit':        'count',
        'description': 'Usuarios que tuvieron al menos una sesión comprometida',
    },
    {
        'name':        'GA4 — Usuarios Nuevos',
        'slug':        'ga4-new-users',
        'category':    'acquisition',
        'unit':        'count',
        'description': 'Usuarios que visitaron el sitio por primera vez en el período',
    },
    {
        'name':        'GA4 — Vistas de Página',
        'slug':        'ga4-pageviews',
        'category':    'engagement',
        'unit':        'count',
        'description': 'Total de páginas vistas (screenPageViews)',
    },
    {
        'name':        'GA4 — Tasa de Interacción',
        'slug':        'ga4-engagement-rate',
        'category':    'engagement',
        'unit':        'percentage',
        'description': 'Porcentaje de sesiones comprometidas (opuesto a bounce rate). Valor entre 0 y 1.',
    },
    {
        'name':        'GA4 — Duración Media de Sesión',
        'slug':        'ga4-avg-session-duration',
        'category':    'engagement',
        'unit':        'time',
        'description': 'Duración promedio de sesión en segundos',
    },
    {
        'name':        'GA4 — Conversiones',
        'slug':        'ga4-conversions',
        'category':    'conversion',
        'unit':        'count',
        'description': 'Total de eventos de conversión registrados en GA4',
    },
]


class Command(BaseCommand):
    help = 'Seed MetricDefinition records for Google Analytics 4'

    def handle(self, *args, **options):
        created_count = 0
        for data in GA4_METRICS:
            _, created = MetricDefinition.objects.get_or_create(
                slug=data['slug'],
                defaults={**data, 'source': 'google_analytics', 'is_active': True},
            )
            if created:
                created_count += 1
                self.stdout.write(f'  ✓ Creado: {data["name"]}')
            else:
                self.stdout.write(f'  · Ya existe: {data["name"]}')

        self.stdout.write(self.style.SUCCESS(
            f'\nListo. {created_count} métrica(s) nueva(s) creada(s).'
        ))
