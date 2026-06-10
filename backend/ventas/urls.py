from rest_framework.routers import DefaultRouter
from .views import LeadViewSet, LeadActivityViewSet

router = DefaultRouter()
router.register('leads', LeadViewSet, basename='lead')
router.register('actividades', LeadActivityViewSet, basename='lead-activity')

urlpatterns = router.urls
