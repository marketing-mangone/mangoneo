from django.db import models
from django.contrib.auth.models import User


class CustomerAvatar(models.Model):
    # Identidad del avatar
    name = models.CharField(max_length=200, help_text="Nombre del avatar, ej: María - La Madre Inmigrante")
    description = models.TextField(blank=True, help_text="Descripción breve del perfil")
    emoji = models.CharField(max_length=10, default='👤', help_text="Emoji representativo")
    quote = models.CharField(max_length=500, blank=True, help_text="Frase que representa al avatar")
    color = models.CharField(max_length=7, default='#0C2054', help_text="Color de acento para el canvas")

    # Datos demográficos
    age_range = models.CharField(max_length=50, blank=True)
    location = models.CharField(max_length=200, blank=True, help_text="Ciudad/estado donde vive en EE.UU.")
    origin_country = models.CharField(max_length=100, blank=True)
    family_situation = models.CharField(max_length=300, blank=True)
    occupation = models.CharField(max_length=200, blank=True)
    immigration_status = models.CharField(max_length=200, blank=True)
    education = models.CharField(max_length=200, blank=True)
    income_range = models.CharField(max_length=100, blank=True)

    # Psicografía (listas JSON)
    goals = models.JSONField(default=list, blank=True, help_text="Metas a corto y largo plazo")
    pain_points = models.JSONField(default=list, blank=True, help_text="Dolores, miedos y frustraciones")
    values = models.JSONField(default=list, blank=True, help_text="Valores que le importan")
    dreams = models.JSONField(default=list, blank=True, help_text="Sueños y aspiraciones")
    interests = models.JSONField(default=list, blank=True, help_text="Intereses y hobbies")
    favorite_brands = models.JSONField(default=list, blank=True, help_text="Marcas y medios que consume")
    media_channels = models.JSONField(default=list, blank=True, help_text="Canales de información que usa")
    objections = models.JSONField(default=list, blank=True, help_text="Por qué podría no contratarnos")
    triggers = models.JSONField(default=list, blank=True, help_text="Qué lo motiva a tomar acción")

    is_primary = models.BooleanField(default=False, help_text="Avatar principal del equipo")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_primary', '-created_at']

    def __str__(self):
        return self.name
