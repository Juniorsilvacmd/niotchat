"""
Database Tools para OpenAI Function Calling
Ferramentas seguras e eficientes para acesso ao banco de dados via IA
"""

import logging
from typing import Dict, Any, List, Optional
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from conversations.models import Team, Conversation, Contact, Message
from core.models import Provedor
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

class DatabaseTools:
    """
    Classe com ferramentas seguras para a IA acessar o banco de dados
    usando OpenAI Function Calling
    """
    
    def __init__(self, provedor: Provedor):
        self.provedor = provedor
        self.channel_layer = get_channel_layer()
    
    def buscar_equipes_disponíveis(self) -> Dict[str, Any]:
        """
        Tool: buscar_equipes_disponíveis
        Busca todas as equipes disponíveis no provedor atual
        
        Returns:
            Dict com lista de equipes disponíveis
        """
        try:
            query = Team.objects.filter(
                provedor=self.provedor,
                is_active=True
            )
            
            equipes = []
            for team in query:
                membros_ativos = team.members.filter(user__is_active=True).count()
                equipes.append({
                    'id': team.id,
                    'nome': team.name,
                    'descricao': team.description,
                    'membros_ativos': membros_ativos,
                    'pode_receber_transferencia': membros_ativos > 0
                })
            
            return {
                'success': True,
                'equipes_encontradas': len(equipes),
                'equipes': equipes,
                'provedor': self.provedor.nome
            }
            
        except Exception as e:
            logger.error(f"Erro ao buscar equipes: {e}")
            return {
                'success': False,
                'erro': f"Erro ao consultar equipes: {str(e)}"
            }
    
    def buscar_membro_disponível_equipe(self, nome_equipe: str) -> Dict[str, Any]:
        """
        Tool: buscar_membro_disponível_equipe
        Busca membro disponível em uma equipe específica
        
        Args:
            nome_equipe: Nome da equipe (SUPORTE, FINANCEIRO, ATENDIMENTO)
        
        Returns:
            Dict com dados do membro disponível
        """
        try:
            # Buscar equipe
            equipe = Team.objects.filter(
                provedor=self.provedor,
                name__iexact=nome_equipe,
                is_active=True
            ).first()
            
            if not equipe:
                return {
                    'success': False,
                    'erro': f'Equipe {nome_equipe} não encontrada ou inativa',
                    'equipes_disponiveis': [
                        team.name for team in Team.objects.filter(
                            provedor=self.provedor, 
                            is_active=True
                        )
                    ]
                }
            
            # Buscar membro disponível
            membro = equipe.members.filter(user__is_active=True).first()
            
            if not membro:
                return {
                    'success': False,
                    'erro': f'Nenhum membro ativo na equipe {nome_equipe}',
                    'equipe_id': equipe.id,
                    'equipe_nome': equipe.name
                }
            
            return {
                'success': True,
                'membro_encontrado': True,
                'equipe': {
                    'id': equipe.id,
                    'nome': equipe.name,
                    'descricao': equipe.description
                },
                'membro': {
                    'id': membro.user.id,
                    'nome': membro.user.get_full_name() or membro.user.username,
                    'username': membro.user.username,
                    'email': membro.user.email
                }
            }
            
        except Exception as e:
            logger.error(f"Erro ao buscar membro da equipe {nome_equipe}: {e}")
            return {
                'success': False,
                'erro': f"Erro ao consultar membro da equipe: {str(e)}"
            }
    
    def executar_transferencia_conversa(self, conversation_id: int, equipe_nome: str, motivo: str) -> Dict[str, Any]:
        """
        Tool: executar_transferencia_conversa
        Executa transferência segura de conversa para equipe
        
        Args:
            conversation_id: ID da conversa
            equipe_nome: Nome da equipe destino
            motivo: Motivo da transferência
        
        Returns:
            Dict com resultado da transferência
        """
        try:
            with transaction.atomic():
                # Buscar conversa com lock
                conversa = Conversation.objects.select_for_update().filter(
                    id=conversation_id,
                    inbox__provedor=self.provedor  # Segurança: apenas conversas do provedor
                ).first()
                
                if not conversa:
                    return {
                        'success': False,
                        'erro': f'Conversa {conversation_id} não encontrada ou sem permissão'
                    }
                
                # Buscar membro da equipe
                resultado_membro = self.buscar_membro_disponível_equipe(equipe_nome)
                
                if not resultado_membro['success']:
                    return resultado_membro
                
                membro_data = resultado_membro['membro']
                equipe_data = resultado_membro['equipe']
                
                # Executar transferência
                from django.contrib.auth import get_user_model
                User = get_user_model()
                
                membro_usuario = User.objects.get(id=membro_data['id'])
                
                status_anterior = conversa.status
                assignee_anterior = conversa.assignee
                
                conversa.assignee = membro_usuario
                conversa.status = 'pending'  # Em Espera
                
                # Salvar informação da equipe nos additional_attributes
                if not conversa.additional_attributes:
                    conversa.additional_attributes = {}
                conversa.additional_attributes['assigned_team'] = {
                    'id': equipe_data['id'],
                    'name': equipe_data['nome']
                }
                
                conversa.save()
                
                # Enviar notificação WebSocket
                if self.channel_layer:
                    async_to_sync(self.channel_layer.group_send)(
                        f"painel_{self.provedor.id}",
                        {
                            'type': 'conversation_status_changed',
                            'conversation': {
                                'id': conversa.id,
                                'status': conversa.status,
                                'assignee': {
                                    'id': membro_usuario.id,
                                    'name': membro_data['nome'],
                                    'team': equipe_nome
                                },
                                'contact': {
                                    'name': conversa.contact.name,
                                    'phone': conversa.contact.phone
                                }
                            },
                            'message': f'Conversa transferida para {equipe_nome} - Status: Em Espera'
                        }
                    )
                
                logger.info(f"Transferência executada: Conversa {conversation_id} → {equipe_nome} (User: {membro_data['nome']})")
                
                return {
                    'success': True,
                    'transferencia_realizada': True,
                    'conversa_id': conversa.id,
                    'status_anterior': status_anterior,
                    'status_atual': conversa.status,
                    'assignee_anterior': assignee_anterior.username if assignee_anterior else None,
                    'assignee_atual': membro_data['nome'],
                    'equipe_destino': equipe_data['nome'],
                    'motivo': motivo,
                    'mensagem_cliente': f"Você foi transferido para o setor {equipe_nome}. Em breve você será atendido por um de nossos especialistas!"
                }
                
        except Exception as e:
            logger.error(f"Erro ao executar transferência: {e}")
            return {
                'success': False,
                'erro': f"Erro ao executar transferência: {str(e)}"
            }
    
    def buscar_conversas_ativas(self) -> Dict[str, Any]:
        """
        Tool: buscar_conversas_ativas
        Busca todas as conversas ativas do provedor
        
        Returns:
            Dict com lista de conversas ativas
        """
        try:
            query = Conversation.objects.filter(
                inbox__provedor=self.provedor
            ).exclude(
                status__in=['closed', 'encerrada', 'resolved', 'finalizada']
            )
            
            conversas = []
            for conv in query.order_by('-created_at')[:50]:  # Limitar a 50 mais recentes
                conversas.append({
                    'id': conv.id,
                    'status': conv.status,
                    'contato_nome': conv.contact.name,
                    'contato_telefone': conv.contact.phone,
                    'assignee': conv.assignee.get_full_name() if conv.assignee else None,
                    'criada_em': conv.created_at.isoformat(),
                    'ultima_atividade': conv.updated_at.isoformat() if conv.updated_at else None
                })
            
            return {
                'success': True,
                'total_conversas': len(conversas),
                'conversas': conversas,
                'filtros_aplicados': {
                    'status': status,
                    'assignee_id': assignee_id
                }
            }
            
        except Exception as e:
            logger.error(f"Erro ao buscar conversas: {e}")
            return {
                'success': False,
                'erro': f"Erro ao consultar conversas: {str(e)}"
            }
    
    def buscar_estatisticas_atendimento(self) -> Dict[str, Any]:
        """
        Tool: buscar_estatisticas_atendimento
        Busca estatísticas gerais de atendimento do provedor
        
        Returns:
            Dict com estatísticas
        """
        try:
            from django.db.models import Count, Q
            from django.utils import timezone
            from datetime import timedelta
            
            # Estatísticas básicas
            total_conversas = Conversation.objects.filter(inbox__provedor=self.provedor).count()
            conversas_abertas = Conversation.objects.filter(
                inbox__provedor=self.provedor, 
                status='open'
            ).count()
            conversas_pendentes = Conversation.objects.filter(
                inbox__provedor=self.provedor, 
                status='pending'
            ).count()
            conversas_com_ia = Conversation.objects.filter(
                inbox__provedor=self.provedor, 
                status='snoozed'
            ).count()
            
            # Estatísticas por equipe
            equipes_stats = []
            for team in Team.objects.filter(provedor=self.provedor, is_active=True):
                conv_equipe = Conversation.objects.filter(
                    inbox__provedor=self.provedor,
                    assignee__in=[member.user for member in team.members.all()]
                ).count()
                
                equipes_stats.append({
                    'equipe': team.name,
                    'membros': team.members.count(),
                    'conversas_ativas': conv_equipe
                })
            
            return {
                'success': True,
                'provedor': self.provedor.nome,
                'estatisticas_gerais': {
                    'total_conversas': total_conversas,
                    'conversas_abertas': conversas_abertas,
                    'conversas_pendentes': conversas_pendentes,
                    'conversas_com_ia': conversas_com_ia
                },
                'estatisticas_equipes': equipes_stats,
                'consultado_em': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro ao buscar estatísticas: {e}")
            return {
                'success': False,
                'erro': f"Erro ao consultar estatísticas: {str(e)}"
            }

# Factory function para criar instância das ferramentas
def create_database_tools(provedor: Provedor) -> DatabaseTools:
    """Cria instância das ferramentas de banco para um provedor específico"""
    return DatabaseTools(provedor)