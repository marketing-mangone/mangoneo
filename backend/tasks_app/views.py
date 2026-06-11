from rest_framework import viewsets, filters
from core.permissions import TeamModuleAccess
from .models import Task, CalendarEvent
from .serializers import TaskSerializer, CalendarEventSerializer


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [TeamModuleAccess]
    filterset_fields = ['status', 'priority', 'assignee']
    search_fields = ['title', 'description', 'project']


class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.all()
    serializer_class = CalendarEventSerializer
    permission_classes = [TeamModuleAccess]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description']

    def get_queryset(self):
        qs = super().get_queryset()
        month = self.request.query_params.get('month')
        if month:
            qs = qs.filter(date__startswith=month)
        return qs
