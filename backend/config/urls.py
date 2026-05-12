from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


def health_check(request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('api/health/', health_check),
    path('admin/', admin.site.urls),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/accounts/', include('accounts.urls')),
    path('api/metrics/', include('metrics.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/team/', include('team.urls')),
    path('api/tasks/', include('tasks_app.urls')),
    path('api/calendar/', include('tasks_app.urls_calendar')),
    path('api/dashboard/', include('dashboard.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
