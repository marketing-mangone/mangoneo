from rest_framework import serializers
from .models import Task, CalendarEvent


class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = '__all__'

    def get_assignee_name(self, obj):
        return obj.assignee.get_full_name() if obj.assignee else None


class CalendarEventSerializer(serializers.ModelSerializer):
    assignee_name = serializers.SerializerMethodField()

    class Meta:
        model = CalendarEvent
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']

    def get_assignee_name(self, obj):
        return obj.assignee.get_full_name() or obj.assignee.username if obj.assignee else None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
