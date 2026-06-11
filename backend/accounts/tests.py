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
                             {'password': 'Una-Clave-Muy-Larga-Y-Segura-2026'}, format='json')
        self.assertEqual(r.status_code, 200)
