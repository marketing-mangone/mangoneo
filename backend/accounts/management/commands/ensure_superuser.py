from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from decouple import config


class Command(BaseCommand):
    help = 'Crea el superusuario inicial si no existe ninguno.'

    def handle(self, *args, **kwargs):
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write('Superusuario ya existe, omitiendo.')
            return

        username = config('SUPERUSER_USERNAME', default='')
        email    = config('SUPERUSER_EMAIL', default='')
        password = config('SUPERUSER_PASSWORD', default='')

        if not all([username, email, password]):
            self.stdout.write('Variables SUPERUSER_* no configuradas, omitiendo.')
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(f'Superusuario "{username}" creado correctamente.')
