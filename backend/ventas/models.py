from django.db import models
from django.contrib.auth.models import User


# Etapas del pipeline de conversión (estilo CRM)
STAGE_CHOICES = [
    ('nuevo',       'Nuevo'),
    ('contactado',  'Contactado'),
    ('calificado',  'Calificado'),
    ('consulta',    'Consulta agendada'),
    ('contrato',    'Contrato enviado'),
    ('ganado',      'Ganado'),
    ('perdido',     'Perdido'),
]

# Orden de avance del pipeline; 'perdido' es estado terminal fuera del flujo
STAGE_ORDER = ['nuevo', 'contactado', 'calificado', 'consulta', 'contrato', 'ganado']

SOURCE_CHOICES = [
    ('website',          'Sitio Web'),
    ('meta_ads',         'Meta Ads'),
    ('google_ads',       'Google Ads'),
    ('organico',         'Búsqueda Orgánica'),
    ('redes_sociales',   'Redes Sociales'),
    ('golden_tickets',   'Golden Tickets (Referido)'),
    ('consultation_day', 'Consultation Day'),
    ('podcast',          'Podcast'),
    ('evento',           'Evento'),
    ('otro',             'Otro'),
]

PRACTICE_AREA_CHOICES = [
    ('vawa',                'VAWA'),
    ('visa_u',              'Visa U'),
    ('visa_t',              'Visa T'),
    ('sijs',                'SIJS'),
    ('ajuste_estatus',      'Ajuste de Estatus'),
    ('reunion_familiar',    'Reunificación Familiar'),
    ('defensa_deportacion', 'Defensa de Deportación'),
    ('naturalizacion',      'Naturalización'),
    ('proceso_consular',    'Proceso Consular'),
    ('general',             'General / Inmigración'),
]

PRIORITY_CHOICES = [
    ('alta',  'Alta'),
    ('media', 'Media'),
    ('baja',  'Baja'),
]

LANGUAGE_CHOICES = [
    ('es', 'Español'),
    ('en', 'Inglés'),
]

ACTIVITY_TYPE_CHOICES = [
    ('nota',     'Nota'),
    ('llamada',  'Llamada'),
    ('email',    'Email'),
    ('whatsapp', 'WhatsApp'),
    ('reunion',  'Reunión'),
    ('etapa',    'Cambio de etapa'),
]


class Lead(models.Model):
    name = models.CharField(max_length=200, help_text="Nombre del prospecto")
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES, default='es')
    location = models.CharField(max_length=200, blank=True, help_text="Ciudad / Estado")

    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default='website')
    campaign = models.CharField(max_length=200, blank=True, help_text="Campaña o anuncio de origen")
    practice_area = models.CharField(max_length=50, choices=PRACTICE_AREA_CHOICES, default='general')

    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='nuevo')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='media')
    estimated_value = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Valor estimado del caso (USD)",
    )
    lost_reason = models.CharField(max_length=300, blank=True, help_text="Motivo si se perdió")

    assigned_to = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='leads_assigned', help_text="Responsable del seguimiento",
    )
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='leads_created',
    )

    next_followup = models.DateField(null=True, blank=True, help_text="Próximo seguimiento")
    last_contact_at = models.DateTimeField(null=True, blank=True)
    won_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True, help_text="Notas internas")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Lead'
        verbose_name_plural = 'Leads'

    def __str__(self):
        return f"[{self.get_stage_display()}] {self.name}"


class LeadActivity(models.Model):
    lead = models.ForeignKey(Lead, related_name='activities', on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPE_CHOICES, default='nota')
    description = models.TextField()
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='lead_activities',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Actividad de Lead'
        verbose_name_plural = 'Actividades de Lead'

    def __str__(self):
        return f"{self.get_activity_type_display()} · {self.lead.name}"
