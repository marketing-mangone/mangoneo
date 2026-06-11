from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import UserProfile


class AuthHardeningTests(APITestCase):
    """M-1: el refresh token no se expone en el body. M-3: set-password usa los validadores."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='sebas', password='Una-Clave-Larga-2026')
        UserProfile.objects.update_or_create(user=cls.user, defaults={'role': 'admin'})

    def test_login_no_devuelve_refresh_en_body(self):
        r = self.client.post('/api/auth/login/',
                             {'username': 'sebas', 'password': 'Una-Clave-Larga-2026'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)            # el frontend lo necesita en memoria
        self.assertNotIn('refresh', r.data)         # vive solo en cookie httpOnly
        self.assertIn('mh_refresh', r.cookies)      # confirmamos que sí se setea la cookie

    def test_set_password_rechaza_password_debil(self):
        self.client.force_authenticate(self.user)
        r = self.client.post(f'/api/accounts/users/{self.user.id}/set-password/',
                             {'password': 'corta1'}, format='json')  # < 12 chars
        self.assertEqual(r.status_code, 400)

    def test_set_password_acepta_password_fuerte(self):
        self.client.force_authenticate(self.user)
        r = self.client.post(f'/api/accounts/users/{self.user.id}/set-password/',
                             {'password': 'Verde-Montana-Lluvia-Camino-91'}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_validador_de_similitud_configurado(self):
        # B-3: UserAttributeSimilarityValidator presente en la política de passwords.
        from django.conf import settings
        names = [v['NAME'] for v in settings.AUTH_PASSWORD_VALIDATORS]
        self.assertIn(
            'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', names)


class IsAdminRoleConsolidationTests(APITestCase):
    """B-6: IsAdminRole es una única definición canónica reutilizada en todos los módulos."""

    def test_misma_clase_en_todos_los_modulos(self):
        from core.permissions import IsAdminRole as Canonical
        from accounts.views import IsAdminRole as FromAccounts
        from team.views import IsAdminRole as FromTeam
        self.assertIs(FromAccounts, Canonical)
        self.assertIs(FromTeam, Canonical)
