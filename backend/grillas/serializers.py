from rest_framework import serializers
from .models import ContentGrid, GridPost, GridPostComment, GridPostVersion


class GridPostCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GridPostComment
        fields = ['id', 'author_name', 'text', 'created_at']
        read_only_fields = ['id', 'author_name', 'created_at']


class GridPostVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GridPostVersion
        fields = ['id', 'caption', 'changed_by_name', 'created_at']
        read_only_fields = ['id', 'changed_by_name', 'created_at']


class GridPostSerializer(serializers.ModelSerializer):
    comments = GridPostCommentSerializer(many=True, read_only=True)
    versions = GridPostVersionSerializer(many=True, read_only=True)
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GridPost
        fields = '__all__'
        read_only_fields = [
            'id', 'grid', 'day_of_week', 'slot',
            'created_at', 'updated_at',
            'approved_by', 'approved_at', 'approved_by_name',
            'comments', 'versions',
        ]

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return None


class ContentGridSerializer(serializers.ModelSerializer):
    posts = GridPostSerializer(many=True, read_only=True)
    tema_display = serializers.CharField(source='get_tema_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ContentGrid
        fields = [
            'id', 'week_start', 'tema', 'tema_display',
            'status', 'status_display',
            'created_by', 'created_by_name',
            'created_at', 'updated_at', 'posts',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class ContentGridListSerializer(serializers.ModelSerializer):
    tema_display = serializers.CharField(source='get_tema_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    post_count = serializers.SerializerMethodField()
    approved_count = serializers.SerializerMethodField()

    class Meta:
        model = ContentGrid
        fields = [
            'id', 'week_start', 'tema', 'tema_display',
            'status', 'status_display',
            'created_at', 'post_count', 'approved_count',
        ]

    def get_post_count(self, obj):
        return obj.posts.count()

    def get_approved_count(self, obj):
        return obj.posts.filter(approved=True).count()
