from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.models import UserProfile
from core.permissions import IsAdminRole


class TeamMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user_id', 'username', 'name', 'email',
            'role', 'position', 'department', 'area',
            'phone', 'bio', 'avatar', 'skills',
            'start_date', 'status', 'reports_to_id',
        ]

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class TeamViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserProfile.objects.select_related('user').filter(status='active').order_by('id')
    serializer_class = TeamMemberSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['patch'], url_path='hierarchy',
            permission_classes=[IsAdminRole])
    def update_hierarchy(self, request, pk=None):
        profile = self.get_object()
        # 'reports_to' key; explicit null clears the relationship
        key = 'reports_to'
        if key in request.data:
            val = request.data[key]
            profile.reports_to_id = val  # None or int PK
            profile.save(update_fields=['reports_to'])
        return Response(TeamMemberSerializer(profile).data)
