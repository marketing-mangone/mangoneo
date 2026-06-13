from pathlib import Path
from datetime import timedelta
import dj_database_url
from decouple import config
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = config('DEBUG', default=False, cast=bool)

# En dev se permite un default inseguro; en producción DEBE venir por env var.
# Si esto revienta el arranque en Railway, define SECRET_KEY en las variables
# del servicio (genera una con `python -c "import secrets;print(secrets.token_urlsafe(64))"`).
_DEV_SECRET = 'dev-secret-key-change-in-production-immediately'
SECRET_KEY = config('SECRET_KEY', default=_DEV_SECRET)  # noqa: S105
if not DEBUG and SECRET_KEY == _DEV_SECRET:
    raise ImproperlyConfigured('SECRET_KEY debe definirse por variable de entorno en producción.')
_allowed = config('ALLOWED_HOSTS', default='')
ALLOWED_HOSTS = [h.strip() for h in _allowed.split(',') if h.strip()] or (['localhost', '127.0.0.1'] if DEBUG else [])

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'django_celery_beat',
    'accounts',
    'metrics',
    'documents',
    'team',
    'tasks_app',
    'dashboard',
    'competitors',
    'customer_avatars',
    'grillas',
    'blog',
    'ventas',
    'notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

WSGI_APPLICATION = 'config.wsgi.application'

# ── Base de datos ─────────────────────────────────────────────────────────────
# En producción Railway inyecta DATABASE_URL; en dev se usa SQLite.
_database_url = config('DATABASE_URL', default='')
if _database_url:
    DATABASES = {'default': dj_database_url.parse(_database_url, conn_max_age=600)}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

LANGUAGE_CODE = 'es-us'
TIME_ZONE = 'America/New_York'
USE_I18N = True
USE_TZ = True

# ── Archivos estáticos (WhiteNoise en producción) ─────────────────────────────
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Cloudflare R2 / S3 Storage ────────────────────────────────────────────────
# Cuando estas variables están en .env / Railway, los uploads van directo a R2.
AWS_ACCESS_KEY_ID       = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY   = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='marketing-hub-files')
AWS_S3_ENDPOINT_URL     = config('AWS_S3_ENDPOINT_URL', default='')

# Tamaño máximo de upload directo a Django: 50 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 52_428_800
FILE_UPLOAD_MAX_MEMORY_SIZE = 52_428_800

# ── REST Framework ────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.authentication.CookieJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '300/minute',
        'login': '10/minute',
        'refresh': '20/minute',
        'logout': '20/minute',
        'chat': '40/minute',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=3),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
}

# ── JWT Cookies ───────────────────────────────────────────────────────────────
JWT_ACCESS_COOKIE  = 'mh_access'
JWT_REFRESH_COOKIE = 'mh_refresh'
JWT_COOKIE_SECURE   = not DEBUG
JWT_COOKIE_SAMESITE = 'None' if not DEBUG else 'Lax'

# Defensa CSRF para auth por cookie (SameSite=None es necesario en el setup
# cross-origin vercel.app ↔ railway.app). Cuando está activo, las peticiones
# mutantes autenticadas por cookie deben incluir el header X-Requested-With,
# que un atacante cross-site no puede enviar sin disparar un preflight CORS
# bloqueado por la allowlist de orígenes. Se activa por env var en producción
# UNA VEZ que el frontend que envía el header ya esté desplegado (rollout sin
# downtime: front primero, luego ENFORCE_COOKIE_CSRF=True en Railway).
ENFORCE_COOKIE_CSRF = config('ENFORCE_COOKIE_CSRF', default=False, cast=bool)

# ── CORS ──────────────────────────────────────────────────────────────────────
# En producción agrega el dominio de Vercel en CORS_ALLOWED_ORIGINS (env var).
_cors_extra = config('CORS_ALLOWED_ORIGINS', default='')
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
] + [o.strip() for o in _cors_extra.split(',') if o.strip()]

CORS_ALLOW_CREDENTIALS = True

# ── Seguridad HTTP ─────────────────────────────────────────────────────────────
X_FRAME_OPTIONS                  = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF      = True
SECURE_BROWSER_XSS_FILTER        = True
SECURE_REFERRER_POLICY           = 'strict-origin-when-cross-origin'

if not DEBUG:
    SECURE_PROXY_SSL_HEADER          = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT              = True
    SECURE_HSTS_SECONDS              = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS   = True
    SECURE_HSTS_PRELOAD              = True
    SESSION_COOKIE_SECURE            = True
    CSRF_COOKIE_SECURE               = True

# ── Celery ────────────────────────────────────────────────────────────────────
REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# ── Groq API ─────────────────────────────────────────────────────────────────
GROQ_API_KEY = config('GROQ_API_KEY', default='')

# ── Ayrshare API (social media publishing) ───────────────────────────────────
AYRSHARE_API_KEY = config('AYRSHARE_API_KEY', default='')

# ── YouTube API ───────────────────────────────────────────────────────────────
YOUTUBE_CLIENT_ID     = config('YOUTUBE_CLIENT_ID', default='')
YOUTUBE_CLIENT_SECRET = config('YOUTUBE_CLIENT_SECRET', default='')
YOUTUBE_REFRESH_TOKEN = config('YOUTUBE_REFRESH_TOKEN', default='')
YOUTUBE_CHANNEL_ID    = config('YOUTUBE_CHANNEL_ID', default='')

# ── Google Analytics 4 ────────────────────────────────────────────────────────
GA4_CLIENT_ID      = config('GA4_CLIENT_ID', default='')
GA4_CLIENT_SECRET  = config('GA4_CLIENT_SECRET', default='')
GA4_REFRESH_TOKEN  = config('GA4_REFRESH_TOKEN', default='')
GA4_PROPERTY_ID    = config('GA4_PROPERTY_ID', default='')   # solo el número, ej: 123456789

# ── Meta Graph API (Facebook + Instagram + Ads) ───────────────────────────────
META_APP_ID               = config('META_APP_ID', default='')
META_APP_SECRET           = config('META_APP_SECRET', default='')
META_ACCESS_TOKEN         = config('META_ACCESS_TOKEN', default='')         # System User o Long-lived token
META_PAGE_ID              = config('META_PAGE_ID', default='')              # Facebook Page ID (numérico)
META_INSTAGRAM_ACCOUNT_ID = config('META_INSTAGRAM_ACCOUNT_ID', default='') # Instagram Business Account ID (numérico)
META_AD_ACCOUNT_ID        = config('META_AD_ACCOUNT_ID', default='')        # solo el número, sin 'act_'
