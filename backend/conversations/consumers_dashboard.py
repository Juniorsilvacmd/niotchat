import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

class DashboardConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer para atualizações em tempo real do dashboard
    """
    
    async def connect(self):
        """Conectar ao WebSocket"""
        try:
            # Autenticar usuário
            user = await self.get_user()
            if not user:
                await self.close()
                return
            
            # Obter provedor do usuário
            provedor = await self.get_user_provedor(user)
            if not provedor:
                await self.close()
                return
            
            # Adicionar ao grupo do provedor
            self.provedor_id = provedor.id
            self.user = user
            
            await self.channel_layer.group_add(
                f"dashboard_{provedor.id}",
                self.channel_name
            )
            
            await self.accept()
            
            # Enviar dados iniciais
            await self.send_initial_data()
            
            logger.info(f"Dashboard WebSocket conectado: {user.username} - Provedor: {provedor.nome}")
            
        except Exception as e:
            logger.error(f"Erro ao conectar WebSocket do dashboard: {e}")
            await self.close()
    
    async def disconnect(self, close_code):
        """Desconectar do WebSocket"""
        if hasattr(self, 'provedor_id'):
            await self.channel_layer.group_discard(
                f"dashboard_{self.provedor_id}",
                self.channel_name
            )
        logger.info(f"Dashboard WebSocket desconectado: {close_code}")
    
    async def receive(self, text_data):
        """Receber mensagem do cliente"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'request_update':
                # Cliente solicitou atualização
                await self.send_dashboard_update()
            elif message_type == 'ping':
                # Ping do cliente
                await self.send(json.dumps({'type': 'pong'}))
                
        except json.JSONDecodeError:
            logger.error("Erro ao decodificar JSON do WebSocket")
        except Exception as e:
            logger.error(f"Erro ao processar mensagem WebSocket: {e}")
    
    async def send_initial_data(self):
        """Enviar dados iniciais do dashboard"""
        try:
            dashboard_data = await self.get_dashboard_data()
            await self.send(json.dumps({
                'type': 'dashboard_initial',
                'data': dashboard_data
            }))
        except Exception as e:
            logger.error(f"Erro ao enviar dados iniciais: {e}")
    
    async def send_dashboard_update(self):
        """Enviar atualização do dashboard"""
        try:
            dashboard_data = await self.get_dashboard_data()
            await self.send(json.dumps({
                'type': 'dashboard_update',
                'data': dashboard_data
            }))
        except Exception as e:
            logger.error(f"Erro ao enviar atualização: {e}")
    
    async def dashboard_stats_update(self, event):
        """Enviar atualização de estatísticas para o cliente"""
        try:
            dashboard_data = await self.get_dashboard_data()
            await self.send(json.dumps({
                'type': 'dashboard_stats_update',
                'data': dashboard_data
            }))
        except Exception as e:
            logger.error(f"Erro ao enviar atualização de estatísticas: {e}")
    
    @database_sync_to_async
    def get_user(self):
        """Obter usuário autenticado"""
        try:
            # Verificar se há token na query string
            query_string = self.scope.get('query_string', b'').decode()
            if 'token=' in query_string:
                from rest_framework.authtoken.models import Token
                token_key = query_string.split('token=')[1].split('&')[0]
                token = Token.objects.select_related('user').get(key=token_key)
                return token.user
            return None
        except Exception as e:
            logger.error(f"Erro ao obter usuário: {e}")
            return None
    
    @database_sync_to_async
    def get_user_provedor(self, user):
        """Obter provedor do usuário"""
        try:
            if hasattr(user, 'provedor') and user.provedor:
                return user.provedor
            return user.provedores_admin.first()
        except Exception as e:
            logger.error(f"Erro ao obter provedor: {e}")
            return None
    
    @database_sync_to_async
    def get_dashboard_data(self):
        """Obter dados do dashboard"""
        try:
            from django.contrib.auth import get_user_model
            from core.models import Provedor
            from conversations.models import Conversation, Message, Contact
            from django.db.models import Q, Count
            
            User = get_user_model()
            provedor_id = self.provedor_id
            
            # Estatísticas de conversas
            total_conversas = Conversation.objects.filter(
                inbox__provedor_id=provedor_id
            ).count()
            
            conversas_abertas = Conversation.objects.filter(
                inbox__provedor_id=provedor_id,
                status='open'
            ).count()
            
            conversas_pendentes = Conversation.objects.filter(
                inbox__provedor_id=provedor_id,
                status='pending'
            ).count()
            
            conversas_resolvidas = Conversation.objects.filter(
                inbox__provedor_id=provedor_id,
                status='closed'
            ).count()
            
            # Estatísticas de mensagens (últimos 30 dias)
            data_30_dias_atras = timezone.now() - timedelta(days=30)
            mensagens_30_dias = Message.objects.filter(
                conversation__inbox__provedor_id=provedor_id,
                created_at__gte=data_30_dias_atras
            ).count()
            
            # Estatísticas por canal
            canais_stats = Conversation.objects.filter(
                inbox__provedor_id=provedor_id
            ).values('inbox__channel_type').annotate(
                total=Count('id')
            ).order_by('-total')
            
            # Performance dos atendentes
            atendentes_stats = []
            usuarios_provedor = User.objects.filter(
                Q(provedores_admin=provedor_id) | 
                Q(user_type='agent', provedores_admin=provedor_id)
            )
            
            for usuario in usuarios_provedor[:5]:
                conversas_atendidas = Conversation.objects.filter(
                    inbox__provedor_id=provedor_id,
                    assignee=usuario
                ).count()
                
                atendentes_stats.append({
                    'name': f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username,
                    'conversations': conversas_atendidas,
                    'satisfaction': 4.5  # Simulado
                })
            
            return {
                'total_conversas': total_conversas,
                'conversas_abertas': conversas_abertas,
                'conversas_pendentes': conversas_pendentes,
                'conversas_resolvidas': conversas_resolvidas,
                'mensagens_30_dias': mensagens_30_dias,
                'canais': list(canais_stats),
                'atendentes': atendentes_stats,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter dados do dashboard: {e}")
            return {}
    
    @classmethod
    async def broadcast_dashboard_update(cls, provedor_id):
        """Broadcast atualização para todos os clientes do provedor"""
        try:
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            
            await channel_layer.group_send(
                f"dashboard_{provedor_id}",
                {
                    'type': 'dashboard_stats_update'
                }
            )
        except Exception as e:
            logger.error(f"Erro ao broadcast dashboard: {e}") 