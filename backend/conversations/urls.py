from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContactViewSet, InboxViewSet, ConversationViewSet,
    MessageViewSet, TeamViewSet, TeamMemberViewSet,
    serve_media_file, DashboardStatsView, ConversationAnalysisView
)
from .views_internal_chat import (
    InternalChatRoomViewSet,
    InternalChatMessageViewSet,
    InternalChatParticipantViewSet
)
from .views_private_chat import (
    PrivateMessageViewSet,
    PrivateUnreadCountsView,
    UsersListView
)


router = DefaultRouter()
router.register(r'contacts', ContactViewSet)
router.register(r'inboxes', InboxViewSet)
router.register(r'conversations', ConversationViewSet)
router.register(r'messages', MessageViewSet)
router.register(r'teams', TeamViewSet)
router.register(r'team-members', TeamMemberViewSet)

# Chat interno
router.register(r'internal-chat/rooms', InternalChatRoomViewSet, basename='internal-chat-rooms')
router.register(r'internal-chat/messages', InternalChatMessageViewSet, basename='internal-chat-messages')
router.register(r'internal-chat/participants', InternalChatParticipantViewSet, basename='internal-chat-participants')

# Chat privado
router.register(r'private-messages', PrivateMessageViewSet, basename='private-messages')

urlpatterns = [
    path('', include(router.urls)),
    # URLs específicas para recuperador de conversas
    path('recovery/stats/', ConversationViewSet.as_view({'get': 'recovery_stats'}), name='recovery-stats'),
    path('recovery/settings/<int:provedor_id>/', ConversationViewSet.as_view({'post': 'recovery_settings'}), name='recovery-settings'),
    # URL para servir arquivos de mídia
    path('media/messages/<int:conversation_id>/<str:filename>/', serve_media_file, name='serve-media-file'),
    
    # APIs específicas
    path('private-unread-counts/', PrivateUnreadCountsView.as_view(), name='private-unread-counts'),
    path('users-list/', UsersListView.as_view(), name='users-list'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('analysis/', ConversationAnalysisView.as_view(), name='conversation-analysis'),
    path('test-analysis/', ConversationAnalysisView.as_view(), name='test-analysis'),
]

