from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ContentGridViewSet, GridPostUpdateView,
    PostApproveView, PostCommentsView, PostHistoryView,
)

router = DefaultRouter()
router.register('', ContentGridViewSet, basename='grilla')

urlpatterns = router.urls + [
    path('posts/<int:pk>/',          GridPostUpdateView.as_view(), name='gridpost-update'),
    path('posts/<int:pk>/approve/',  PostApproveView.as_view(),    name='gridpost-approve'),
    path('posts/<int:pk>/comments/', PostCommentsView.as_view(),   name='gridpost-comments'),
    path('posts/<int:pk>/history/',  PostHistoryView.as_view(),    name='gridpost-history'),
]
