from django.test import SimpleTestCase

from .views import _clean_platforms


class PlatformAllowlistTests(SimpleTestCase):
    """B-9: solo se aceptan plataformas dentro de la allowlist."""

    def test_plataformas_validas(self):
        cleaned, err = _clean_platforms(['instagram', 'facebook'])
        self.assertIsNone(err)
        self.assertEqual(cleaned, ['instagram', 'facebook'])

    def test_plataforma_invalida_rechazada(self):
        _, err = _clean_platforms(['instagram', 'myspace'])
        self.assertIsNotNone(err)

    def test_lista_vacia_rechazada(self):
        _, err = _clean_platforms([])
        self.assertIsNotNone(err)

    def test_no_lista_rechazada(self):
        _, err = _clean_platforms('instagram')
        self.assertIsNotNone(err)
