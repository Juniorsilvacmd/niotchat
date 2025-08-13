import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone


class ConversationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'conversation_{self.conversation_id}'

        print(f"🔌 WebSocket: Tentando conectar para conversa {self.conversation_id}")
        print(f"🔌 WebSocket: Room group name: {self.room_group_name}")

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        print(f"✅ WebSocket: Conectado com sucesso para conversa {self.conversation_id}")

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', 'message')
        
        if message_type == 'ping':
            # Respond to ping with pong
            await self.send(text_data=json.dumps({
                'type': 'pong',
                'timestamp': timezone.now().isoformat()
            }))
            return
        
        if message_type == 'message':
            message = text_data_json['message']
            sender = text_data_json.get('sender')
            
            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender': sender,
                    'timestamp': text_data_json.get('timestamp')
                }
            )
        elif message_type == 'typing':
            # Handle typing indicator
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'user': text_data_json.get('user'),
                    'is_typing': text_data_json.get('is_typing', False)
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        sender = event['sender']
        timestamp = event['timestamp']

        print(f"📨 WebSocket: Enviando mensagem para conversa {self.conversation_id}")
        print(f"📨 WebSocket: Mensagem: {message}")

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': message,
            'sender': sender,
            'timestamp': timestamp
        }))
        print(f"✅ WebSocket: Mensagem enviada com sucesso")

    # Handle typing indicator
    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user': event['user'],
            'is_typing': event['is_typing']
        }))


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_group_name = f'notifications_{self.user_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        notification_type = text_data_json.get('type', 'notification')
        
        # Send notification to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_notification',
                'notification': text_data_json
            }
        )

    # Send notification to WebSocket
    async def send_notification(self, event):
        notification = event['notification']

        await self.send(text_data=json.dumps(notification))


class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'conversas_dashboard'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Recebe evento do grupo e envia para o frontend
    async def dashboard_event(self, event):
        await self.send(text_data=json.dumps(event['data']))


class PainelConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.provedor_id = self.scope['url_route']['kwargs']['provedor_id']
        self.room_group_name = f'painel_{self.provedor_id}'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def uazapi_event(self, event):
        await self.send(text_data=json.dumps(event['event']))

    async def dashboard_event(self, event):
        await self.send(text_data=json.dumps(event['data']))


class UserStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_group_name = f'user_status_{self.user_id}'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        # Marcar usuário como online
        await self.set_user_online(True)

    async def disconnect(self, close_code):
        # Marcar usuário como offline
        await self.set_user_online(False)
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))

    @database_sync_to_async
    def set_user_online(self, is_online):
        User = get_user_model()
        try:
            user = User.objects.get(id=self.user_id)
            user.is_online = is_online
            user.save()
        except User.DoesNotExist:
            pass

