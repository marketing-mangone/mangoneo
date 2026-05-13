from django.db import models
from django.contrib.auth.models import User

class MetricDefinition(models.Model):
    CATEGORY_CHOICES = [('acquisition','Adquisición'),('engagement','Engagement'),('conversion','Conversión'),('brand','Marca')]
    SOURCE_CHOICES = [('hubspot','HubSpot'),('google_analytics','GA4'),('meta','Meta'),('google_ads','Google Ads'),('youtube','YouTube'),('manual','Manual')]
    UNIT_CHOICES = [('count','Conteo'),('currency','Moneda'),('percentage','Porcentaje'),('time','Tiempo')]
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='manual')
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='count')
    target_value = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class MetricSnapshot(models.Model):
    PERIOD_CHOICES = [('daily','Diario'),('weekly','Semanal'),('monthly','Mensual')]
    metric = models.ForeignKey(MetricDefinition, related_name='snapshots', on_delete=models.CASCADE)
    value = models.DecimalField(max_digits=14, decimal_places=4)
    previous_value = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    period_start = models.DateField()
    period_end = models.DateField()
    period_type = models.CharField(max_length=20, choices=PERIOD_CHOICES, default='monthly')
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['metric', 'period_start', 'period_type']
        indexes = [models.Index(fields=['metric', 'period_start'])]
        ordering = ['-period_start']

    def __str__(self):
        return f"{self.metric.name} — {self.period_start}"
