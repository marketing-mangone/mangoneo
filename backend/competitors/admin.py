from django.contrib import admin
from .models import Competitor, CompetitorScore, AdObservation, CompetitorInsight


class CompetitorScoreInline(admin.TabularInline):
    model = CompetitorScore
    extra = 0
    fields = ['dimension', 'score', 'raw_value', 'source', 'period', 'notes']
    ordering = ['-period', 'dimension']


class AdObservationInline(admin.TabularInline):
    model = AdObservation
    extra = 0
    fields = ['platform', 'headline', 'observed_date', 'is_active']
    ordering = ['-observed_date']


class CompetitorInsightInline(admin.TabularInline):
    model = CompetitorInsight
    extra = 0
    fields = ['insight_type', 'impact', 'title', 'created_by']
    ordering = ['-created_at']
    readonly_fields = ['created_by']


@admin.register(Competitor)
class CompetitorAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'location', 'website', 'is_active', 'created_at']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'location', 'description']
    inlines = [CompetitorScoreInline, AdObservationInline, CompetitorInsightInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CompetitorScore)
class CompetitorScoreAdmin(admin.ModelAdmin):
    list_display = ['competitor', 'dimension', 'score', 'source', 'period', 'created_at']
    list_filter = ['dimension', 'source', 'period']
    search_fields = ['competitor__name']
    ordering = ['-period', 'competitor__name']


@admin.register(AdObservation)
class AdObservationAdmin(admin.ModelAdmin):
    list_display = ['competitor', 'platform', 'headline', 'observed_date', 'is_active', 'created_by']
    list_filter = ['platform', 'is_active', 'observed_date']
    search_fields = ['competitor__name', 'headline', 'message']
    readonly_fields = ['created_by', 'created_at']

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(CompetitorInsight)
class CompetitorInsightAdmin(admin.ModelAdmin):
    list_display = ['title', 'competitor', 'insight_type', 'impact', 'created_by', 'created_at']
    list_filter = ['insight_type', 'impact']
    search_fields = ['title', 'description', 'competitor__name']
    readonly_fields = ['created_by', 'created_at', 'updated_at']

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
