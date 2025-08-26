import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class InternalChatConsumer(AsyncWebsocketConsumer):
    """
    Consumer WebSocket para chat interno
    """
    
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'internal_chat_{self.room_id}'
        self.user = self.scope['user']
        
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Verificar se o usuário pode acessar esta sala
        can_access = await self.can_access_room()
        if not can_access:
            await self.close()
            return
        
        # Entrar no grupo da sala
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Atualizar status online do usuário
        await self.update_user_status(online=True)
        
        # Notificar outros usuários que este usuário entrou online
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_status_changed',
                'user_id': self.user.id,
                'status': 'online'
            }
        )
    
    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            # Sair do grupo da sala
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            # Atualizar status offline do usuário
            await self.update_user_status(online=False)
            
            # Notificar outros usuários que este usuário saiu
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_status_changed',
                    'user_id': self.user.id,
                    'status': 'offline'
                }
            )
    
    async def receive(self, text_data):
        """
        Receber mensagens do WebSocket
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'typing_start':
                await self.handle_typing_start()
            elif message_type == 'typing_stop':
                await self.handle_typing_stop()
            elif message_type == 'send_message':
                await self.handle_send_message(data)
            elif message_type == 'mark_read':
                await self.handle_mark_read(data)
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Formato JSON inválido'
            }))
    
    async def handle_typing_start(self):
        """
        Usuário começou a digitar
        """
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_notification',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_typing': True
            }
        )
    
    async def handle_typing_stop(self):
        """
        Usuário parou de digitar
        """
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_notification',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_typing': False
            }
        )
    
    async def handle_send_message(self, data):
        """
        Enviar nova mensagem (processado via API REST, apenas notificação)
        """
        # A criação da mensagem é feita via API REST
        # Aqui apenas validamos se o usuário pode enviar
        can_send = await self.can_send_message()
        if not can_send:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Você não tem permissão para enviar mensagens nesta sala'
            }))
    
    async def handle_mark_read(self, data):
        """
        Marcar mensagem como lida
        """
        message_id = data.get('message_id')
        if message_id:
            await self.mark_message_read(message_id)
    
    # Handlers para eventos recebidos do grupo
    
    async def new_message(self, event):
        """
        Nova mensagem na sala
        """
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': event['message']
        }))
    
    async def message_read(self, event):
        """
        Mensagem foi lida por alguém
        """
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_id': event['message_id'],
            'user_id': event['user_id']
        }))
    
    async def reaction_added(self, event):
        """
        Reação adicionada a uma mensagem
        """
        await self.send(text_data=json.dumps({
            'type': 'reaction_added',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'emoji': event['emoji']
        }))
    
    async def reaction_removed(self, event):
        """
        Reação removida de uma mensagem
        """
        await self.send(text_data=json.dumps({
            'type': 'reaction_removed',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'emoji': event['emoji']
        }))
    
    async def typing_notification(self, event):
        """
        Notificação de digitação
        """
        # Não enviar para o próprio usuário
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing_notification',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))
    
    async def user_status_changed(self, event):
        """
        Status online/offline de usuário mudou
        """
        # Não enviar para o próprio usuário
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_status_changed',
                'user_id': event['user_id'],
                'status': event['status']
            }))
    
    async def room_event(self, event):
        """
        Eventos da sala (usuário entrou/saiu)
        """
        await self.send(text_data=json.dumps({
            'type': 'room_event',
            'event_type': event['event_type'],
            'data': event['data']
        }))
    
    # Métodos auxiliares de banco de dados
    
    @database_sync_to_async
    def can_access_room(self):
        """
        Verificar se o usuário pode acessar esta sala
        """
        from .models import InternalChatRoom
        try:
            room = InternalChatRoom.objects.get(id=self.room_id)
            # Verificar se o usuário é do mesmo provedor e participa da sala
            user_provedor = getattr(self.user, 'provedor', None) or self.user.provedores_admin.first()
            
            return (
                room.provedor == user_provedor and
                room.participants.filter(user=self.user, is_active=True).exists()
            )
        except InternalChatRoom.DoesNotExist:
            return False
    
    @database_sync_to_async
    def can_send_message(self):
        """
        Verificar se o usuário pode enviar mensagens
        """
        from .models import InternalChatParticipant
        try:
            return InternalChatParticipant.objects.filter(
                room_id=self.room_id,
                user=self.user,
                is_active=True
            ).exists()
        except:
            return False
    
    @database_sync_to_async
    def update_user_status(self, online=True):
        """
        Atualizar status online do usuário
        """
        from django.utils import timezone
        from .models import InternalChatParticipant
        try:
            participant = InternalChatParticipant.objects.get(
                room_id=self.room_id,
                user=self.user
            )
            if online:
                participant.last_seen = timezone.now()
                participant.save()
        except InternalChatParticipant.DoesNotExist:
            pass
    
    @database_sync_to_async
    def mark_message_read(self, message_id):
        """
        Marcar mensagem como lida
        """
        from .models import InternalChatMessageRead, InternalChatMessage
        try:
            message = InternalChatMessage.objects.get(id=message_id, room_id=self.room_id)
            read_receipt, created = InternalChatMessageRead.objects.get_or_create(
                message=message,
                user=self.user
            )
            return created
        except InternalChatMessage.DoesNotExist:
            return False