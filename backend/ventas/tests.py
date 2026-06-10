from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from accounts.models import UserProfile
from .models import Lead


def _user(username, role):
    u = User.objects.create_user(username=username, password='x')
    # UserProfile puede crearse via signal; usar update_or_create por idempotencia
    UserProfile.objects.update_or_create(user=u, defaults={'role': role})
    return u


class SalesAccessTests(APITestCase):
    """C-3 / C-4: control de acceso por rol en el CRM de Ventas (modelo colaborativo)."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = _user('sebas', 'admin')
        cls.team = _user('alejandra', 'team')
        cls.leadership = _user('auguy', 'leadership')
        cls.viewer = _user('otro_depto', 'viewer')
        cls.lead = Lead.objects.create(name='Cliente PII', email='c@x.com', stage='nuevo')

    # ── viewer: sin acceso ──────────────────────────────────────────────
    def test_viewer_no_puede_listar_leads(self):
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.get('/api/ventas/leads/').status_code, 403)

    def test_viewer_no_puede_ver_stats(self):
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.get('/api/ventas/leads/stats/').status_code, 403)

    def test_viewer_no_puede_borrar(self):
        self.client.force_authenticate(self.viewer)
        r = self.client.delete(f'/api/ventas/leads/{self.lead.id}/')
        self.assertEqual(r.status_code, 403)

    # ── leadership: solo lectura ────────────────────────────────────────
    def test_leadership_puede_leer(self):
        self.client.force_authenticate(self.leadership)
        self.assertEqual(self.client.get('/api/ventas/leads/').status_code, 200)
        self.assertEqual(self.client.get('/api/ventas/leads/stats/').status_code, 200)

    def test_leadership_no_puede_escribir(self):
        self.client.force_authenticate(self.leadership)
        r = self.client.delete(f'/api/ventas/leads/{self.lead.id}/')
        self.assertEqual(r.status_code, 403)

    # ── team / admin: acceso completo ───────────────────────────────────
    def test_team_lectura_y_escritura(self):
        self.client.force_authenticate(self.team)
        self.assertEqual(self.client.get('/api/ventas/leads/').status_code, 200)
        r = self.client.patch(f'/api/ventas/leads/{self.lead.id}/', {'priority': 'alta'})
        self.assertEqual(r.status_code, 200)

    def test_admin_puede_borrar(self):
        self.client.force_authenticate(self.admin)
        r = self.client.delete(f'/api/ventas/leads/{self.lead.id}/')
        self.assertEqual(r.status_code, 204)

    def test_no_autenticado_rechazado(self):
        self.assertEqual(self.client.get('/api/ventas/leads/').status_code, 401)
