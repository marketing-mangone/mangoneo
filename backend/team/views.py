from rest_framework import viewsets, serializers
from accounts.models import UserProfile


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
            'phone', 'bio', 'avatar', 'skills', 'start_date', 'status',
        ]

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class TeamViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserProfile.objects.select_related('user').filter(status='active').order_by('id')
    serializer_class = TeamMemberSerializer
