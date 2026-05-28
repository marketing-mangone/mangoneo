from rest_framework.routers import DefaultRouter
from .views import CustomerAvatarViewSet

router = DefaultRouter()
router.register(r'customer-avatars', CustomerAvatarViewSet, basename='customer-avatar')

urlpatterns = router.urls
