from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CustomerAvatar
from .serializers import CustomerAvatarSerializer


class CustomerAvatarViewSet(viewsets.ModelViewSet):
    queryset = CustomerAvatar.objects.all()
    serializer_class = CustomerAvatarSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def set_primary(self, request, pk=None):
        avatar = self.get_object()
        # Quitar is_primary de todos los demás
        CustomerAvatar.objects.exclude(pk=avatar.pk).update(is_primary=False)
        # Marcar este como primario
        avatar.is_primary = True
        avatar.save(update_fields=['is_primary'])
        serializer = self.get_serializer(avatar)
        return Response(serializer.data, status=status.HTTP_200_OK)
