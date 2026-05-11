from django.db import models
from django.contrib.auth.models import User

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
