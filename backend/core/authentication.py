from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class CookieJWTAuthentication(JWTAuthentication):
    """
    Reads the JWT access token from an httpOnly cookie first.
    Falls back to the Authorization header (for dev / backward compat).
    """
    def authenticate(self, request):
        cookie_name = getattr(settings, 'JWT_ACCESS_COOKIE', 'access_token')
        raw = request.COOKIES.get(cookie_name)
        if raw:
            try:
                validated = self.get_validated_token(raw.encode())
                return self.get_user(validated), validated
            except InvalidToken:
                pass  # expired or invalid — fall through to header
        return super().authenticate(request)
