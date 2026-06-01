from datetime import date, timedelta

from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.views import IsAdminRole

from .models import MetricDefinition, MetricSnapshot
from .serializers import MetricDefinitionSerializer, MetricSnapshotSerializer

WEEKLY_SLUGS = [
    'youtube-views',
    'youtube-watch-time',
    'youtube-net-subscribers',
    'youtube-likes',
    'youtube-comments',
    'youtube-shares',
]

GA4_SLUGS = [
    'ga4-sessions',
    'ga4-active-users',
    'ga4-new-users',
    'ga4-pageviews',
    'ga4-engagement-rate',
    'ga4-avg-session-duration',
    'ga4-conversions',
]


class MetricDefinitionViewSet(viewsets.ModelViewSet):
    queryset = MetricDefinition.objects.filter(is_active=True)
    serializer_class = MetricDefinitionSerializer
    search_fields = ['name', 'description']
    filterset_fields = ['category', 'source']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'series'):
            return [IsAuthenticated()]
        return [IsAdminRole()]

    def series(self, request, pk=None):
        from rest_framework.decorators import action
        metric = self.get_object()
        snaps = metric.snapshots.order_by('period_start')
        return Response(MetricSnapshotSerializer(snaps, many=True).data)


class MetricSnapshotViewSet(viewsets.ModelViewSet):
    queryset = MetricSnapshot.objects.all()
    serializer_class = MetricSnapshotSerializer
    filterset_fields = ['metric', 'period_type']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdminRole()]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def youtube_weekly(request):
    today = date.today()
    iso = today.isocalendar()
    default_week = f"{iso[0]}-W{iso[1]:02d}"
    week_str = request.GET.get('week', default_week)

    try:
        year, week = week_str.split('-W')
        monday = date.fromisocalendar(int(year), int(week), 1)
    except (ValueError, AttributeError):
        return Response({'error': 'Formato de semana inválido. Usa YYYY-WNN'}, status=400)

    sunday = monday + timedelta(days=6)
    yesterday = today - timedelta(days=1)
    period_end = min(sunday, yesterday)

    prev_monday = monday - timedelta(days=7)

    current_snaps = {
        s.metric.slug: float(s.value)
        for s in MetricSnapshot.objects.filter(
            metric__slug__in=WEEKLY_SLUGS,
            period_start=monday,
            period_type='weekly',
        ).select_related('metric')
    }

    prev_snaps = {
        s.metric.slug: float(s.value)
        for s in MetricSnapshot.objects.filter(
            metric__slug__in=WEEKLY_SLUGS,
            period_start=prev_monday,
            period_type='weekly',
        ).select_related('metric')
    }

    metrics = {}
    for slug in WEEKLY_SLUGS:
        current = current_snaps.get(slug)
        prev = prev_snaps.get(slug)
        change_pct = None
        if current is not None and prev is not None:
            if prev != 0:
                change_pct = round((current - prev) / abs(prev) * 100, 1)
            elif current > 0:
                change_pct = 100.0
        metrics[slug] = {
            'value': current,
            'prev_value': prev,
            'change_pct': change_pct,
        }

    return Response({
        'week': week_str,
        'period_start': monday.isoformat(),
        'period_end': period_end.isoformat(),
        'metrics': metrics,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ga4_summary(request):
    """
    Returns GA4 snapshots.
    Query params:
      - period: 'monthly' (default) | 'weekly'
      - week: 'YYYY-WNN' (required when period=weekly)
    """
    period_type = request.GET.get('period', 'monthly')

    if period_type == 'weekly':
        today = date.today()
        iso = today.isocalendar()
        default_week = f"{iso[0]}-W{iso[1]:02d}"
        week_str = request.GET.get('week', default_week)

        try:
            year, week = week_str.split('-W')
            monday = date.fromisocalendar(int(year), int(week), 1)
        except (ValueError, AttributeError):
            return Response({'error': 'Formato de semana inválido. Usa YYYY-WNN'}, status=400)

        sunday = monday + timedelta(days=6)
        period_end = min(sunday, today - timedelta(days=1))
        prev_monday = monday - timedelta(days=7)

        current_snaps = {
            s.metric.slug: s
            for s in MetricSnapshot.objects.filter(
                metric__slug__in=GA4_SLUGS,
                period_start=monday,
                period_type='weekly',
            ).select_related('metric')
        }
        prev_snaps = {
            s.metric.slug: float(s.value)
            for s in MetricSnapshot.objects.filter(
                metric__slug__in=GA4_SLUGS,
                period_start=prev_monday,
                period_type='weekly',
            ).select_related('metric')
        }

        metrics = {}
        for slug in GA4_SLUGS:
            snap = current_snaps.get(slug)
            current = float(snap.value) if snap else None
            prev = prev_snaps.get(slug)
            change_pct = None
            if current is not None and prev is not None:
                if prev != 0:
                    change_pct = round((current - prev) / abs(prev) * 100, 1)
                elif current > 0:
                    change_pct = 100.0
            metrics[slug] = {
                'value': current,
                'prev_value': prev,
                'change_pct': change_pct,
            }

        return Response({
            'period_type': 'weekly',
            'week': week_str,
            'period_start': monday.isoformat(),
            'period_end': period_end.isoformat(),
            'metrics': metrics,
        })

    else:
        # Monthly — most recent snapshot per metric
        metrics = {}
        for slug in GA4_SLUGS:
            snap = MetricSnapshot.objects.filter(
                metric__slug=slug,
                period_type='monthly',
            ).order_by('-period_start').first()

            prev_snap = MetricSnapshot.objects.filter(
                metric__slug=slug,
                period_type='monthly',
            ).order_by('-period_start')[1:2].first() if snap else None

            current = float(snap.value) if snap else None
            prev = float(prev_snap.value) if prev_snap else None
            change_pct = None
            if current is not None and prev is not None and prev != 0:
                change_pct = round((current - prev) / abs(prev) * 100, 1)

            metrics[slug] = {
                'value': current,
                'prev_value': prev,
                'change_pct': change_pct,
                'period_start': snap.period_start.isoformat() if snap else None,
                'period_end': snap.period_end.isoformat() if snap else None,
            }

        return Response({
            'period_type': 'monthly',
            'metrics': metrics,
        })
