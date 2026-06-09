from django.utils import timezone
from rest_framework import serializers
from .models import BlogPost, STAGE_ORDER


def _user_name(user):
    if not user:
        return None
    return user.get_full_name() or user.username


class BlogPostSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    created_by_name  = serializers.SerializerMethodField()
    practice_area_display = serializers.CharField(source='get_practice_area_display', read_only=True)
    stage_display    = serializers.CharField(source='get_stage_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'keyword', 'practice_area', 'practice_area_display',
            'stage', 'stage_display', 'priority', 'priority_display',
            'assigned_to', 'assigned_to_name',
            'reviewed_by', 'reviewed_by_name',
            'created_by',  'created_by_name',
            'due_date', 'word_count_target',
            'brief', 'notes', 'webflow_url',
            'published_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'published_at']

    def get_assigned_to_name(self, obj): return _user_name(obj.assigned_to)
    def get_reviewed_by_name(self, obj): return _user_name(obj.reviewed_by)
    def get_created_by_name(self, obj):  return _user_name(obj.created_by)

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class BlogPostStageSerializer(serializers.Serializer):
    """Moves a post to the next (or a specific) stage."""
    stage = serializers.ChoiceField(
        choices=[s[0] for s in BlogPost._meta.get_field('stage').choices],
        required=False,
    )

    def validate(self, attrs):
        post = self.context['post']
        target = attrs.get('stage')
        if target:
            current_idx = STAGE_ORDER.index(post.stage)
            target_idx  = STAGE_ORDER.index(target)
            # Allow moving forward only (or same stage = no-op); admin can move freely
            user = self.context['request'].user
            is_admin = getattr(getattr(user, 'profile', None), 'role', None) == 'admin' or user.is_superuser
            if not is_admin and target_idx < current_idx:
                raise serializers.ValidationError("No se puede retroceder una etapa sin permisos de admin.")
        else:
            # Auto-advance
            current_idx = STAGE_ORDER.index(post.stage)
            if current_idx >= len(STAGE_ORDER) - 1:
                raise serializers.ValidationError("El post ya está en la etapa final.")
            attrs['stage'] = STAGE_ORDER[current_idx + 1]
        return attrs

    def save(self, **kwargs):
        post = self.context['post']
        post.stage = self.validated_data['stage']
        if post.stage == 'publicado' and not post.published_at:
            post.published_at = timezone.now()
        post.save()
        return post
