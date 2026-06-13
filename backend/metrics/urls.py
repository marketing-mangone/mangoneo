from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import MetricDefinitionViewSet, MetricSnapshotViewSet, youtube_weekly, ga4_summary, meta_summary

router = DefaultRouter()
router.register('definitions', MetricDefinitionViewSet)
router.register('snapshots', MetricSnapshotViewSet)

urlpatterns = router.urls + [
    path('youtube-weekly/', youtube_weekly,  name='youtube-weekly'),
    path('ga4-summary/',    ga4_summary,     name='ga4-summary'),
    path('meta-summary/',   meta_summary,    name='meta-summary'),
]
