from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile


class MeSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    position = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'role', 'avatar', 'position']

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_role(self, obj):
        try:
            return obj.profile.role
        except UserProfile.DoesNotExist:
            return 'admin' if obj.is_superuser else 'viewer'

    def get_avatar(self, obj):
        try:
            return obj.profile.avatar
        except UserProfile.DoesNotExist:
            return ''

    def get_position(self, obj):
        try:
            return obj.profile.position
        except UserProfile.DoesNotExist:
            return ''


class UserProfileInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        exclude = ['id', 'user', 'created_at']


class UserManagementSerializer(serializers.ModelSerializer):
    profile = UserProfileInlineSerializer(required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'name', 'is_active', 'password', 'profile',
        ]

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'La contraseña es requerida al crear un usuario.'})
        return attrs

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        UserProfile.objects.create(user=user, **profile_data)
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
        instance.save()
        try:
            profile = instance.profile
            for attr, val in profile_data.items():
                setattr(profile, attr, val)
            profile.save()
        except UserProfile.DoesNotExist:
            UserProfile.objects.create(user=instance, **profile_data)
        return instance
