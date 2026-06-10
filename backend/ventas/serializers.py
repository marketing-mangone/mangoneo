from django.utils import timezone
from rest_framework import serializers
from .models import Lead, LeadActivity, STAGE_ORDER


def _user_name(user):
    if not user:
        return None
    return user.get_full_name() or user.username


class LeadActivitySerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LeadActivity
        fields = [
            'id', 'lead', 'activity_type', 'activity_type_display',
            'description', 'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'lead']

    def get_created_by_name(self, obj):
        return _user_name(obj.created_by)


class LeadSerializer(serializers.ModelSerializer):
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    practice_area_display = serializers.CharField(source='get_practice_area_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    language_display = serializers.CharField(source='get_language_display', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    activities = LeadActivitySerializer(many=True, read_only=True)

    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'email', 'phone', 'language', 'language_display', 'location',
            'source', 'source_display', 'campaign',
            'practice_area', 'practice_area_display',
            'stage', 'stage_display', 'priority', 'priority_display',
            'estimated_value', 'lost_reason',
            'assigned_to', 'assigned_to_name',
            'created_by', 'created_by_name',
            'next_followup', 'last_contact_at', 'won_at',
            'notes', 'created_at', 'updated_at', 'activities',
        ]
        read_only_fields = ['created_by', 'won_at', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        return _user_name(obj.assigned_to)

    def get_created_by_name(self, obj):
        return _user_name(obj.created_by)

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class LeadListSerializer(serializers.ModelSerializer):
    """Versión ligera para listados y kanban."""
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    practice_area_display = serializers.CharField(source='get_practice_area_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'email', 'phone', 'location',
            'source', 'source_display',
            'practice_area', 'practice_area_display',
            'stage', 'stage_display', 'priority', 'priority_display',
            'estimated_value', 'assigned_to', 'assigned_to_name',
            'next_followup', 'created_at', 'updated_at',
        ]

    def get_assigned_to_name(self, obj):
        return _user_name(obj.assigned_to)


class LeadStageSerializer(serializers.Serializer):
    """Mueve un lead a otra etapa del pipeline y registra la actividad."""
    stage = serializers.ChoiceField(
        choices=[s[0] for s in Lead._meta.get_field('stage').choices],
        required=False,
    )
    lost_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        lead = self.context['lead']
        target = attrs.get('stage')
        if not target:
            # Auto-avance a la siguiente etapa del flujo
            if lead.stage == 'perdido':
                raise serializers.ValidationError("Un lead perdido no avanza automáticamente; indica la etapa destino.")
            current_idx = STAGE_ORDER.index(lead.stage)
            if current_idx >= len(STAGE_ORDER) - 1:
                raise serializers.ValidationError("El lead ya está en la etapa final.")
            attrs['stage'] = STAGE_ORDER[current_idx + 1]
        return attrs

    def save(self, **kwargs):
        lead = self.context['lead']
        request = self.context['request']
        previous = lead.get_stage_display()
        lead.stage = self.validated_data['stage']

        if lead.stage == 'ganado' and not lead.won_at:
            lead.won_at = timezone.now()
        if lead.stage != 'ganado':
            lead.won_at = None
        if lead.stage == 'perdido':
            lead.lost_reason = self.validated_data.get('lost_reason', lead.lost_reason)
        else:
            lead.lost_reason = ''
        lead.save()

        LeadActivity.objects.create(
            lead=lead,
            activity_type='etapa',
            description=f"Etapa: {previous} → {lead.get_stage_display()}",
            created_by=request.user,
        )
        return lead
