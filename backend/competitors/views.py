from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.views import IsAdminRole
from core.permissions import get_role

from .models import Competitor, CompetitorScore, AdObservation, CompetitorInsight
from .serializers import (
    CompetitorSerializer,
    CompetitorListSerializer,
    CompetitorScoreSerializer,
    AdObservationSerializer,
    CompetitorInsightSerializer,
)


READ_ACTIONS = ('list', 'retrieve', 'radar_data')


class CompetitorViewSet(viewsets.ModelViewSet):
    queryset = Competitor.objects.filter(is_active=True)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'location', 'description']
    ordering_fields = ['name', 'created_at', 'category']

    def get_permissions(self):
        return [IsAuthenticated()] if self.action in READ_ACTIONS else [IsAdminRole()]

    def get_queryset(self):
        qs = Competitor.objects.all()
        # Solo admin puede ver inactivos vía ?all=true; el resto siempre filtrado.
        show_all = self.request.query_params.get('all') == 'true' and get_role(self.request.user) == 'admin'
        if not show_all:
            qs = qs.filter(is_active=True)
        return qs

    def get_serializer_class(self):
        if self.action in ['list']:
            return CompetitorListSerializer
        return CompetitorSerializer

    @action(detail=False, methods=['get'], url_path='radar-data')
    def radar_data(self, request):
        """
        Devuelve todos los competidores activos con sus últimas puntuaciones
        en formato adecuado para un radar chart.
        """
        queryset = self.get_queryset()
        serializer = CompetitorListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class CompetitorScoreViewSet(viewsets.ModelViewSet):
    queryset = CompetitorScore.objects.all()
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['period', 'dimension', 'score']

    def get_permissions(self):
        return [IsAuthenticated()] if self.action in READ_ACTIONS else [IsAdminRole()]

    def get_queryset(self):
        qs = CompetitorScore.objects.select_related('competitor')
        competitor_id = self.request.query_params.get('competitor')
        if competitor_id:
            qs = qs.filter(competitor_id=competitor_id)
        return qs

    def get_serializer_class(self):
        return CompetitorScoreSerializer


class AdObservationViewSet(viewsets.ModelViewSet):
    queryset = AdObservation.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['headline', 'message', 'differentiator']
    ordering_fields = ['observed_date', 'platform']

    def get_permissions(self):
        return [IsAuthenticated()] if self.action in READ_ACTIONS else [IsAdminRole()]

    def get_queryset(self):
        qs = AdObservation.objects.select_related('competitor', 'created_by')
        competitor_id = self.request.query_params.get('competitor')
        if competitor_id:
            qs = qs.filter(competitor_id=competitor_id)
        platform = self.request.query_params.get('platform')
        if platform:
            qs = qs.filter(platform=platform)
        return qs

    def get_serializer_class(self):
        return AdObservationSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CompetitorInsightViewSet(viewsets.ModelViewSet):
    queryset = CompetitorInsight.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'impact', 'insight_type']

    def get_permissions(self):
        return [IsAuthenticated()] if self.action in READ_ACTIONS else [IsAdminRole()]

    def get_queryset(self):
        qs = CompetitorInsight.objects.select_related('competitor', 'created_by')
        competitor_id = self.request.query_params.get('competitor')
        if competitor_id:
            qs = qs.filter(competitor_id=competitor_id)
        insight_type = self.request.query_params.get('insight_type')
        if insight_type:
            qs = qs.filter(insight_type=insight_type)
        return qs

    def get_serializer_class(self):
        return CompetitorInsightSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
