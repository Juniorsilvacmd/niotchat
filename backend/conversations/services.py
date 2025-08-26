import json
from datetime import datetime
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class ConversationNotificationService:
    """
    Serviço para notificar mudanças de conversas via WebSocket
    """
    
    @staticmethod
    def notify_conversation_updated(provedor_id, conversation_id, event_type, data=None):
        """
        Notifica mudança de conversa para todos os clientes do painel
        """
        try:
            channel_layer = get_channel_layer()
            group_name = f'painel_{provedor_id}'
            
            event_data = {
                'type': 'conversation_event',
                'event_type': event_type,
                'conversation_id': conversation_id,
                'data': data or {},
                'timestamp': datetime.now().isoformat()
            }
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                event_data
            )
# Debug logging removed for security
        except Exception as e:
            # Debug logging removed for security
            pass
    @staticmethod
    def notify_conversation_closed(provedor_id, conversation_id):
        """
        Notifica que uma conversa foi encerrada
        """
        ConversationNotificationService.notify_conversation_updated(
            provedor_id, 
            conversation_id, 
            'conversation_closed',
            {'status': 'closed'}
        )
    
    @staticmethod
    def notify_conversation_ended(provedor_id, conversation_id):
        """
        Notifica que uma conversa foi encerrada por humano
        """
        ConversationNotificationService.notify_conversation_updated(
            provedor_id, 
            conversation_id, 
            'conversation_ended',
            {'status': 'ended'}
        )
    
    @staticmethod
    def notify_conversation_assigned(provedor_id, conversation_id, assignee_id):
        """
        Notifica que uma conversa foi atribuída
        """
        ConversationNotificationService.notify_conversation_updated(
            provedor_id, 
            conversation_id, 
            'conversation_assigned',
            {'assignee_id': assignee_id}
        ) 