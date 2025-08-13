from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TelegramIntegrationViewSet, EmailIntegrationViewSet,
    WhatsAppIntegrationViewSet, WebchatIntegrationViewSet,
    # evolution_webhook  # Desabilitado para evitar duplicação
)

router = DefaultRouter()
router.register(r'telegram', TelegramIntegrationViewSet)
router.register(r'email', EmailIntegrationViewSet)
router.register(r'whatsapp', WhatsAppIntegrationViewSet)
router.register(r'webchat', WebchatIntegrationViewSet)

urlpatterns = [
    path('integrations/', include(router.urls)),
    # path('webhook/evolution/', evolution_webhook, name='evolution_webhook'),  # Desabilitado para evitar duplicação
]

