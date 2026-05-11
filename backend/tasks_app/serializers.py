from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = '__all__'

    def get_assignee_name(self, obj):
        return obj.assignee.get_full_name() if obj.assignee else None
