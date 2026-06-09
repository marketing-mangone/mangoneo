from django.db import models
from django.contrib.auth.models import User


STAGE_CHOICES = [
    ('idea',      'Idea'),
    ('redaccion', 'Redacción'),
    ('revision',  'Revisión'),
    ('aprobado',  'Aprobado'),
    ('publicado', 'Publicado'),
]

STAGE_ORDER = [s[0] for s in STAGE_CHOICES]

PRACTICE_AREA_CHOICES = [
    ('vawa',              'VAWA'),
    ('visa_u',            'Visa U'),
    ('visa_t',            'Visa T'),
    ('sijs',              'SIJS'),
    ('ajuste_estatus',    'Ajuste de Estatus'),
    ('reunion_familiar',  'Reunificación Familiar'),
    ('defensa_deportacion', 'Defensa de Deportación'),
    ('naturalizacion',    'Naturalización'),
    ('proceso_consular',  'Proceso Consular'),
    ('general',           'General / Inmigración'),
]

PRIORITY_CHOICES = [
    ('alta',   'Alta'),
    ('media',  'Media'),
    ('baja',   'Baja'),
]


class BlogPost(models.Model):
    title = models.CharField(max_length=300, help_text="Título del artículo")
    keyword = models.CharField(max_length=200, blank=True, help_text="Keyword SEO principal")
    practice_area = models.CharField(max_length=50, choices=PRACTICE_AREA_CHOICES, default='general')
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='idea')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='media')

    assigned_to = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='blog_assignments', help_text="Redactor asignado",
    )
    reviewed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='blog_reviews', help_text="Editor/revisor asignado",
    )
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='blog_created',
    )

    due_date = models.DateField(null=True, blank=True, help_text="Fecha límite")
    word_count_target = models.PositiveIntegerField(default=800, help_text="Palabras objetivo")

    brief = models.TextField(blank=True, help_text="Brief / ángulo / puntos clave")
    notes = models.TextField(blank=True, help_text="Notas internas del equipo")
    webflow_url = models.URLField(blank=True, help_text="URL en Webflow una vez publicado")

    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Post de Blog'
        verbose_name_plural = 'Posts de Blog'

    def __str__(self):
        return f"[{self.get_stage_display()}] {self.title}"
