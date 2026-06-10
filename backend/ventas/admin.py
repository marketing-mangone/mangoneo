from django.contrib import admin
from .models import Lead, LeadActivity


class LeadActivityInline(admin.TabularInline):
    model = LeadActivity
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('name', 'stage', 'source', 'practice_area', 'priority', 'assigned_to', 'created_at')
    list_filter = ('stage', 'source', 'practice_area', 'priority')
    search_fields = ('name', 'email', 'phone', 'campaign')
    readonly_fields = ('created_at', 'updated_at', 'won_at')
    inlines = [LeadActivityInline]


@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    list_display = ('lead', 'activity_type', 'created_by', 'created_at')
    list_filter = ('activity_type',)
    search_fields = ('lead__name', 'description')
