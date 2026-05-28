from django.contrib import admin
from .models import CustomerAvatar


@admin.register(CustomerAvatar)
class CustomerAvatarAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'emoji',
        'age_range',
        'location',
        'origin_country',
        'occupation',
        'immigration_status',
        'is_primary',
        'is_active',
        'created_by',
        'created_at',
        'updated_at',
    ]
    list_filter = ['is_primary', 'is_active', 'origin_country']
    search_fields = ['name', 'description', 'occupation', 'location']
    readonly_fields = ['created_at', 'updated_at']
