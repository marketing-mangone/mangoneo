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

    youtube_slugs = ['youtube-views', 'youtube-watch-time', 'youtube-net-subscribers', 'youtube-unique-viewers']
    youtube_data = {}
    for slug in youtube_slugs:
        snap = (
            MetricSnapshot.objects
            .filter(metric__slug=slug, metric__is_active=True)
            .order_by('-period_start')
            .first()
        )
        youtube_data[slug] = {
            'value': float(snap.value) if snap else None,
            'period_start': snap.period_start.isoformat() if snap else None,
            'period_end': snap.period_end.isoformat() if snap else None,
        }

    return Response({
        'tasks_active': tasks_active,
        'tasks_done': tasks_done,
        'metrics_count': MetricDefinition.objects.filter(is_active=True).count(),
        'youtube': youtube_data,
    })
