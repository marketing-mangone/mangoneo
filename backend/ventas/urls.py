from rest_framework.routers import DefaultRouter
from .views import LeadViewSet, LeadActivityViewSet, LeadTaskViewSet

router = DefaultRouter()
router.register('leads', LeadViewSet, basename='lead')
router.register('actividades', LeadActivityViewSet, basename='lead-activity')
router.register('tareas', LeadTaskViewSet, basename='lead-task')

urlpatterns = router.urls
