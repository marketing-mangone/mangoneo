from django.db import models
from django.contrib.auth.models import User


class Document(models.Model):
    CATEGORY_CHOICES = [
        ('sop', 'SOP'),
        ('manual', 'Manual'),
        ('jd', 'Job Description'),
        ('template', 'Template'),
        ('policy', 'Política'),
        ('brand', 'Marca'),
    ]
    FILE_TYPE_CHOICES = [
        ('pdf', 'PDF'), ('docx', 'Word'), ('pptx', 'PowerPoint'),
        ('xlsx', 'Excel'), ('html', 'HTML'), ('md', 'Markdown'),
        ('png', 'PNG'), ('jpg', 'JPEG'), ('mp4', 'Video'),
        ('other', 'Otro'),
    ]
    STATUS_CHOICES = [
        ('active', 'Activo'), ('draft', 'Borrador'), ('archived', 'Archivado'),
    ]
    VISIBILITY_CHOICES = [
        ('team', 'Equipo'), ('leadership', 'Liderazgo'), ('all', 'Todos'),
    ]

    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category    = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='sop')
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    visibility  = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='team')
    version     = models.CharField(max_length=20, default='1.0')

    # Almacenamiento: object_key para R2, file para local dev
    object_key   = models.CharField(max_length=500, blank=True, help_text='Clave en R2/S3')
    file         = models.FileField(upload_to='documents/%Y/%m/', null=True, blank=True)
    file_name    = models.CharField(max_length=255, blank=True)
    file_type    = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES, default='pdf')
    file_size    = models.PositiveBigIntegerField(default=0, help_text='Tamaño en bytes')
    content_type = models.CharField(max_length=100, blank=True, help_text='MIME type')

    uploaded_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='documents'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title

    @property
    def storage_backend(self):
        """Devuelve 'r2' si el archivo está en R2, 'local' si está en disco."""
        return 'r2' if self.object_key else 'local'

    @property
    def size_display(self):
        size = self.file_size
        if size >= 1_000_000:
            return f'{size / 1_000_000:.1f} MB'
        if size >= 1_000:
            return f'{size / 1_000:.0f} KB'
        return f'{size} B'
