from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import UserProfile
from .serializers import UserManagementSerializer, MeSerializer


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role == 'admin'
        except UserProfile.DoesNotExist:
            return request.user.is_superuser


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(MeSerializer(request.user).data)


class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('profile').order_by('id')
    serializer_class = UserManagementSerializer
    permission_classes = [IsAdminRole]

    @action(detail=True, methods=['post'], url_path='set-password')
    def set_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password', '')
        if len(password) < 8:
            return Response(
                {'error': 'La contraseña debe tener al menos 8 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(password)
        user.save()
        return Response({'status': 'ok'})
