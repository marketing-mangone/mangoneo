from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import MetricDefinitionViewSet, MetricSnapshotViewSet, youtube_weekly

router = DefaultRouter()
router.register('definitions', MetricDefinitionViewSet)
router.register('snapshots', MetricSnapshotViewSet)

urlpatterns = router.urls + [
    path('youtube-weekly/', youtube_weekly, name='youtube-weekly'),
]
