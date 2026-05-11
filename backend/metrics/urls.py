from rest_framework.routers import DefaultRouter
from .views import MetricDefinitionViewSet, MetricSnapshotViewSet

router = DefaultRouter()
router.register('definitions', MetricDefinitionViewSet)
router.register('snapshots', MetricSnapshotViewSet)

urlpatterns = router.urls
