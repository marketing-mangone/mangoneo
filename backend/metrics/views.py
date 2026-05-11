from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import MetricDefinition, MetricSnapshot
from .serializers import MetricDefinitionSerializer, MetricSnapshotSerializer

class MetricDefinitionViewSet(viewsets.ModelViewSet):
    queryset = MetricDefinition.objects.filter(is_active=True)
    serializer_class = MetricDefinitionSerializer
    search_fields = ['name', 'description']
    filterset_fields = ['category', 'source']

    @action(detail=True, methods=['get'])
    def series(self, request, pk=None):
        metric = self.get_object()
        snaps = metric.snapshots.order_by('period_start')
        return Response(MetricSnapshotSerializer(snaps, many=True).data)

class MetricSnapshotViewSet(viewsets.ModelViewSet):
    queryset = MetricSnapshot.objects.all()
    serializer_class = MetricSnapshotSerializer
    filterset_fields = ['metric', 'period_type']
