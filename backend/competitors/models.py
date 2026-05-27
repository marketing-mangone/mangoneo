from django.db import models
from django.contrib.auth.models import User


class Competitor(models.Model):
    CATEGORY_CHOICES = [
        ('direct', 'Competidor Directo'),
        ('indirect', 'Competidor Indirecto'),
    ]
    name = models.CharField(max_length=200)
    website = models.URLField(blank=True)
    logo_url = models.URLField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='direct')
    practice_areas = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class CompetitorScore(models.Model):
    """Puntuación 0-10 por dimensión — manual o automatizado"""
    DIMENSION_CHOICES = [
        ('seo', 'SEO'),
        ('social_media', 'Redes Sociales'),
        ('advertising', 'Publicidad'),
        ('web_presence', 'Presencia Web'),
        ('content', 'Contenido'),
        ('reviews', 'Reseñas'),
    ]
    SOURCE_CHOICES = [
        ('manual', 'Manual'),
        ('similarweb', 'SimilarWeb'),
        ('api', 'API'),
    ]
    competitor = models.ForeignKey(Competitor, related_name='scores', on_delete=models.CASCADE)
    dimension = models.CharField(max_length=50, choices=DIMENSION_CHOICES)
    score = models.DecimalField(max_digits=4, decimal_places=1)  # 0.0–10.0
    raw_value = models.CharField(max_length=300, blank=True)  # ej: "4.8/5 (120 reseñas)"
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    period = models.DateField()  # snapshot mensual
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['competitor', 'dimension', 'period']
        ordering = ['-period']

    def __str__(self):
        return f"{self.competitor.name} — {self.get_dimension_display()} ({self.period})"


class AdObservation(models.Model):
    """Creatividades y mensajes de ads observados en la competencia"""
    PLATFORM_CHOICES = [
        ('meta', 'Meta (Facebook/Instagram)'),
        ('google', 'Google Ads'),
        ('youtube', 'YouTube'),
        ('tiktok', 'TikTok'),
    ]
    competitor = models.ForeignKey(Competitor, related_name='ad_observations', on_delete=models.CASCADE)
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    creative_url = models.URLField(blank=True)
    headline = models.CharField(max_length=500, blank=True)
    message = models.TextField(blank=True)
    cta = models.CharField(max_length=200, blank=True)
    differentiator = models.TextField(blank=True)
    observed_date = models.DateField()
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='ad_observations'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-observed_date']

    def __str__(self):
        return f"{self.competitor.name} — {self.get_platform_display()} ({self.observed_date})"


class CompetitorInsight(models.Model):
    """Insights manuales: oportunidades, amenazas, observaciones"""
    IMPACT_CHOICES = [('high', 'Alto'), ('medium', 'Medio'), ('low', 'Bajo')]
    TYPE_CHOICES = [
        ('threat', 'Amenaza'),
        ('opportunity', 'Oportunidad'),
        ('observation', 'Observación'),
    ]
    competitor = models.ForeignKey(
        Competitor, null=True, blank=True, related_name='insights', on_delete=models.SET_NULL
    )
    insight_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    impact = models.CharField(max_length=10, choices=IMPACT_CHOICES)
    title = models.CharField(max_length=300)
    description = models.TextField()
    action_items = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='competitor_insights'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
