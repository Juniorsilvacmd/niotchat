"""
Serviço de integração com Telegram usando Telethon (MTProto)
"""

import asyncio
import logging
from typing import Optional, Dict, Any
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.tl.types import User as TelegramUser, Chat, Channel
from django.conf import settings
from .models import TelegramIntegration
from conversations.models import Contact, Conversation, Message, Inbox
from core.models import Company

logger = logging.getLogger(__name__)


class TelegramService:
    def __init__(self, integration: TelegramIntegration):
        self.integration = integration
        self.client: Optional[TelegramClient] = None
        self.is_running = False
        
    async def initialize_client(self):
        """Inicializar cliente Telegram"""
        try:
            session = StringSession(self.integration.session_string or '')
            self.client = TelegramClient(
                session,
                self.integration.api_id,
                self.integration.api_hash
            )
            
            await self.client.start(phone=self.integration.phone_number)
            
            # Salvar session string se não existir
            if not self.integration.session_string:
                self.integration.session_string = self.client.session.save()
                self.integration.save()
            
            self.integration.is_connected = True
            self.integration.save()
            
            logger.info(f"Cliente Telegram inicializado para {self.integration.company.name}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao inicializar cliente Telegram: {e}")
            self.integration.is_connected = False
            self.integration.save()
            return False
    
    async def start_listening(self):
        """Iniciar escuta de mensagens"""
        if not self.client:
            if not await self.initialize_client():
                return False
        
        try:
            # Registrar handler para mensagens recebidas
            @self.client.on(events.NewMessage(incoming=True))
            async def handle_new_message(event):
                await self.process_incoming_message(event)
            
            # Registrar handler para mensagens editadas
            @self.client.on(events.MessageEdited(incoming=True))
            async def handle_edited_message(event):
                await self.process_incoming_message(event, is_edited=True)
            
            self.is_running = True
            logger.info(f"Iniciando escuta de mensagens Telegram para {self.integration.company.name}")
            
            # Manter cliente rodando
            await self.client.run_until_disconnected()
            
        except Exception as e:
            logger.error(f"Erro na escuta de mensagens: {e}")
            self.is_running = False
            self.integration.is_connected = False
            self.integration.save()
    
    async def process_incoming_message(self, event, is_edited=False):
        """Processar mensagem recebida"""
        try:
            message = event.message
            sender = await message.get_sender()
            chat = await message.get_chat()
            
            # Criar ou obter contato
            contact = await self.get_or_create_contact(sender, chat)
            
            # Criar ou obter conversa
            conversation = await self.get_or_create_conversation(contact, chat)
            
            # Criar mensagem no sistema
            content = message.text or ""
            attachments = []
            
            # Processar anexos se existirem
            if message.media:
                attachment_info = await self.process_media(message)
                if attachment_info:
                    attachments.append(attachment_info)
            
            # Criar mensagem
            system_message = Message.objects.create(
                conversation=conversation,
                content=content,
                message_type='incoming',
                content_type='text' if not message.media else 'file',
                attachments=attachments,
                external_source_id=str(message.id),
                metadata={
                    'telegram_message_id': message.id,
                    'telegram_chat_id': message.chat_id,
                    'telegram_sender_id': message.sender_id,
                    'is_edited': is_edited,
                    'date': message.date.isoformat() if message.date else None
                },
                is_from_customer=False
            )
            
            logger.info(f"Mensagem processada: {system_message.id}")
            
            # Notificar via WebSocket (se necessário)
            # Aqui você pode integrar com o FastAPI para notificações em tempo real
            
        except Exception as e:
            logger.error(f"Erro ao processar mensagem: {e}")
    
    async def get_or_create_contact(self, sender, chat) -> Contact:
        """Criar ou obter contato baseado no remetente"""
        try:
            # Identificar contato baseado no tipo de chat
            if isinstance(sender, TelegramUser):
                contact_name = f"{sender.first_name or ''} {sender.last_name or ''}".strip()
                if not contact_name:
                    contact_name = sender.username or f"User {sender.id}"
                
                phone = sender.phone if hasattr(sender, 'phone') else None
                
                # Buscar contato existente
                contact, created = Contact.objects.get_or_create(
                    provedor=self.integration.provedor,
                    additional_attributes__telegram_user_id=sender.id,
                    defaults={
                        'name': contact_name,
                        'phone': phone,
                        'additional_attributes': {
                            'telegram_user_id': sender.id,
                            'telegram_username': sender.username,
                            'telegram_first_name': sender.first_name,
                            'telegram_last_name': sender.last_name,
                        }
                    }
                )
                
                return contact
            else:
                # Para grupos/canais
                contact_name = getattr(chat, 'title', f"Chat {chat.id}")
                
                contact, created = Contact.objects.get_or_create(
                    provedor=self.integration.provedor,
                    additional_attributes__telegram_chat_id=chat.id,
                    defaults={
                        'name': contact_name,
                        'additional_attributes': {
                            'telegram_chat_id': chat.id,
                            'telegram_chat_type': type(chat).__name__,
                            'telegram_title': getattr(chat, 'title', None),
                        }
                    }
                )
                
                return contact
                
        except Exception as e:
            logger.error(f"Erro ao criar/obter contato: {e}")
            # Retornar contato padrão em caso de erro
            return Contact.objects.get_or_create(
                provedor=self.integration.provedor,
                name="Contato Desconhecido",
                defaults={'additional_attributes': {}}
            )[0]
    
    async def get_or_create_conversation(self, contact: Contact, chat) -> Conversation:
        """Criar ou obter conversa"""
        try:
            # Obter inbox do Telegram
            inbox, created = Inbox.objects.get_or_create(
                company=self.integration.company,
                channel_type='telegram',
                defaults={
                    'name': 'Telegram',
                    'settings': {
                        'api_id': self.integration.api_id,
                        'phone_number': self.integration.phone_number
                    }
                }
            )
            
            # Buscar conversa existente
            conversation, created = Conversation.objects.get_or_create(
                contact=contact,
                inbox=inbox,
                status__in=['open', 'pending'],
                defaults={
                    'status': 'open',
                    'priority': 'medium',
                    'additional_attributes': {
                        'telegram_chat_id': chat.id,
                        'telegram_chat_type': type(chat).__name__
                    }
                }
            )
            
            return conversation
            
        except Exception as e:
            logger.error(f"Erro ao criar/obter conversa: {e}")
            raise
    
    async def process_media(self, message) -> Optional[Dict[str, Any]]:
        """Processar anexos de mídia"""
        try:
            if not message.media:
                return None
            
            # Baixar arquivo (implementação básica)
            file_path = await message.download_media()
            
            if file_path:
                return {
                    'type': 'file',
                    'file_path': file_path,
                    'file_name': getattr(message.media, 'document', {}).get('attributes', [{}])[0].get('file_name', 'arquivo'),
                    'file_size': getattr(message.media, 'document', {}).get('size', 0),
                    'mime_type': getattr(message.media, 'document', {}).get('mime_type', 'application/octet-stream')
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Erro ao processar mídia: {e}")
            return None
    
    async def send_message(self, chat_id: int, content: str, reply_to_message_id: Optional[int] = None):
        """Enviar mensagem via Telegram"""
        try:
            if not self.client:
                if not await self.initialize_client():
                    return False
            
            await self.client.send_message(
                chat_id,
                content,
                reply_to=reply_to_message_id
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem: {e}")
            return False
    
    async def stop(self):
        """Parar cliente"""
        self.is_running = False
        if self.client:
            await self.client.disconnect()
        
        self.integration.is_connected = False
        self.integration.save()


class TelegramManager:
    """Gerenciador de múltiplas integrações Telegram"""
    
    def __init__(self):
        self.services: Dict[int, TelegramService] = {}
    
    async def start_integration(self, integration_id: int):
        """Iniciar integração específica"""
        try:
            integration = TelegramIntegration.objects.get(
                id=integration_id,
                is_active=True
            )
            
            if integration_id not in self.services:
                service = TelegramService(integration)
                self.services[integration_id] = service
            
            service = self.services[integration_id]
            await service.start_listening()
            
        except TelegramIntegration.DoesNotExist:
            logger.error(f"Integração Telegram {integration_id} não encontrada")
        except Exception as e:
            logger.error(f"Erro ao iniciar integração {integration_id}: {e}")
    
    async def stop_integration(self, integration_id: int):
        """Parar integração específica"""
        if integration_id in self.services:
            await self.services[integration_id].stop()
            del self.services[integration_id]
    
    async def start_all_integrations(self):
        """Iniciar todas as integrações ativas"""
        integrations = TelegramIntegration.objects.filter(is_active=True)
        
        tasks = []
        for integration in integrations:
            task = asyncio.create_task(self.start_integration(integration.id))
            tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def stop_all_integrations(self):
        """Parar todas as integrações"""
        tasks = []
        for integration_id in list(self.services.keys()):
            task = asyncio.create_task(self.stop_integration(integration_id))
            tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


# Instância global do gerenciador
telegram_manager = TelegramManager()

