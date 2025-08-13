import asyncio
import logging
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
from django.conf import settings
import os

logger = logging.getLogger(__name__)

class TelegramMTProtoService:
    def __init__(self):
        self.clients = {}  # Armazenar clientes ativos por canal_id
        self.code_hashes = {}  # Armazenar phone_code_hash por canal_id
        
    async def create_client(self, channel):
        """Criar cliente MTProto para um canal"""
        try:
            # Criar sessão única para este canal
            session = StringSession()
            
            # Criar cliente com as credenciais do canal
            client = TelegramClient(
                session,
                int(channel.api_id),
                channel.api_hash,
                device_model=channel.app_title or "Nio Chat",
                system_version="2.1.4",
                app_version="2.1.4",
                lang_code="pt"
            )
            
            return client
        except Exception as e:
            logger.error(f"Erro ao criar cliente MTProto: {str(e)}")
            return None
    
    async def connect_telegram(self, channel):
        """Conectar ao Telegram via MTProto"""
        try:
            client = await self.create_client(channel)
            if not client:
                return {'success': False, 'error': 'Erro ao criar cliente'}
            
            # Conectar ao Telegram
            await client.connect()
            
            # Verificar se já está autorizado
            if not await client.is_user_authorized():
                return {
                    'success': False, 
                    'needs_auth': True,
                    'message': 'Necessário autorizar via código SMS'
                }
            
            # Verificar conexão
            me = await client.get_me()
            if me:
                # Armazenar cliente ativo
                self.clients[channel.id] = client
                
                return {
                    'success': True,
                    'status': 'CONNECTED',
                    'user': {
                        'id': me.id,
                        'username': me.username,
                        'first_name': me.first_name,
                        'last_name': me.last_name,
                        'phone': me.phone
                    }
                }
            else:
                return {'success': False, 'error': 'Não foi possível obter dados do usuário'}
                
        except Exception as e:
            logger.error(f"Erro ao conectar Telegram MTProto: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def send_code(self, channel):
        """Enviar código de verificação via SMS"""
        try:
            client = await self.create_client(channel)
            if not client:
                return {'success': False, 'error': 'Erro ao criar cliente'}
            
            await client.connect()
            
            # Enviar código via SMS
            phone = channel.phone_number
            if not phone:
                return {'success': False, 'error': 'Número de telefone não configurado'}
            
            logger.info(f'Enviando código SMS para: {phone}')
            
            # Formatar número de telefone (adicionar + se não tiver)
            if not phone.startswith('+'):
                phone = '+' + phone
            
            # Enviar código e armazenar phone_code_hash
            result = await client.send_code_request(phone)
            if result:
                # Armazenar phone_code_hash para uso posterior
                self.code_hashes[channel.id] = result.phone_code_hash
                logger.info(f'Phone code hash armazenado para canal {channel.id}')
            
            return {
                'success': True,
                'message': f'Código enviado via SMS para {phone}'
            }
            
        except Exception as e:
            logger.error(f"Erro ao enviar código: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def verify_code(self, channel, code):
        """Verificar código recebido via SMS"""
        try:
            client = await self.create_client(channel)
            if not client:
                return {'success': False, 'error': 'Erro ao criar cliente'}
            
            await client.connect()
            
            phone = channel.phone_number
            if not phone:
                return {'success': False, 'error': 'Número de telefone não configurado'}
            
            # Formatar número de telefone (adicionar + se não tiver)
            if not phone.startswith('+'):
                phone = '+' + phone
            
            logger.info(f'Verificando código para: {phone}')
            
            # Obter phone_code_hash armazenado
            phone_code_hash = self.code_hashes.get(channel.id)
            if not phone_code_hash:
                return {'success': False, 'error': 'Phone code hash não encontrado. Envie o código novamente.'}
            
            # Fazer login com o código
            await client.sign_in(phone, code, phone_code_hash=phone_code_hash)
            
            # Verificar se login foi bem-sucedido
            me = await client.get_me()
            if me:
                # Armazenar cliente ativo
                self.clients[channel.id] = client
                
                # Limpar phone_code_hash após sucesso
                if channel.id in self.code_hashes:
                    del self.code_hashes[channel.id]
                
                return {
                    'success': True,
                    'status': 'CONNECTED',
                    'user': {
                        'id': me.id,
                        'username': me.username,
                        'first_name': me.first_name,
                        'last_name': me.last_name,
                        'phone': me.phone
                    }
                }
            else:
                return {'success': False, 'error': 'Falha na verificação do código'}
                
        except PhoneCodeInvalidError:
            return {'success': False, 'error': 'Código inválido'}
        except SessionPasswordNeededError:
            return {'success': False, 'error': 'Senha de 2FA necessária'}
        except Exception as e:
            logger.error(f"Erro ao verificar código: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_status(self, channel):
        """Verificar status da conexão MTProto"""
        try:
            if channel.id in self.clients:
                client = self.clients[channel.id]
                if client.is_connected():
                    me = await client.get_me()
                    if me:
                        return {
                            'success': True,
                            'status': 'CONNECTED',
                            'user': {
                                'id': me.id,
                                'username': me.username,
                                'first_name': me.first_name,
                                'last_name': me.last_name,
                                'phone': me.phone
                            }
                        }
            
            return {'success': False, 'status': 'DISCONNECTED'}
            
        except Exception as e:
            logger.error(f"Erro ao verificar status: {str(e)}")
            return {'success': False, 'status': 'DISCONNECTED', 'error': str(e)}
    
    async def disconnect(self, channel_id):
        """Desconectar cliente MTProto"""
        try:
            if channel_id in self.clients:
                client = self.clients[channel_id]
                await client.disconnect()
                del self.clients[channel_id]
                return {'success': True, 'message': 'Desconectado com sucesso'}
            return {'success': False, 'error': 'Cliente não encontrado'}
        except Exception as e:
            logger.error(f"Erro ao desconectar: {str(e)}")
            return {'success': False, 'error': str(e)}

# Instância global do serviço
telegram_service = TelegramMTProtoService() 