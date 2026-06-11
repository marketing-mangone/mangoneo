from django.test import SimpleTestCase
from rest_framework import serializers

from .serializers import DocumentSerializer, UploadURLSerializer


class FileNameSanitizationTests(SimpleTestCase):
    """B-10: file_name no debe contener componentes de ruta (anti header injection)."""

    def test_basename_neutraliza_path_traversal(self):
        s = UploadURLSerializer()
        self.assertEqual(s.validate_file_name('../../etc/passwd'), 'passwd')
        self.assertEqual(s.validate_file_name(r'C:\Windows\system32\x.pdf'), 'x.pdf')

    def test_strip_control_chars(self):
        s = UploadURLSerializer()
        self.assertNotIn('\n', s.validate_file_name('doc\n.pdf'))

    def test_nombre_vacio_rechazado(self):
        s = UploadURLSerializer()
        with self.assertRaises(serializers.ValidationError):
            s.validate_file_name('../')


class ObjectKeyValidationTests(SimpleTestCase):
    """M-7: object_key solo acepta el formato emitido por el servidor."""

    def test_clave_valida(self):
        s = DocumentSerializer()
        key = 'documents/2026/06/' + 'a' * 32 + '.pdf'
        self.assertEqual(s.validate_object_key(key), key)

    def test_clave_arbitraria_rechazada(self):
        s = DocumentSerializer()
        for bad in ['secrets/key.txt', '../../etc/passwd', 'documents/../x']:
            with self.assertRaises(serializers.ValidationError):
                s.validate_object_key(bad)

    def test_vacio_permitido(self):
        # En modo legacy puede no haber object_key.
        s = DocumentSerializer()
        self.assertEqual(s.validate_object_key(''), '')
