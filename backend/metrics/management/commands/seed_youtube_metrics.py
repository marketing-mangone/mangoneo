"""
Creates the MetricDefinition records needed for YouTube Analytics.

Safe to run multiple times (uses get_or_create).

Usage:
    python manage.py seed_youtube_metrics
"""
from django.core.management.base import BaseCommand
from metrics.models import MetricDefinition


YOUTUBE_METRICS = [
    {
        'name': 'YouTube — Reproducciones',
        'slug': 'youtube-views',
        'category': 'engagement',
        'unit': 'count',
        'description': 'Total de reproducciones en los últimos 28 días',
    },
    {
        'name': 'YouTube — Minutos de Reproducción',
        'slug': 'youtube-watch-time',
        'category': 'engagement',
        'unit': 'time',
        'description': 'Minutos estimados reproducidos en los últimos 28 días',
    },
    {
        'name': 'YouTube — Suscriptores Netos',
        'slug': 'youtube-net-subscribers',
        'category': 'acquisition',
        'unit': 'count',
        'description': 'Suscriptores ganados menos perdidos en los últimos 28 días',
    },
]


class Command(BaseCommand):
    help = 'Seed MetricDefinition records for YouTube Analytics'

    def handle(self, *args, **options):
        created_count = 0
        for data in YOUTUBE_METRICS:
            _, created = MetricDefinition.objects.get_or_create(
                slug=data['slug'],
                defaults={**data, 'source': 'youtube', 'is_active': True},
            )
            if created:
                created_count += 1
                self.stdout.write(f'  ✓ Created: {data["name"]}')
            else:
                self.stdout.write(f'  · Already exists: {data["name"]}')

        self.stdout.write(self.style.SUCCESS(f'\nDone. {created_count} new metric(s) created.'))
