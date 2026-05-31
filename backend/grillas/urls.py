from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContentGridViewSet, GridPostUpdateView

router = DefaultRouter()
router.register('', ContentGridViewSet, basename='grilla')

urlpatterns = router.urls + [
    path('posts/<int:pk>/', GridPostUpdateView.as_view(), name='gridpost-update'),
]
