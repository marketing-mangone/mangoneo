from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ContentGridViewSet, GridPostUpdateView,
    PostApproveView, PostCommentsView, PostHistoryView, PostImproveView,
    PostScheduleView, PostPublishNowView, PostCancelScheduleView,
    PublishingQueueView,
)

router = DefaultRouter()
router.register('', ContentGridViewSet, basename='grilla')

urlpatterns = router.urls + [
    path('posts/<int:pk>/',                  GridPostUpdateView.as_view(),     name='gridpost-update'),
    path('posts/<int:pk>/approve/',          PostApproveView.as_view(),        name='gridpost-approve'),
    path('posts/<int:pk>/comments/',         PostCommentsView.as_view(),       name='gridpost-comments'),
    path('posts/<int:pk>/history/',          PostHistoryView.as_view(),        name='gridpost-history'),
    path('posts/<int:pk>/improve/',          PostImproveView.as_view(),        name='gridpost-improve'),
    path('posts/<int:pk>/schedule/',         PostScheduleView.as_view(),       name='gridpost-schedule'),
    path('posts/<int:pk>/publish-now/',      PostPublishNowView.as_view(),     name='gridpost-publish-now'),
    path('posts/<int:pk>/cancel-schedule/',  PostCancelScheduleView.as_view(), name='gridpost-cancel-schedule'),
    path('publishing/queue/',               PublishingQueueView.as_view(),    name='publishing-queue'),
]
