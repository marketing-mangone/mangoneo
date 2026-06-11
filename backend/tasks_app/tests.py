from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from accounts.models import UserProfile


def _user(username, role):
    u = User.objects.create_user(username=username, password='x')
    UserProfile.objects.update_or_create(user=u, defaults={'role': role})
    return u


class TaskAccessTests(APITestCase):
    """M-9: módulos internos (tareas) excluyen a viewer; team/leadership conservan acceso."""

    @classmethod
    def setUpTestData(cls):
        cls.team = _user('sara', 'team')
        cls.leadership = _user('partner', 'leadership')
        cls.viewer = _user('rrhh', 'viewer')

    def test_viewer_sin_acceso_a_tareas(self):
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.get('/api/tasks/').status_code, 403)

    def test_team_ve_el_kanban_completo(self):
        self.client.force_authenticate(self.team)
        self.assertEqual(self.client.get('/api/tasks/').status_code, 200)

    def test_leadership_solo_lectura(self):
        self.client.force_authenticate(self.leadership)
        self.assertEqual(self.client.get('/api/tasks/').status_code, 200)
        r = self.client.post('/api/tasks/', {'title': 'x'})
        self.assertEqual(r.status_code, 403)
