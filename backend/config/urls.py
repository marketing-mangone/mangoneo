from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

from accounts.views import CookieTokenObtainPairView, CookieTokenRefreshView, LogoutView


def health_check(request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('api/health/', health_check),
    # Admin URL obfuscado — no usar /admin/ en producción
    path('mng-hub-admin-2026/', admin.site.urls),
    # Auth — cookie-based (principal)
    path('api/auth/login/',   CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', CookieTokenRefreshView.as_view(),    name='token_refresh'),
    path('api/auth/logout/',  LogoutView.as_view(),                name='token_logout'),
    # API
    path('api/accounts/', include('accounts.urls')),
    path('api/metrics/',  include('metrics.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/team/',     include('team.urls')),
    path('api/tasks/',    include('tasks_app.urls')),
    path('api/calendar/', include('tasks_app.urls_calendar')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/competitors/', include('competitors.urls')),
    path('api/avatars/', include('customer_avatars.urls')),
    path('api/grillas/', include('grillas.urls')),
    path('api/blog/', include('blog.urls')),
    path('api/ventas/', include('ventas.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
