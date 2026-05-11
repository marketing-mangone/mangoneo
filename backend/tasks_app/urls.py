from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, CalendarEventViewSet

router = DefaultRouter()
router.register('', TaskViewSet)

calendar_router = DefaultRouter()
calendar_router.register('', CalendarEventViewSet, basename='calendar-event')

urlpatterns = router.urls
