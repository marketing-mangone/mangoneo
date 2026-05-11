from rest_framework import viewsets
from rest_framework.serializers import ModelSerializer
from accounts.models import UserProfile

class UserProfileSerializer(ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'
        depth = 1

class TeamViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserProfile.objects.filter(status='active')
    serializer_class = UserProfileSerializer
