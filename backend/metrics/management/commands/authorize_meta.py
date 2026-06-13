"""
Verifica y renueva el token de acceso de Meta.

Uso:
    # Verificar token actual
    python manage.py authorize_meta

    # Intercambiar token de corta duración por uno de larga (60 días)
    python manage.py authorize_meta --token <SHORT_LIVED_TOKEN>

Para obtener un token permanente (recomendado para producción):
    1. Ve a business.facebook.com → Configuración → Usuarios del sistema
    2. Crea un usuario del sistema (tipo Admin)
    3. Asígnale acceso a tu Página, Cuenta de Instagram y Cuenta Publicitaria
    4. Haz clic en "Generar nuevo token" y selecciona tu App
    5. Selecciona los permisos:
       - pages_read_engagement
       - instagram_basic
       - instagram_manage_insights
       - ads_read
    6. El token generado NO expira (System User token)
    7. Cópialo a META_ACCESS_TOKEN en .env y en Railway
"""
import requests
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Verifica y renueva el token de acceso de Meta Graph API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--token',
            type=str,
            help='Token de corta duración a intercambiar por uno de larga duración (60 días)',
        )

    def handle(self, *args, **options):
        app_id     = getattr(settings, 'META_APP_ID', '')
        app_secret = getattr(settings, 'META_APP_SECRET', '')
        token      = options.get('token') or getattr(settings, 'META_ACCESS_TOKEN', '')

        if not token:
            self.stderr.write(self.style.ERROR('META_ACCESS_TOKEN no está configurado.'))
            self.stdout.write('\nPara obtener un token, sigue las instrucciones en el docstring de este comando.')
            return

        # Intercambiar por token de larga duración si se pasó --token
        if options.get('token'):
            if not app_id or not app_secret:
                self.stderr.write(self.style.ERROR('META_APP_ID y META_APP_SECRET son necesarios para intercambiar el token.'))
                return
            self.stdout.write('Intercambiando token por versión de larga duración...')
            resp = requests.get(
                'https://graph.facebook.com/v20.0/oauth/access_token',
                params={
                    'grant_type':       'fb_exchange_token',
                    'client_id':        app_id,
                    'client_secret':    app_secret,
                    'fb_exchange_token': token,
                },
                timeout=15,
            )
            if resp.status_code != 200:
                self.stderr.write(self.style.ERROR(f'Error al intercambiar token: {resp.text}'))
                return
            data = resp.json()
            long_token = data.get('access_token')
            expires_in = data.get('expires_in', 0)
            self.stdout.write(self.style.SUCCESS(f'\n✓ Token de larga duración obtenido (expira en {expires_in // 86400} días)\n'))
            self.stdout.write(f'META_ACCESS_TOKEN={long_token}')
            self.stdout.write('\nActualiza esta variable en .env y en Railway.')
            token = long_token

        # Verificar token actual
        self.stdout.write('\nVerificando token actual...')
        resp = requests.get(
            'https://graph.facebook.com/v20.0/debug_token',
            params={
                'input_token':  token,
                'access_token': f'{app_id}|{app_secret}' if app_id and app_secret else token,
            },
            timeout=15,
        )
        if resp.status_code != 200:
            self.stderr.write(self.style.ERROR(f'No se pudo verificar el token: {resp.text}'))
            return

        info = resp.json().get('data', {})
        is_valid   = info.get('is_valid', False)
        expires_at = info.get('expires_at', 0)
        scopes     = info.get('scopes', [])
        app_name   = info.get('application', '')

        if is_valid:
            self.stdout.write(self.style.SUCCESS(f'✓ Token válido — App: {app_name}'))
        else:
            self.stdout.write(self.style.ERROR(f'✗ Token inválido o expirado'))

        if expires_at == 0:
            self.stdout.write('  Expiración: Nunca (token permanente)')
        else:
            from datetime import datetime
            exp = datetime.fromtimestamp(expires_at).strftime('%Y-%m-%d %H:%M')
            self.stdout.write(f'  Expiración: {exp}')

        self.stdout.write(f'  Permisos: {", ".join(scopes) if scopes else "No disponible"}')

        # Verificar permisos necesarios
        needed = {'pages_read_engagement', 'instagram_basic', 'instagram_manage_insights', 'ads_read'}
        missing = needed - set(scopes)
        if missing:
            self.stdout.write(self.style.WARNING(f'\n⚠ Permisos faltantes: {", ".join(missing)}'))
        else:
            self.stdout.write(self.style.SUCCESS('\n✓ Todos los permisos necesarios están presentes'))
