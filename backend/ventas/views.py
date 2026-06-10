from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from .models import Lead, LeadActivity, STAGE_CHOICES
from .serializers import (
    LeadSerializer, LeadListSerializer, LeadActivitySerializer, LeadStageSerializer,
)


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related('assigned_to', 'created_by').order_by('-created_at')
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['stage', 'source', 'priority', 'practice_area', 'assigned_to']
    search_fields = ['name', 'email', 'phone', 'campaign', 'location']
    ordering_fields = ['created_at', 'updated_at', 'next_followup', 'estimated_value']

    def get_serializer_class(self):
        if self.action == 'list':
            return LeadListSerializer
        return LeadSerializer

    @action(detail=True, methods=['post'], url_path='move')
    def move(self, request, pk=None):
        """Mueve el lead a la siguiente etapa o a una específica ({stage, lost_reason?})."""
        lead = self.get_object()
        serializer = LeadStageSerializer(
            data=request.data,
            context={'lead': lead, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(LeadSerializer(updated, context={'request': request}).data)

    @action(detail=True, methods=['get', 'post'], url_path='activities')
    def activities(self, request, pk=None):
        """Lista o registra actividades (notas, llamadas, emails) del lead."""
        lead = self.get_object()
        if request.method == 'GET':
            qs = lead.activities.select_related('created_by')
            return Response(LeadActivitySerializer(qs, many=True).data)

        serializer = LeadActivitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        activity = serializer.save(lead=lead, created_by=request.user)
        # Llamadas, emails, whatsapp y reuniones cuentan como contacto
        if activity.activity_type in ('llamada', 'email', 'whatsapp', 'reunion'):
            lead.last_contact_at = timezone.now()
            lead.save(update_fields=['last_contact_at', 'updated_at'])
        return Response(LeadActivitySerializer(activity).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Resumen para el dashboard de ventas: embudo, valores y conversión."""
        qs = Lead.objects.all()
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        by_stage = {row['stage']: row for row in qs.values('stage').annotate(
            count=Count('id'), value=Sum('estimated_value'),
        )}
        funnel = [
            {
                'stage': key,
                'label': label,
                'count': by_stage.get(key, {}).get('count', 0),
                'value': float(by_stage.get(key, {}).get('value') or 0),
            }
            for key, label in STAGE_CHOICES
        ]

        total = qs.count()
        won = qs.filter(stage='ganado').count()
        lost = qs.filter(stage='perdido').count()
        closed = won + lost
        open_count = total - closed

        pipeline_value = qs.exclude(stage__in=['ganado', 'perdido']).aggregate(
            v=Sum('estimated_value'))['v'] or 0
        won_value = qs.filter(stage='ganado').aggregate(v=Sum('estimated_value'))['v'] or 0

        overdue = qs.exclude(stage__in=['ganado', 'perdido']).filter(
            next_followup__lt=now.date()).count()

        return Response({
            'total': total,
            'open': open_count,
            'won': won,
            'lost': lost,
            'new_this_month': qs.filter(created_at__gte=month_start).count(),
            'won_this_month': qs.filter(won_at__gte=month_start).count(),
            'conversion_rate': round(won / closed * 100, 1) if closed else 0,
            'pipeline_value': float(pipeline_value),
            'won_value': float(won_value),
            'overdue_followups': overdue,
            'funnel': funnel,
        })


class LeadActivityViewSet(viewsets.ModelViewSet):
    """CRUD directo de actividades (editar/eliminar una nota concreta)."""
    queryset = LeadActivity.objects.select_related('created_by', 'lead').order_by('-created_at')
    serializer_class = LeadActivitySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lead', 'activity_type']
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
