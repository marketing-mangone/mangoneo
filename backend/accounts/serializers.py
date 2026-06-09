from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import UserProfile


def _ensure_profile(user) -> UserProfile:
    """Return the user's profile, creating a default one if missing."""
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


class MeSerializer(serializers.ModelSerializer):
    """Rich representation of the authenticated user for the profile page."""
    name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    position = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    area = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()
    start_date = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    reports_to_name = serializers.SerializerMethodField()
    date_joined = serializers.DateTimeField(read_only=True)
    last_login = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'name',
            'role', 'avatar', 'position', 'department', 'area', 'phone',
            'bio', 'skills', 'start_date', 'status', 'reports_to_name',
            'date_joined', 'last_login',
        ]

    def _profile(self, obj):
        try:
            return obj.profile
        except UserProfile.DoesNotExist:
            return None

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_role(self, obj):
        p = self._profile(obj)
        if p:
            return p.role
        return 'admin' if obj.is_superuser else 'viewer'

    def get_avatar(self, obj):
        p = self._profile(obj)
        return p.avatar if p else ''

    def get_position(self, obj):
        p = self._profile(obj)
        return p.position if p else ''

    def get_department(self, obj):
        p = self._profile(obj)
        return p.department if p else ''

    def get_area(self, obj):
        p = self._profile(obj)
        return p.area if p else ''

    def get_phone(self, obj):
        p = self._profile(obj)
        return p.phone if p else ''

    def get_bio(self, obj):
        p = self._profile(obj)
        return p.bio if p else ''

    def get_skills(self, obj):
        p = self._profile(obj)
        return p.skills if p else []

    def get_start_date(self, obj):
        p = self._profile(obj)
        return p.start_date if p else None

    def get_status(self, obj):
        p = self._profile(obj)
        return p.status if p else 'active'

    def get_reports_to_name(self, obj):
        p = self._profile(obj)
        if p and p.reports_to:
            return p.reports_to.user.get_full_name() or p.reports_to.user.username
        return None


class MeUpdateSerializer(serializers.Serializer):
    """Lets a user edit their OWN profile. Role/status/hierarchy are NOT editable here."""
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    position = serializers.CharField(required=False, allow_blank=True, max_length=100)
    department = serializers.CharField(required=False, allow_blank=True, max_length=100)
    area = serializers.CharField(required=False, allow_blank=True, max_length=100)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=30)
    bio = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.CharField(required=False, allow_blank=True, max_length=10)
    skills = serializers.ListField(
        child=serializers.CharField(max_length=50), required=False
    )

    USER_FIELDS = {'first_name', 'last_name', 'email'}

    def validate_email(self, value):
        if value and User.objects.exclude(pk=self.instance.pk).filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con este correo.')
        return value

    def update(self, instance, validated_data):
        profile = _ensure_profile(instance)
        for field, value in validated_data.items():
            if field in self.USER_FIELDS:
                setattr(instance, field, value)
            else:
                setattr(profile, field, value)
        instance.save()
        profile.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('La contraseña actual es incorrecta.')
        return value

    def validate_new_password(self, value):
        validate_password(value, self.context['request'].user)
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class UserProfileInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        exclude = ['id', 'user', 'created_at']
        # reports_to accepts a profile PK (int) or null
        extra_kwargs = {'reports_to': {'required': False}}


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
