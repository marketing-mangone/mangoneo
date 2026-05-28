from rest_framework import serializers
from .models import CustomerAvatar

MONTHS_ES = {
    1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
    5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
    9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre',
}


class CustomerAvatarSerializer(serializers.ModelSerializer):
    updated_at_display = serializers.SerializerMethodField()

    class Meta:
        model = CustomerAvatar
        fields = [
            'id',
            'name',
            'description',
            'emoji',
            'quote',
            'color',
            'age_range',
            'location',
            'origin_country',
            'family_situation',
            'occupation',
            'immigration_status',
            'education',
            'income_range',
            'goals',
            'pain_points',
            'values',
            'dreams',
            'interests',
            'favorite_brands',
            'media_channels',
            'objections',
            'triggers',
            'is_primary',
            'is_active',
            'created_by',
            'created_at',
            'updated_at',
            'updated_at_display',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'updated_at_display']

    def get_updated_at_display(self, obj):
        if not obj.updated_at:
            return ''
        dt = obj.updated_at
        return f"{dt.day} {MONTHS_ES[dt.month]} {dt.year}"
