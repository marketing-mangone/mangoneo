"""
Crea los registros MetricDefinition para Meta (Facebook + Instagram + Ads).
Seguro correr múltiples veces (usa get_or_create).
"""
from django.core.management.base import BaseCommand
from metrics.models import MetricDefinition

META_METRICS = [
    # ── Facebook Page (orgánico) ──────────────────────────────────────────────
    {
        'name':        'Facebook — Fans totales',
        'slug':        'meta-fb-fans',
        'category':    'acquisition',
        'unit':        'count',
        'description': 'Total de fans/seguidores actuales de la página',
    },
    {
        'name':        'Facebook — Impresiones',
        'slug':        'meta-fb-impressions',
        'category':    'engagement',
        'unit':        'count',
        'description': 'Impresiones orgánicas de la página en el período',
    },
    {
        'name':        'Facebook — Alcance',
        'slug':        'meta-fb-reach',
        'category':    'engagement',
        'unit':        'count',
        'description': 'Personas únicas que vieron contenido de la página',
    },
    {
        'name':        'Facebook — Engagement',
        'slug':        'meta-fb-engagement',
        'category':    'engagement',
        'unit':        'count',
        'description': 'Usuarios que interactuaron con la página (likes, comments, shares, clicks)',
    },
    # ── Instagram (orgánico) ──────────────────────────────────────────────────
    {
        'name':        'Instagram — Seguidores totales',
        'slug':        'meta-ig-followers',
        'category':    'acquisition',
        'unit':        'count',
        'description': 'Total de seguidores actuales en Instagram',
    },
    {
        'name':        'Instagram — Impresiones',
        'slug':        'meta-ig-impressions',
        'category':    'engagement',
        'unit':        'count',
        'description': 'Impresiones orgánicas de Instagram en el período',
    },
    {
        'name':        'Instagram — Alcance',
        'slug':        'meta-ig-reach',
        'category':    'engagement',
        'unit':        'count',
        'description': 'Cuentas únicas que vieron contenido de Instagram',
    },
    {
        'name':        'Instagram — Visitas al perfil',
        'slug':        'meta-ig-profile-views',
        'category':    'engagement',
        'unit':        'count',
        'description': 'Visitas al perfil de Instagram en el período',
    },
    # ── Meta Ads (pagado) ─────────────────────────────────────────────────────
    {
        'name':        'Meta Ads — Inversión',
        'slug':        'meta-ads-spend',
        'category':    'conversion',
        'unit':        'currency',
        'description': 'Gasto total en campañas de Meta en el período',
    },
    {
        'name':        'Meta Ads — Impresiones',
        'slug':        'meta-ads-impressions',
        'category':    'engagement',
        'unit':        'count',
        'description': 'Total de impresiones pagadas en el período',
    },
    {
        'name':        'Meta Ads — Alcance pagado',
        'slug':        'meta-ads-reach',
        'category':    'engagement',
        'unit':        'count',
        'description': 'Personas únicas que vieron los anuncios',
    },
    {
        'name':        'Meta Ads — Clics',
        'slug':        'meta-ads-clicks',
        'category':    'conversion',
        'unit':        'count',
        'description': 'Total de clics en anuncios en el período',
    },
]


class Command(BaseCommand):
    help = 'Seed MetricDefinition records para Meta (Facebook + Instagram + Ads)'

    def handle(self, *args, **options):
        created_count = 0
        for data in META_METRICS:
            _, created = MetricDefinition.objects.get_or_create(
                slug=data['slug'],
                defaults={**data, 'source': 'meta', 'is_active': True},
            )
            if created:
                created_count += 1
                self.stdout.write(f'  ✓ Creado: {data["name"]}')
            else:
                self.stdout.write(f'  · Ya existe: {data["name"]}')

        self.stdout.write(self.style.SUCCESS(f'\nListo. {created_count} nueva(s) métrica(s) creada(s).'))
