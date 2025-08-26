from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Conversation
from .services import ConversationNotificationService

@receiver(post_save, sender=Conversation)
def notify_conversation_change(sender, instance, created, **kwargs):
    """
    Notifica mudanças de conversa via WebSocket
    """
    try:
        # Obter provedor_id da conversa
        provedor_id = instance.inbox.provedor.id if instance.inbox and instance.inbox.provedor else None
        
        if not provedor_id:
            return
        
        if created:
            # Nova conversa
            ConversationNotificationService.notify_conversation_updated(
                provedor_id, 
                instance.id, 
                'conversation_created'
            )
        else:
            # Conversa atualizada
            if instance.status == 'closed':
                # Conversa encerrada
                ConversationNotificationService.notify_conversation_closed(
                    provedor_id, 
                    instance.id
                )
            elif instance.status == 'ended':
                # Conversa encerrada por humano
                ConversationNotificationService.notify_conversation_ended(
                    provedor_id, 
                    instance.id
                )
            elif instance.assignee:
                # Conversa atribuída
                ConversationNotificationService.notify_conversation_assigned(
                    provedor_id, 
                    instance.id, 
                    instance.assignee.id
                )
            else:
                # Outras mudanças
                ConversationNotificationService.notify_conversation_updated(
                    provedor_id, 
                    instance.id, 
                    'conversation_updated'
                )
                
    except Exception as e:
        # Debug logging removed for security
        pass
@receiver(post_delete, sender=Conversation)
def notify_conversation_deleted(sender, instance, **kwargs):
    """
    Notifica quando uma conversa é deletada
    """
    try:
        provedor_id = instance.inbox.provedor.id if instance.inbox and instance.inbox.provedor else None
        
        if provedor_id:
            ConversationNotificationService.notify_conversation_updated(
                provedor_id, 
                instance.id, 
                'conversation_deleted'
            )
                
    except Exception as e:
        # Debug logging removed for security
        pass
        # Debug logging removed for security
        pass