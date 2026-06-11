import re
from rest_framework import serializers
from .models import Document

# Debe coincidir con el formato generado en views.upload_url:
#   documents/YYYY/MM/<uuid4-hex><ext>
OBJECT_KEY_RE = re.compile(r'^documents/\d{4}/\d{2}/[0-9a-f]{32}(\.[A-Za-z0-9]+)?$')


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    size_display     = serializers.ReadOnlyField()
    storage_backend  = serializers.ReadOnlyField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'description', 'category', 'status', 'visibility',
            'version', 'file_name', 'file_type', 'file_size', 'size_display',
            'content_type', 'object_key', 'storage_backend',
            'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'uploaded_by']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None

    def validate_object_key(self, value):
        # El cliente reenvía la clave emitida por el servidor tras subir a R2.
        # Solo aceptar el formato exacto que emitimos: evita apuntar a claves
        # arbitrarias del bucket o secuencias de path traversal.
        if value and not OBJECT_KEY_RE.match(value):
            raise serializers.ValidationError('object_key inválido.')
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['uploaded_by'] = request.user
        return super().create(validated_data)


ALLOWED_CONTENT_TYPES = {
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime',
}

MAX_UPLOAD_BYTES = 52_428_800  # 50 MB


class UploadURLSerializer(serializers.Serializer):
    file_name    = serializers.CharField(max_length=255)
    content_type = serializers.CharField(max_length=100)
    file_size    = serializers.IntegerField(min_value=1, max_value=MAX_UPLOAD_BYTES)

    def validate_content_type(self, value):
        if value not in ALLOWED_CONTENT_TYPES:
            raise serializers.ValidationError(
                f'Tipo de archivo no permitido. Permitidos: PDF, Word, PowerPoint, Excel, imágenes, video MP4.'
            )
        return value

    def validate_file_name(self, value):
        import os
        # basename neutraliza componentes de ruta (../, /etc/…) antes de usar el
        # nombre en el header Content-Disposition de la descarga.
        sanitized = os.path.basename(value.replace('\\', '/'))
        sanitized = re.sub(r'["\r\n\x00-\x1f]', '', sanitized)
        if not sanitized:
            raise serializers.ValidationError('Nombre de archivo inválido.')
        return sanitized
