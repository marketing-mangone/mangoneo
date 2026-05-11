from django.db import models
from django.contrib.auth.models import User


class CalendarEvent(models.Model):
    TYPE_CHOICES = [
        ('content', 'Contenido'), ('meeting', 'Reunión'), ('deadline', 'Entrega'),
        ('campaign', 'Campaña'), ('event', 'Evento'),
    ]
    CHANNEL_CHOICES = [
        ('instagram', 'Instagram'), ('tiktok', 'TikTok'), ('youtube', 'YouTube'),
        ('linkedin', 'LinkedIn'), ('facebook', 'Facebook'), ('podcast', 'Podcast'),
        ('web', 'Web'), ('all', 'Todos'),
    ]
    STATUS_CHOICES = [
        ('scheduled', 'Programado'), ('published', 'Publicado'),
        ('draft', 'Borrador'), ('cancelled', 'Cancelado'),
    ]

    title       = models.CharField(max_length=255)
    type        = models.CharField(max_length=20, choices=TYPE_CHOICES, default='content')
    date        = models.DateField()
    end_date    = models.DateField(null=True, blank=True)
    time        = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    assignee    = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='calendar_events')
    channel     = models.CharField(max_length=20, choices=CHANNEL_CHOICES, blank=True)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    created_by  = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_events')
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'time']

    def __str__(self): return f"{self.date} — {self.title}"


class Task(models.Model):
    STATUS_CHOICES = [('pending','Pendiente'),('in_progress','En progreso'),('review','En revisión'),('done','Completada'),('blocked','Bloqueada')]
    PRIORITY_CHOICES = [('low','Baja'),('medium','Media'),('high','Alta'),('urgent','Urgente')]
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    assignee = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_tasks')
    due_date = models.DateField(null=True, blank=True)
    project = models.CharField(max_length=100, blank=True)
    progress = models.IntegerField(default=0)
    tags = models.JSONField(default=list)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_tasks')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self): return self.title
