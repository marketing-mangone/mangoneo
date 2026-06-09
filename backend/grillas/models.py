from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


TEMA_CHOICES = [
    ('vawa', 'VAWA'),
    ('visa_t', 'Visa T'),
    ('visa_u', 'Visa U'),
    ('visa_t_laboral', 'Visa T – Laboral'),
    ('visa_t_trafico', 'Visa T – Tráfico'),
    ('sijs', 'SIJS'),
    ('ajuste_estatus', 'Ajuste de Estatus'),
    ('proceso_consular', 'Proceso Consular'),
    ('uscis', 'USCIS – Noticias'),
]

STATUS_CHOICES = [
    ('borrador', 'Borrador'),
    ('lista', 'Lista para revisar'),
    ('publicada', 'Publicada'),
]


TONO_CHOICES = [
    ('educativo',  'Educativo'),
    ('emotivo',    'Emotivo'),
    ('urgente',    'Urgente'),
    ('inspirador', 'Inspirador'),
]


class ContentGrid(models.Model):
    week_start = models.DateField(help_text="Lunes de inicio de la semana")
    tema = models.CharField(max_length=50, choices=TEMA_CHOICES)
    tono = models.CharField(max_length=20, choices=TONO_CHOICES, default='educativo', blank=True)
    notes = models.TextField(blank=True, help_text="Contexto adicional para la IA")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='borrador')
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-week_start']

    def __str__(self):
        return f"Grilla {self.week_start} – {self.get_tema_display()}"


class GridPost(models.Model):
    SLOT_CHOICES = [
        ('carousel', 'Carrusel / Post Estático'),
        ('foto', 'Foto Abogada/Cliente'),
        ('reel', 'Reel'),
    ]
    FORMAT_CHOICES = [
        ('carousel', 'Carrusel'),
        ('static', 'Post Estático'),
        ('foto', 'Foto'),
        ('reel', 'Reel'),
    ]

    grid = models.ForeignKey(ContentGrid, on_delete=models.CASCADE, related_name='posts')
    day_of_week = models.IntegerField(help_text="0=Lunes, 6=Domingo")
    slot = models.CharField(max_length=20, choices=SLOT_CHOICES)
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES)

    # Carousel / Static fields
    headline = models.TextField(blank=True, help_text="Texto para la imagen (lo que diseña Sara)")
    slide_titles = models.JSONField(default=list, blank=True, help_text="Títulos de cada slide del carrusel")

    # Common caption fields
    copy = models.TextField(blank=True, help_text="Cuerpo del caption sin hook/CTA/disclaimer/hashtags")
    cta = models.TextField(blank=True)
    hashtags = models.TextField(blank=True)
    caption = models.TextField(blank=True, help_text="Caption completo listo para publicar")

    # Foto fields
    photo_suggestion = models.TextField(blank=True, help_text="Descripción de qué foto buscar en el archivo")

    # Reel fields
    video_title = models.TextField(blank=True, help_text="Texto corto que aparece en pantalla al inicio")
    script_points = models.JSONField(default=list, blank=True, help_text="Puntos clave del guión para Gloriana")

    # Approval
    approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='approved_posts',
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['day_of_week', 'slot']
        unique_together = ['grid', 'day_of_week', 'slot']

    def __str__(self):
        days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
        return f"{days[self.day_of_week]} – {self.get_slot_display()}"


class GridPostComment(models.Model):
    post = models.ForeignKey(GridPost, on_delete=models.CASCADE, related_name='comments')
    author_name = models.CharField(max_length=100, blank=True)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comentario en {self.post} por {self.author_name}"


class GridPostVersion(models.Model):
    """Snapshot of a post's caption before it was edited."""
    post = models.ForeignKey(GridPost, on_delete=models.CASCADE, related_name='versions')
    caption = models.TextField()
    changed_by_name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Versión de {self.post} – {self.created_at:%Y-%m-%d %H:%M}"
