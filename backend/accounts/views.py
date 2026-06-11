from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, BasePermission, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import UserProfile
from .serializers import (
    UserManagementSerializer, MeSerializer, MeUpdateSerializer,
    ChangePasswordSerializer,
)


# ── Permissions ───────────────────────────────────────────────────────────────

class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role == 'admin'
        except UserProfile.DoesNotExist:
            return request.user.is_superuser


# ── Throttle ──────────────────────────────────────────────────────────────────

class LoginThrottle(AnonRateThrottle):
    rate = '10/minute'
    scope = 'login'


# ── Cookie helpers ────────────────────────────────────────────────────────────

def _set_auth_cookies(response, access_token: str, refresh_token: str | None = None):
    secure = getattr(settings, 'JWT_COOKIE_SECURE', not settings.DEBUG)
    samesite = getattr(settings, 'JWT_COOKIE_SAMESITE', 'None' if not settings.DEBUG else 'Lax')

    response.set_cookie(
        settings.JWT_ACCESS_COOKIE,
        access_token,
        max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
        httponly=True,
        secure=secure,
        samesite=samesite,
        path='/',
    )
    if refresh_token:
        response.set_cookie(
            settings.JWT_REFRESH_COOKIE,
            refresh_token,
            max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            httponly=True,
            secure=secure,
            samesite=samesite,
            path='/',
        )


def _clear_auth_cookies(response):
    response.delete_cookie(settings.JWT_ACCESS_COOKIE, path='/')
    response.delete_cookie(settings.JWT_REFRESH_COOKIE, path='/')


# ── Auth views ────────────────────────────────────────────────────────────────

class CookieTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            _set_auth_cookies(response, response.data['access'], response.data['refresh'])
            # El refresh vive solo en cookie httpOnly; no exponerlo en el body.
            response.data.pop('refresh', None)
        return response


class RefreshThrottle(AnonRateThrottle):
    rate = '20/minute'
    scope = 'refresh'


class CookieTokenRefreshView(TokenRefreshView):
    throttle_classes = [RefreshThrottle]

    def post(self, request, *args, **kwargs):
        # Read refresh token from cookie if not in body
        if 'refresh' not in request.data:
            refresh_cookie = request.COOKIES.get(settings.JWT_REFRESH_COOKIE)
            if refresh_cookie:
                request.data._mutable = True
                request.data['refresh'] = refresh_cookie
                request.data._mutable = False
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            _set_auth_cookies(response, response.data['access'], response.data.get('refresh'))
            # El refresh rotado vive solo en cookie httpOnly; no exponerlo en el body.
            response.data.pop('refresh', None)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({'detail': 'Sesión cerrada.'})
        # Blacklist the refresh token if possible
        refresh_token = (
            request.data.get('refresh')
            or request.COOKIES.get(settings.JWT_REFRESH_COOKIE)
        )
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, Exception):
                pass
        _clear_auth_cookies(response)
        return response


# ── User views ────────────────────────────────────────────────────────────────

@api_view(['GET', 'PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def me_view(request):
    if request.method == 'GET':
        return Response(MeSerializer(request.user).data)

    # PATCH / PUT — user edits their own profile
    serializer = MeUpdateSerializer(
        instance=request.user,
        data=request.data,
        partial=request.method == 'PATCH',
        context={'request': request},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(MeSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response({'status': 'ok', 'detail': 'Contraseña actualizada.'})


class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('profile').order_by('id')
    serializer_class = UserManagementSerializer
    permission_classes = [IsAdminRole]

    @action(detail=True, methods=['post'], url_path='set-password')
    def set_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password', '')
        try:
            validate_password(password, user)
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save()
        return Response({'status': 'ok'})
