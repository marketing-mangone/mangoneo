from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    size_display     = serializers.ReadOnlyField()
    storage_backend  = serializers.ReadOnlyField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'description', 'category', 'status', 'visibility',
            'version', 'file_name', 'file_type', 'file_size', 'size_display',
            'content_type', 'object_key', 'storage_backend',
            'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'uploaded_by']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['uploaded_by'] = request.user
        return super().create(validated_data)


class UploadURLSerializer(serializers.Serializer):
    file_name    = serializers.CharField(max_length=255)
    content_type = serializers.CharField(max_length=100)
    file_size    = serializers.IntegerField(min_value=1)
