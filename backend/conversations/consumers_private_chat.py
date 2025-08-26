import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class PrivateChatConsumer(AsyncWebsocketConsumer):
    """
    Consumer WebSocket para chat privado entre usuários
    """
    
    async def connect(self):
        self.user = self.scope['user']
        
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Cada usuário tem seu próprio grupo para receber mensagens
        self.user_group_name = f'private_chat_{self.user.id}'
        
        # Entrar no grupo do usuário
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Atualizar status online do usuário
        await self.update_user_online_status(True)
        
        print(f"[INFO] Usuário {self.user.username} conectado ao chat privado")
    
    async def disconnect(self, close_code):
        if hasattr(self, 'user_group_name'):
            # Sair do grupo do usuário
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
            
            # Atualizar status offline do usuário
            await self.update_user_online_status(False)
            
            print(f"[INFO] Usuário {self.user.username} desconectado do chat privado")
    
    async def receive(self, text_data):
        """
        Receber mensagens do WebSocket
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'typing_start':
                await self.handle_typing_start(data)
            elif message_type == 'typing_stop':
                await self.handle_typing_stop(data)
            elif message_type == 'mark_read':
                await self.handle_mark_read(data)
            elif message_type == 'join_conversation':
                await self.handle_join_conversation(data)
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Formato JSON inválido'
            }))
        except Exception as e:
            print(f"[ERROR] Erro no WebSocket: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Erro interno do servidor'
            }))
    
    async def handle_typing_start(self, data):
        """
        Usuário começou a digitar para outro usuário
        """
        recipient_id = data.get('recipient_id')
        if recipient_id:
            await self.channel_layer.group_send(
                f"private_chat_{recipient_id}",
                {
                    'type': 'typing_notification',
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'is_typing': True
                }
            )
    
    async def handle_typing_stop(self, data):
        """
        Usuário parou de digitar
        """
        recipient_id = data.get('recipient_id')
        if recipient_id:
            await self.channel_layer.group_send(
                f"private_chat_{recipient_id}",
                {
                    'type': 'typing_notification',
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'is_typing': False
                }
            )
    
    async def handle_mark_read(self, data):
        """
        Marcar mensagem como lida
        """
        message_id = data.get('message_id')
        if message_id:
            success = await self.mark_message_read(message_id)
            if success:
                await self.send(text_data=json.dumps({
                    'type': 'message_read_success',
                    'message_id': message_id
                }))
    
    async def handle_join_conversation(self, data):
        """
        Usuário entrou numa conversa específica
        """
        other_user_id = data.get('other_user_id')
        if other_user_id:
            # Marcar todas as mensagens como lidas
            await self.mark_all_messages_read(other_user_id)
    
    # Handlers para eventos recebidos do grupo
    
    async def new_private_message(self, event):
        """
        Nova mensagem privada recebida
        """
        print(f"[DEBUG Consumer] new_private_message recebido para usuário {self.user.username}")
        print(f"[DEBUG Consumer] Event data: {event}")
        
        message_data = json.dumps({
            'type': 'new_private_message',
            'message': event['message']
        })
        
        print(f"[DEBUG Consumer] Enviando mensagem: {message_data}")
        await self.send(text_data=message_data)
        print(f"[DEBUG Consumer] Mensagem enviada com sucesso!")
    
    async def message_read(self, event):
        """
        Mensagem foi lida pelo destinatário
        """
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_id': event['message_id'],
            'reader_id': event['reader_id']
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
        await self.send(text_data=json.dumps({
            'type': 'user_status_changed',
            'user_id': event['user_id'],
            'status': event['status']
        }))
    
    # Métodos auxiliares de banco de dados
    
    @database_sync_to_async
    def update_user_online_status(self, is_online):
        """
        Atualizar status online do usuário
        """
        # TODO: Implementar sistema de status online real
        # Por enquanto só logamos
        status = "online" if is_online else "offline"
        print(f"[INFO] Status do usuário {self.user.username}: {status}")
    
    @database_sync_to_async
    def mark_message_read(self, message_id):
        """
        Marcar mensagem como lida
        """
        from .models import PrivateMessage
        try:
            message = PrivateMessage.objects.get(
                id=message_id,
                recipient=self.user
            )
            message.mark_as_read()
            return True
        except PrivateMessage.DoesNotExist:
            return False
    
    @database_sync_to_async
    def mark_all_messages_read(self, other_user_id):
        """
        Marcar todas as mensagens como lidas de um usuário específico
        """
        from .models import PrivateMessage
        try:
            messages = PrivateMessage.objects.filter(
                sender_id=other_user_id,
                recipient=self.user,
                is_read=False
            )
            for message in messages:
                message.mark_as_read()
            
            print(f"[INFO] Marcadas {messages.count()} mensagens como lidas")
            return True
        except Exception as e:
            print(f"[ERROR] Erro ao marcar mensagens como lidas: {e}")
            return False