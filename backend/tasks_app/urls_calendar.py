from rest_framework.routers import DefaultRouter
from .views import CalendarEventViewSet

router = DefaultRouter()
router.register('', CalendarEventViewSet, basename='calendar-event')

urlpatterns = router.urls
