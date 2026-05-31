"""
Registers all Celery Beat periodic tasks in the database.
Safe to run multiple times (uses get_or_create).

Usage:
    python manage.py setup_periodic_tasks

Run this after deploy or after resetting the database.
"""
from django.core.management.base import BaseCommand


TASKS = [
    {
        'name':     'Sync GA4 metrics (daily at 6am)',
        'task':     'metrics.tasks.sync_ga4_metrics',
        'crontab':  {'minute': '0', 'hour': '6', 'day_of_week': '*', 'day_of_month': '*', 'month_of_year': '*'},
    },
    {
        'name':     'Sync YouTube metrics (daily at 6:30am)',
        'task':     'metrics.tasks.sync_youtube_metrics',
        'crontab':  {'minute': '30', 'hour': '6', 'day_of_week': '*', 'day_of_month': '*', 'month_of_year': '*'},
    },
    {
        'name':     'Sync Meta metrics (every 2h)',
        'task':     'metrics.tasks.sync_meta_metrics',
        'crontab':  {'minute': '0', 'hour': '*/2', 'day_of_week': '*', 'day_of_month': '*', 'month_of_year': '*'},
    },
]


class Command(BaseCommand):
    help = 'Register Celery Beat periodic tasks in the database'

    def handle(self, *args, **options):
        try:
            from django_celery_beat.models import CrontabSchedule, PeriodicTask
        except ImportError:
            self.stderr.write('django-celery-beat is not installed.')
            return

        import json
        created_count = 0

        for task_cfg in TASKS:
            schedule, _ = CrontabSchedule.objects.get_or_create(**task_cfg['crontab'])

            _, created = PeriodicTask.objects.update_or_create(
                name=task_cfg['name'],
                defaults={
                    'task':     task_cfg['task'],
                    'crontab':  schedule,
                    'args':     json.dumps([]),
                    'kwargs':   json.dumps({}),
                    'enabled':  True,
                },
            )
            status = '✓ Creado' if created else '· Ya existía (actualizado)'
            self.stdout.write(f'  {status}: {task_cfg["name"]}')
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nListo. {created_count} tarea(s) nueva(s) registrada(s).'
        ))
        self.stdout.write('\nTareas activas:')
        for t in TASKS:
            self.stdout.write(f'  • {t["task"]}')
