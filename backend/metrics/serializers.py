from rest_framework import serializers
from .models import MetricDefinition, MetricSnapshot

class MetricSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetricSnapshot
        fields = '__all__'

class MetricDefinitionSerializer(serializers.ModelSerializer):
    latest_value = serializers.SerializerMethodField()
    previous_value = serializers.SerializerMethodField()
    trend = serializers.SerializerMethodField()

    class Meta:
        model = MetricDefinition
        fields = '__all__'

    def get_latest_value(self, obj):
        snap = obj.snapshots.first()
        return float(snap.value) if snap else None

    def get_previous_value(self, obj):
        snaps = list(obj.snapshots.all()[:2])
        return float(snaps[1].value) if len(snaps) > 1 else None

    def get_trend(self, obj):
        snaps = list(obj.snapshots.all()[:2])
        if len(snaps) < 2:
            return 'stable'
        diff = float(snaps[0].value) - float(snaps[1].value)
        if diff > 0:
            return 'up'
        elif diff < 0:
            return 'down'
        return 'stable'
