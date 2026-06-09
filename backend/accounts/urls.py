from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import UserManagementViewSet, me_view, change_password_view

router = DefaultRouter()
router.register('users', UserManagementViewSet, basename='user')

urlpatterns = [
    path('me/', me_view, name='me'),
    path('me/change-password/', change_password_view, name='me-change-password'),
    *router.urls,
]
