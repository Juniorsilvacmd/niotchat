from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContactViewSet, InboxViewSet, ConversationViewSet,
    MessageViewSet, TeamViewSet, TeamMemberViewSet,
    serve_media_file, test_media_access
)

router = DefaultRouter()
router.register(r'contacts', ContactViewSet)
router.register(r'inboxes', InboxViewSet)
router.register(r'conversations', ConversationViewSet)
router.register(r'messages', MessageViewSet)
router.register(r'teams', TeamViewSet)
router.register(r'team-members', TeamMemberViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # URLs específicas para recuperador de conversas
    path('recovery/stats/', ConversationViewSet.as_view({'get': 'recovery_stats'}), name='recovery-stats'),
    path('recovery/settings/<int:provedor_id>/', ConversationViewSet.as_view({'post': 'recovery_settings'}), name='recovery-settings'),
    # URL para servir arquivos de mídia
    path('media/messages/<int:conversation_id>/<str:filename>/', serve_media_file, name='serve-media-file'),
    # URL para testar acesso a mídia
    path('media/test/<int:conversation_id>/', test_media_access, name='test-media-access'),
]

