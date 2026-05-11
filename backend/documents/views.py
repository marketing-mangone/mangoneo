import uuid
import os
import mimetypes

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from django.conf import settings
from django.http import FileResponse, Http404
from django.utils import timezone

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Document
from .serializers import DocumentSerializer, UploadURLSerializer


def _r2_client():
    """Crea cliente S3 apuntando a Cloudflare R2 si las credenciales están configuradas."""
    key    = getattr(settings, 'AWS_ACCESS_KEY_ID', '')
    secret = getattr(settings, 'AWS_SECRET_ACCESS_KEY', '')
    endpoint = getattr(settings, 'AWS_S3_ENDPOINT_URL', '')
    if not all([key, secret, endpoint]):
        return None
    return boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=key,
        aws_secret_access_key=secret,
        config=Config(signature_version='s3v4'),
    )


def _ext_to_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower().lstrip('.')
    mapping = {
        'pdf': 'pdf', 'docx': 'docx', 'doc': 'docx',
        'pptx': 'pptx', 'ppt': 'pptx',
        'xlsx': 'xlsx', 'xls': 'xlsx',
        'html': 'html', 'md': 'md',
        'png': 'png', 'jpg': 'jpg', 'jpeg': 'jpg',
        'mp4': 'mp4',
    }
    return mapping.get(ext, 'other')


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.select_related('uploaded_by').all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'file_name']
    ordering_fields = ['created_at', 'updated_at', 'title', 'file_size']
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        status_  = self.request.query_params.get('status')
        ftype    = self.request.query_params.get('file_type')
        if category and category != 'all':
            qs = qs.filter(category=category)
        if status_:
            qs = qs.filter(status=status_)
        if ftype:
            qs = qs.filter(file_type=ftype)
        return qs

    def create(self, request, *args, **kwargs):
        """
        Crea el registro del documento.
        - Si llega 'file' en el body → upload directo (dev/local).
        - Si llega 'object_key' → el archivo ya subió a R2, solo guarda el registro.
        """
        file = request.FILES.get('file')

        if file:
            # Modo local: guardar en media/
            doc = Document(
                title=request.data.get('title', file.name),
                description=request.data.get('description', ''),
                category=request.data.get('category', 'sop'),
                status=request.data.get('status', 'active'),
                visibility=request.data.get('visibility', 'team'),
                version=request.data.get('version', '1.0'),
                file=file,
                file_name=file.name,
                file_type=_ext_to_type(file.name),
                file_size=file.size,
                content_type=file.content_type or mimetypes.guess_type(file.name)[0] or '',
                uploaded_by=request.user,
            )
            doc.save()
            return Response(DocumentSerializer(doc, context={'request': request}).data,
                            status=status.HTTP_201_CREATED)

        # Modo R2: recibe JSON con object_key y metadatos
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── Presigned upload URL ─────────────────────────────────────────────────

    @action(detail=False, methods=['post'], url_path='upload-url')
    def upload_url(self, request):
        """
        Devuelve una presigned PUT URL para subir directamente a R2.
        Si R2 no está configurado, indica que se use upload directo a Django.
        """
        s = UploadURLSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        file_name    = s.validated_data['file_name']
        content_type = s.validated_data['content_type']
        file_size    = s.validated_data['file_size']

        client = _r2_client()

        if client is None:
            # Sin R2: el cliente debe hacer POST multipart a /api/documents/
            return Response({
                'mode': 'direct',
                'upload_endpoint': '/api/documents/',
                'message': 'R2 no configurado — usar upload directo a Django.',
            })

        # Con R2: generar object_key único y presigned URL
        ext        = os.path.splitext(file_name)[1]
        object_key = f"documents/{timezone.now().strftime('%Y/%m')}/{uuid.uuid4().hex}{ext}"
        bucket     = settings.AWS_STORAGE_BUCKET_NAME

        try:
            upload_url = client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': bucket,
                    'Key': object_key,
                    'ContentType': content_type,
                    'ContentLength': file_size,
                },
                ExpiresIn=900,  # 15 minutos
            )
        except ClientError as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'mode': 'r2',
            'upload_url': upload_url,
            'object_key': object_key,
        })

    # ── Presigned download / view URL ────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='download-url')
    def download_url(self, request, pk=None):
        """
        Devuelve la URL para ver o descargar el documento.
        - R2: presigned GET URL (expira en 1 hora)
        - Local: URL de media servida por Django
        """
        doc = self.get_object()

        if doc.object_key:
            client = _r2_client()
            if client is None:
                return Response({'error': 'R2 no configurado pero el archivo está en R2.'},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            try:
                url = client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                        'Key': doc.object_key,
                        'ResponseContentDisposition': f'inline; filename="{doc.file_name}"',
                    },
                    ExpiresIn=3600,
                )
            except ClientError as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response({'url': url, 'file_name': doc.file_name})

        # Modo local
        if not doc.file:
            return Response({'error': 'Este documento no tiene archivo adjunto.'},
                            status=status.HTTP_404_NOT_FOUND)

        file_url = request.build_absolute_uri(doc.file.url)
        return Response({'url': file_url, 'file_name': doc.file_name or doc.file.name})

    # ── Descarga directa (streaming) para archivos locales ──────────────────

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """Stream del archivo local para descarga directa."""
        doc = self.get_object()
        if not doc.file:
            raise Http404
        response = FileResponse(
            doc.file.open('rb'),
            as_attachment=True,
            filename=doc.file_name or os.path.basename(doc.file.name),
        )
        return response
