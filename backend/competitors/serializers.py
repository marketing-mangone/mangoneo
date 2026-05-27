from rest_framework import serializers
from .models import Competitor, CompetitorScore, AdObservation, CompetitorInsight


class CompetitorScoreSerializer(serializers.ModelSerializer):
    dimension_display = serializers.CharField(source='get_dimension_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)

    class Meta:
        model = CompetitorScore
        fields = [
            'id', 'competitor', 'dimension', 'dimension_display',
            'score', 'raw_value', 'source', 'source_display',
            'period', 'notes', 'created_at',
        ]


class AdObservationSerializer(serializers.ModelSerializer):
    platform_display = serializers.CharField(source='get_platform_display', read_only=True)

    class Meta:
        model = AdObservation
        fields = [
            'id', 'competitor', 'platform', 'platform_display',
            'creative_url', 'headline', 'message', 'cta',
            'differentiator', 'observed_date', 'is_active',
            'notes', 'created_by', 'created_at',
        ]
        read_only_fields = ['created_by', 'created_at']


class CompetitorInsightSerializer(serializers.ModelSerializer):
    insight_type_display = serializers.CharField(source='get_insight_type_display', read_only=True)
    impact_display = serializers.CharField(source='get_impact_display', read_only=True)

    class Meta:
        model = CompetitorInsight
        fields = [
            'id', 'competitor', 'insight_type', 'insight_type_display',
            'impact', 'impact_display', 'title', 'description',
            'action_items', 'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class CompetitorSerializer(serializers.ModelSerializer):
    scores = CompetitorScoreSerializer(many=True, read_only=True)
    ad_observations = AdObservationSerializer(many=True, read_only=True)
    insights = CompetitorInsightSerializer(many=True, read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Competitor
        fields = [
            'id', 'name', 'website', 'logo_url', 'category', 'category_display',
            'practice_areas', 'description', 'location', 'is_active',
            'created_at', 'updated_at',
            'scores', 'ad_observations', 'insights',
        ]
        read_only_fields = ['created_at', 'updated_at']


class CompetitorListSerializer(serializers.ModelSerializer):
    """Versión ligera para listados — sin anidados completos, solo latest_scores."""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    latest_scores = serializers.SerializerMethodField()

    class Meta:
        model = Competitor
        fields = [
            'id', 'name', 'website', 'logo_url', 'category', 'category_display',
            'practice_areas', 'location', 'is_active',
            'created_at', 'updated_at', 'latest_scores',
        ]

    def get_latest_scores(self, obj):
        """
        Devuelve un dict con la última puntuación por dimensión para el período más reciente
        disponible por cada dimensión.
        Ej: {'seo': 7.5, 'social_media': 6.0, ...}
        """
        scores = obj.scores.order_by('dimension', '-period')
        seen_dimensions = set()
        result = {}
        for score in scores:
            if score.dimension not in seen_dimensions:
                result[score.dimension] = float(score.score)
                seen_dimensions.add(score.dimension)
        return result
