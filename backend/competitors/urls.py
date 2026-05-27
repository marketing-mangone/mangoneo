from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'competitors', views.CompetitorViewSet)
router.register(r'scores', views.CompetitorScoreViewSet)
router.register(r'ads', views.AdObservationViewSet)
router.register(r'insights', views.CompetitorInsightViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
