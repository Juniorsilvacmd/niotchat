from django.urls import re_path
from .consumers import ConversationConsumer, NotificationConsumer, DashboardConsumer, PainelConsumer, UserStatusConsumer
from .consumers_internal_chat import InternalChatConsumer
from .consumers_private_chat import PrivateChatConsumer

websocket_urlpatterns = [
    re_path(r'ws/conversations/(?P<conversation_id>\w+)/$', ConversationConsumer.as_asgi()),
    re_path(r'ws/notifications/(?P<user_id>\w+)/$', NotificationConsumer.as_asgi()),
    re_path(r'ws/conversas_dashboard/$', DashboardConsumer.as_asgi()),
    re_path(r'ws/painel/(?P<provedor_id>\w+)/$', PainelConsumer.as_asgi()),
    re_path(r'ws/user/(?P<user_id>\w+)/$', UserStatusConsumer.as_asgi()),
    re_path(r'ws/internal-chat/(?P<room_id>\w+)/$', InternalChatConsumer.as_asgi()),
    re_path(r'ws/private-chat/$', PrivateChatConsumer.as_asgi()),
]

