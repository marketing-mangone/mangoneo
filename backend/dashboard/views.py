from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from metrics.models import MetricDefinition, MetricSnapshot
from tasks_app.models import Task

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def summary(request):
    tasks_active = Task.objects.exclude(status='done').count()
    tasks_done = Task.objects.filter(status='done').count()
    return Response({
        'tasks_active': tasks_active,
        'tasks_done': tasks_done,
        'metrics_count': MetricDefinition.objects.filter(is_active=True).count(),
    })
