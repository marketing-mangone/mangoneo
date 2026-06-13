import csv

from django.db.models import Count, Sum, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from core.permissions import SalesAccess
from .models import Lead, LeadActivity, LeadTask, STAGE_CHOICES
from .importer import parse_and_import
from .serializers import (
    LeadSerializer, LeadListSerializer, LeadActivitySerializer, LeadStageSerializer,
    LeadTaskSerializer,
)

STAGE_KEYS = [s[0] for s in STAGE_CHOICES]


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related('assigned_to', 'created_by').order_by('-created_at')
    serializer_class = LeadSerializer
    permission_classes = [SalesAccess]
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

    @action(
        detail=False, methods=['post'], url_path='import',
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def import_csv(self, request):
        """
        Importa leads desde un CSV.
        Acepta un archivo en 'file' (multipart) o texto crudo en 'csv_text' (JSON).
        Devuelve resumen: {created, skipped, errors[], total_rows}.
        """
        upload = request.FILES.get('file')
        if upload is not None:
            raw = upload.read()
        else:
            raw = request.data.get('csv_text')
            if not raw:
                return Response(
                    {'detail': "Envía un archivo en 'file' o el contenido en 'csv_text'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        skip_dupes = str(request.data.get('skip_duplicates', 'true')).lower() != 'false'
        result = parse_and_import(raw, request.user, skip_duplicates=skip_dupes)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk(self, request):
        """
        Acciones masivas sobre varios leads.
        Body: {ids:[int], action:'stage'|'assign'|'delete', value: any}
        """
        ids = request.data.get('ids') or []
        action_type = request.data.get('action')
        value = request.data.get('value')
        if not ids or not isinstance(ids, list):
            return Response({'detail': 'Envía una lista de ids.'}, status=status.HTTP_400_BAD_REQUEST)

        qs = Lead.objects.filter(id__in=ids)

        if action_type == 'delete':
            count = qs.count()
            qs.delete()
            return Response({'deleted': count})

        if action_type == 'assign':
            # value = user id, o null para desasignar
            count = qs.count()
            qs.update(assigned_to_id=value or None, updated_at=timezone.now())
            # Notificar al nuevo responsable (si no es quien ejecuta la acción)
            if value and int(value) != request.user.id:
                from django.contrib.auth.models import User
                from notifications.services import notify
                target = User.objects.filter(id=value).first()
                notify(
                    target, 'lead_assigned',
                    title=f'Se te asignaron {count} lead(s)',
                    message='Revisa tu pipeline de ventas.',
                    link='/ventas/leads',
                )
            return Response({'updated': count})

        if action_type == 'stage':
            if value not in STAGE_KEYS:
                return Response({'detail': f'Etapa inválida: {value}'}, status=status.HTTP_400_BAD_REQUEST)
            now = timezone.now()
            updated = 0
            for lead in qs:
                previous = lead.get_stage_display()
                lead.stage = value
                if value == 'ganado' and not lead.won_at:
                    lead.won_at = now
                elif value != 'ganado':
                    lead.won_at = None
                if value != 'perdido':
                    lead.lost_reason = ''
                lead.save()
                LeadActivity.objects.create(
                    lead=lead, activity_type='etapa',
                    description=f"Etapa: {previous} → {lead.get_stage_display()} (acción masiva)",
                    created_by=request.user,
                )
                updated += 1
            return Response({'updated': updated})

        return Response({'detail': "action debe ser 'stage', 'assign' o 'delete'."},
                        status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        """Exporta los leads (respetando filtros/búsqueda actuales) a CSV."""
        qs = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="leads-mangone.csv"'
        response.write('﻿')  # BOM para Excel
        writer = csv.writer(response)
        writer.writerow([
            'name', 'email', 'phone', 'language', 'location', 'source', 'campaign',
            'practice_area', 'stage', 'priority', 'estimated_value', 'next_followup', 'notes',
        ])
        for l in qs:
            writer.writerow([
                l.name, l.email, l.phone, l.language, l.location, l.source, l.campaign,
                l.practice_area, l.stage, l.priority,
                l.estimated_value if l.estimated_value is not None else '',
                l.next_followup.isoformat() if l.next_followup else '',
                l.notes.replace('\n', ' ') if l.notes else '',
            ])
        return response

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


class LeadTaskViewSet(viewsets.ModelViewSet):
    """Tareas/recordatorios del CRM. Filtra por lead, responsable o estado."""
    queryset = LeadTask.objects.select_related('lead', 'assigned_to', 'created_by')
    serializer_class = LeadTaskSerializer
    permission_classes = [SalesAccess]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['lead', 'assigned_to', 'status', 'task_type', 'priority']
    ordering_fields = ['due_date', 'created_at', 'priority']

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        """Marca la tarea como completada (o la reabre con {reopen: true})."""
        task = self.get_object()
        if request.data.get('reopen'):
            task.status = 'pendiente'
            task.completed_at = None
        else:
            task.status = 'completada'
            task.completed_at = timezone.now()
        task.save(update_fields=['status', 'completed_at', 'updated_at'])
        return Response(LeadTaskSerializer(task).data)


class LeadActivityViewSet(viewsets.ModelViewSet):
    """CRUD directo de actividades (editar/eliminar una nota concreta)."""
    queryset = LeadActivity.objects.select_related('created_by', 'lead').order_by('-created_at')
    serializer_class = LeadActivitySerializer
    permission_classes = [SalesAccess]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lead', 'activity_type']
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
