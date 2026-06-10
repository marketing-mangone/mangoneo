from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework.exceptions import PermissionDenied

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS', 'TRACE')


class CookieJWTAuthentication(JWTAuthentication):
    """
    Reads the JWT access token from an httpOnly cookie first.
    Falls back to the Authorization header (for dev / backward compat).

    CSRF: when ENFORCE_COOKIE_CSRF is on, mutating requests authenticated via
    the cookie must carry the X-Requested-With header. A cross-site attacker
    cannot set that header without a CORS preflight, which the strict origin
    allowlist rejects — neutralizing CSRF while keeping SameSite=None for the
    cross-origin (vercel.app ↔ railway.app) deployment. Requests authenticated
    via the Authorization header are exempt (an attacker can't set it either).
    """
    def authenticate(self, request):
        cookie_name = getattr(settings, 'JWT_ACCESS_COOKIE', 'access_token')
        raw = request.COOKIES.get(cookie_name)
        if raw:
            try:
                validated = self.get_validated_token(raw.encode())
            except InvalidToken:
                return super().authenticate(request)  # fall through to header
            if (getattr(settings, 'ENFORCE_COOKIE_CSRF', False)
                    and request.method not in SAFE_METHODS
                    and not request.META.get('HTTP_X_REQUESTED_WITH')):
                raise PermissionDenied('CSRF: falta el header X-Requested-With.')
            return self.get_user(validated), validated
        return super().authenticate(request)
