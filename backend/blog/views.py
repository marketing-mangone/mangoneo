from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import BlogPost
from .serializers import BlogPostSerializer, BlogPostStageSerializer


class BlogPostViewSet(viewsets.ModelViewSet):
    queryset = BlogPost.objects.select_related(
        'assigned_to', 'reviewed_by', 'created_by'
    ).order_by('-created_at')
    serializer_class = BlogPostSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['stage', 'practice_area', 'priority', 'assigned_to']
    ordering_fields = ['created_at', 'updated_at', 'due_date']

    @action(detail=True, methods=['post'], url_path='advance')
    def advance(self, request, pk=None):
        """Move the post to the next workflow stage (or a specific one if body contains {stage})."""
        post = self.get_object()
        serializer = BlogPostStageSerializer(
            data=request.data,
            context={'post': post, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(BlogPostSerializer(updated, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='back')
    def back(self, request, pk=None):
        """Move the post to the previous stage (admin only)."""
        from .models import STAGE_ORDER
        from accounts.models import UserProfile
        try:
            is_admin = request.user.profile.role == 'admin'
        except UserProfile.DoesNotExist:
            is_admin = request.user.is_superuser
        if not is_admin:
            return Response({'detail': 'Solo admin puede retroceder etapas.'}, status=status.HTTP_403_FORBIDDEN)
        post = self.get_object()
        idx = STAGE_ORDER.index(post.stage)
        if idx == 0:
            return Response({'detail': 'El post ya está en la primera etapa.'}, status=status.HTTP_400_BAD_REQUEST)
        post.stage = STAGE_ORDER[idx - 1]
        if post.stage != 'publicado':
            post.published_at = None
        post.save()
        return Response(BlogPostSerializer(post, context={'request': request}).data)
