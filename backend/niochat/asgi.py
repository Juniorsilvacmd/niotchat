"""
ASGI config for nio chat project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
<<<<<<< HEAD
from django.urls import re_path
=======
from channels.auth import AuthMiddlewareStack
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
from conversations.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'niochat.settings')

<<<<<<< HEAD
# Debug: imprimir as rotas de WebSocket
print("WebSocket URL patterns:", websocket_urlpatterns)

# Teste simples: criar uma rota de WebSocket básica
from channels.generic.websocket import AsyncWebsocketConsumer

class TestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send(text_data="Conectado!")

# Adicionar rota de teste
test_patterns = [
    re_path(r'ws/test/$', TestConsumer.as_asgi()),
]

# Debug: imprimir todas as rotas
all_patterns = websocket_urlpatterns + test_patterns
print("All WebSocket patterns:", all_patterns)

# Teste: criar uma aplicação mais simples
from channels.testing import ApplicationCommunicator
from channels.testing import HttpCommunicator

# Criar uma aplicação de teste
test_application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(
        all_patterns
    ),
})

# Debug: imprimir a aplicação
print("Application type:", type(test_application))
print("Application:", test_application)

application = test_application

=======
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})

>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
