from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from metrics.models import MetricDefinition, MetricSnapshot
from tasks_app.models import Task

YOUTUBE_MONTHLY_SLUGS = [
    'youtube-views',
    'youtube-watch-time',
    'youtube-net-subscribers',
    'youtube-likes',
    'youtube-comments',
    'youtube-shares',
]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def summary(request):
    tasks_active = Task.objects.exclude(status='done').count()
    tasks_done = Task.objects.filter(status='done').count()

    youtube_data = {}

    for slug in YOUTUBE_MONTHLY_SLUGS:
        snap = (
            MetricSnapshot.objects
            .filter(metric__slug=slug, metric__is_active=True, period_type='monthly')
            .order_by('-period_start')
            .first()
        )
        youtube_data[slug] = {
            'value': float(snap.value) if snap else None,
            'period_start': snap.period_start.isoformat() if snap else None,
            'period_end': snap.period_end.isoformat() if snap else None,
        }

    # Subscriber total — latest daily snapshot
    sub_snap = (
        MetricSnapshot.objects
        .filter(metric__slug='youtube-subscribers-total', metric__is_active=True)
        .order_by('-period_start')
        .first()
    )
    youtube_data['youtube-subscribers-total'] = {
        'value': float(sub_snap.value) if sub_snap else None,
        'period_start': sub_snap.period_start.isoformat() if sub_snap else None,
        'period_end': sub_snap.period_end.isoformat() if sub_snap else None,
    }

    return Response({
        'tasks_active': tasks_active,
        'tasks_done': tasks_done,
        'metrics_count': MetricDefinition.objects.filter(is_active=True).count(),
        'youtube': youtube_data,
    })
