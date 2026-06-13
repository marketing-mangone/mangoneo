from django.db import models
from django.contrib.auth.models import User

NOTIF_TYPE_CHOICES = [
    ('lead_assigned',    'Lead asignado'),
    ('task_assigned',    'Tarea asignada'),
    ('task_due',         'Tarea por vencer'),
    ('followup_overdue', 'Seguimiento vencido'),
    ('kpi_alert',        'Alerta de KPI'),
    ('system',           'Sistema'),
]


class Notification(models.Model):
    recipient = models.ForeignKey(User, related_name='notifications', on_delete=models.CASCADE)
    type = models.CharField(max_length=30, choices=NOTIF_TYPE_CHOICES, default='system')
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    link = models.CharField(max_length=300, blank=True, help_text="Ruta interna, ej. /ventas/leads/12")
    read = models.BooleanField(default=False)
    # Clave para evitar duplicados en escaneos recurrentes (ej. "task-due-5-2026-06-13")
    dedup_key = models.CharField(max_length=200, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['recipient', 'read'])]

    def __str__(self):
        return f"[{self.get_type_display()}] {self.title} → {self.recipient}"
