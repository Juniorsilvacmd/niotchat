"""
Serviço de transferência inteligente baseado nas equipes reais do banco de dados
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from core.models import Provedor
from conversations.models import Team, TeamMember
from .redis_memory_service import redis_memory_service
from django.db import models

logger = logging.getLogger(__name__)

class TransferService:
    def __init__(self):
        self.transfer_keywords = {
            "suporte_tecnico": {
                "keywords": [
                    "técnico", "instalação", "internet parou", "não funciona", "problema", 
                    "chamado", "reclamação", "equipamento", "roteador", "modem", "cabo",
                    "sinal", "velocidade", "lentidão", "caiu", "desconectou", "erro"
                ],
                "priority": 1,
                "description": "problemas técnicos ou instalação"
            },
            "financeiro": {
                "keywords": [
                    "fatura", "boleto", "pagamento", "débito", "vencimento", "valor", 
                    "conta", "pagar", "preço", "cobrança", "multa", "juros", "desconto",
                    "segunda via", "comprovante", "recibo", "parcelamento"
                ],
                "priority": 2,
                "description": "dúvidas sobre faturas, pagamentos ou questões financeiras"
            },
            "vendas": {
                "keywords": [
                    "plano", "contratar", "contratação", "internet", "fibra", "oferta", 
                    "melhor", "escolher", "escolha", "novo", "mudar", "alterar", "preço",
                    "velocidade", "instalação", "endereço", "documentos", "proposta"
                ],
                "priority": 3,
                "description": "interesse em novos planos de internet"
            },
            "atendimento_especializado": {
                "keywords": [
                    "urgente", "prioritário", "emergência", "crítico", "acelerar", 
                    "atendimento rápido", "reclamação", "anatel", "procon", "direitos",
                    "cancelar", "rescisão", "indemnização", "compensação"
                ],
                "priority": 0,  # Prioridade máxima
                "description": "atendimento urgente ou de alta prioridade"
            }
        }
    
    def get_provedor_teams(self, provedor: Provedor) -> List[Dict[str, Any]]:
        """Obtém todas as equipes ativas de um provedor"""
        try:
            teams = Team.objects.filter(
                provedor=provedor,
                is_active=True
            ).prefetch_related('members')
            
            teams_data = []
            for team in teams:
                team_data = {
                    'id': team.id,
                    'name': team.name,
                    'description': team.description,
                    'member_count': team.members.count(),
                    'is_active': team.is_active,
                    'created_at': team.created_at.isoformat() if team.created_at else None
                }
                teams_data.append(team_data)
            
            logger.info(f"Encontradas {len(teams_data)} equipes para o provedor {provedor.nome}")
            return teams_data
            
        except Exception as e:
            logger.error(f"Erro ao obter equipes do provedor: {e}")
            return []
    
    def analyze_transfer_decision(self, mensagem: str, provedor: Provedor, conversation_context: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """
        Analisa a mensagem e contexto para decidir se deve transferir para uma equipe especializada.
        Retorna um dicionário com informações da transferência ou None.
        """
        try:
            mensagem_lower = mensagem.lower()
            conversation_context = conversation_context or {}
            
            # Verificar se já foi decidida uma transferência anteriormente
            if conversation_context.get('transfer_decision'):
                logger.info("Transferência já foi decidida anteriormente")
                return conversation_context['transfer_decision']
            
            # Analisar mensagem para identificar tipo de solicitação
            detected_types = []
            
            for transfer_type, config in self.transfer_keywords.items():
                if any(keyword in mensagem_lower for keyword in config['keywords']):
                    detected_types.append({
                        'type': transfer_type,
                        'priority': config['priority'],
                        'description': config['description'],
                        'confidence': self._calculate_confidence(mensagem_lower, config['keywords'])
                    })
            
            if not detected_types:
                logger.info("Nenhum tipo de transferência detectado na mensagem")
                return None
            
            # Ordenar por prioridade (menor número = maior prioridade)
            detected_types.sort(key=lambda x: x['priority'])
            
            # Selecionar o tipo com maior prioridade
            selected_type = detected_types[0]
            
            # Buscar equipe correspondente no banco
            target_team = self._find_matching_team(provedor, selected_type['type'])
            
            if not target_team:
                logger.warning(f"Nenhuma equipe encontrada para o tipo: {selected_type['type']}")
                return None
            
            # VALIDAÇÃO EXTRA: Confirmar que a equipe pertence ao provedor correto
            if target_team.get('provedor_id') != provedor.id:
                logger.error(f"ERRO CRÍTICO: Equipe {target_team['name']} (ID: {target_team['id']}) pertence ao provedor {target_team['provedor_id']}, mas estamos no provedor {provedor.id}")
                logger.error("Isolamento de provedor violado - cancelando transferência")
                return None
            
            logger.info(f"Validação de isolamento: Equipe {target_team['name']} pertence ao provedor correto {provedor.nome}")
            
            transfer_decision = {
                'team_id': target_team['id'],
                'team_name': target_team['name'],
                'transfer_type': selected_type['type'],
                'reason': selected_type['description'],
                'confidence': selected_type['confidence'],
                'detected_at': datetime.now().isoformat(),
                'message_analyzed': mensagem[:100] + "..." if len(mensagem) > 100 else mensagem,
                'provedor_id': target_team['provedor_id'],
                'provedor_nome': target_team['provedor_nome']
            }
            
            logger.info(f"Decisão de transferência: {transfer_decision['team_name']} - {transfer_decision['reason']}")
            return transfer_decision
            
        except Exception as e:
            logger.error(f"Erro ao analisar decisão de transferência: {e}")
            return None
    
    def _calculate_confidence(self, mensagem: str, keywords: List[str]) -> float:
        """Calcula o nível de confiança da detecção baseado nas palavras-chave encontradas"""
        try:
            found_keywords = sum(1 for keyword in keywords if keyword in mensagem)
            total_keywords = len(keywords)
            
            if total_keywords == 0:
                return 0.0
            
            confidence = found_keywords / total_keywords
            
            # Ajustar confiança baseado no contexto
            if found_keywords >= 2:
                confidence += 0.2  # Bônus para múltiplas palavras-chave
            elif found_keywords == 1:
                confidence += 0.1  # Bônus pequeno para uma palavra-chave
            
            return min(confidence, 1.0)  # Máximo 100%
            
        except Exception as e:
            logger.error(f"Erro ao calcular confiança: {e}")
            return 0.5
    
    def _find_matching_team(self, provedor: Provedor, transfer_type: str) -> Optional[Dict[str, Any]]:
        """Encontra a equipe mais adequada para o tipo de transferência - SEMPRE do próprio provedor"""
        try:
            # REGRA FUNDAMENTAL: Só buscar equipes do próprio provedor
            logger.info(f"Buscando equipe para tipo '{transfer_type}' APENAS no provedor '{provedor.nome}' (ID: {provedor.id})")
            
            # Mapear tipos de transferência para nomes de equipe
            team_name_mapping = {
                "suporte_tecnico": ["suporte", "técnico", "tecnico", "suporte técnico", "suporte tecnico", "suporte tecnico"],
                "financeiro": ["financeiro", "faturamento", "cobrança", "cobranca", "financeiro"],
                "vendas": ["vendas", "comercial", "atendimento", "novos clientes", "vendas"],
                "atendimento_especializado": ["especializado", "urgente", "prioritário", "prioritario", "atendimento especializado"]
            }
            
            target_names = team_name_mapping.get(transfer_type, [])
            
            # Buscar equipe por nome APENAS no provedor atual
            for name in target_names:
                try:
                    team = Team.objects.filter(
                        provedor=provedor,  # CRÍTICO: Apenas equipes do provedor atual
                        is_active=True,
                        name__icontains=name
                    ).first()
                    
                    if team:
                        logger.info(f"Equipe encontrada: '{team.name}' (ID: {team.id}) no provedor '{provedor.nome}'")
                        return {
                            'id': team.id,
                            'name': team.name,
                            'description': team.description,
                            'provedor_id': team.provedor.id,  # Confirmar que é do provedor correto
                            'provedor_nome': team.provedor.nome
                        }
                except Exception as e:
                    logger.warning(f"Erro ao buscar equipe por nome '{name}' no provedor {provedor.nome}: {e}")
                    continue
            
            # Se não encontrar por nome específico, buscar por padrão APENAS no provedor atual
            logger.info(f"Tentando busca padrão para tipo '{transfer_type}' no provedor '{provedor.nome}'")
            
            if transfer_type == "suporte_tecnico":
                # Buscar equipe com "suporte" no nome APENAS no provedor atual
                team = Team.objects.filter(
                    provedor=provedor,  # CRÍTICO: Apenas equipes do provedor atual
                    is_active=True,
                    name__icontains="suporte"
                ).first()
            elif transfer_type == "financeiro":
                # Buscar equipe com "financeiro" no nome APENAS no provedor atual
                team = Team.objects.filter(
                    provedor=provedor,  # CRÍTICO: Apenas equipes do provedor atual
                    is_active=True,
                    name__icontains="financeiro"
                ).first()
            elif transfer_type == "vendas":
                # Buscar equipe com "vendas" ou "comercial" no nome APENAS no provedor atual
                team = Team.objects.filter(
                    provedor=provedor,  # CRÍTICO: Apenas equipes do provedor atual
                    is_active=True
                ).filter(
                    models.Q(name__icontains="vendas") | 
                    models.Q(name__icontains="comercial")
                ).first()
            else:
                # Para atendimento especializado, buscar qualquer equipe ativa APENAS no provedor atual
                team = Team.objects.filter(
                    provedor=provedor,  # CRÍTICO: Apenas equipes do provedor atual
                    is_active=True
                ).first()
            
            if team:
                logger.info(f"Equipe padrão encontrada: '{team.name}' (ID: {team.id}) no provedor '{provedor.nome}'")
                return {
                    'id': team.id,
                    'name': team.name,
                    'description': team.description,
                    'provedor_id': team.provedor.id,
                    'provedor_nome': team.provedor.nome
                }
            
            # Se não encontrou nenhuma equipe para este tipo no provedor atual
            logger.warning(f"NENHUMA equipe encontrada para tipo '{transfer_type}' no provedor '{provedor.nome}'")
            logger.warning(f"Este provedor NÃO possui equipe para atender solicitações de '{transfer_type}'")
            
            return None
            
        except Exception as e:
            logger.error(f"Erro ao encontrar equipe correspondente no provedor {provedor.nome}: {e}")
            return None
    
    async def execute_transfer(self, provedor: Provedor, conversation_id: int, transfer_decision: Dict[str, Any]) -> bool:
        """Executa a transferência para a equipe selecionada"""
        try:
            # Salvar decisão de transferência na memória Redis
            await redis_memory_service.add_conversation_context(
                provedor_id=provedor.id,
                conversation_id=conversation_id,
                context_type="transfer_decision",
                context_data=transfer_decision
            )
            
            # Marcar conversa como transferida
            await redis_memory_service.add_conversation_context(
                provedor_id=provedor.id,
                conversation_id=conversation_id,
                context_type="transferred",
                context_data={
                    'transferred_at': datetime.now().isoformat(),
                    'team_id': transfer_decision['team_id'],
                    'team_name': transfer_decision['team_name'],
                    'reason': transfer_decision['reason']
                }
            )
            
            logger.info(f"Transferência executada: conversa {conversation_id} → equipe {transfer_decision['team_name']}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao executar transferência: {e}")
            return False
    
    def get_transfer_summary(self, provedor: Provedor) -> Dict[str, Any]:
        """Obtém resumo das transferências para um provedor"""
        try:
            teams = self.get_provedor_teams(provedor)
            
            summary = {
                'provedor_id': provedor.id,
                'provedor_nome': provedor.nome,
                'total_teams': len(teams),
                'teams': teams,
                'transfer_types': list(self.transfer_keywords.keys()),
                'last_updated': datetime.now().isoformat()
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Erro ao obter resumo de transferências: {e}")
            return {}
    
    def check_provedor_transfer_capability(self, provedor: Provedor) -> Dict[str, Any]:
        """Verifica quais tipos de transferência o provedor pode atender"""
        try:
            capability_report = {
                'provedor_id': provedor.id,
                'provedor_nome': provedor.nome,
                'can_handle_transfers': {},
                'missing_teams': [],
                'available_teams': [],
                'recommendations': []
            }
            
            # Verificar cada tipo de transferência
            for transfer_type, config in self.transfer_keywords.items():
                target_team = self._find_matching_team(provedor, transfer_type)
                
                if target_team:
                    capability_report['can_handle_transfers'][transfer_type] = {
                        'available': True,
                        'team_id': target_team['id'],
                        'team_name': target_team['name'],
                        'description': config['description']
                    }
                    capability_report['available_teams'].append({
                        'type': transfer_type,
                        'team': target_team
                    })
                else:
                    capability_report['can_handle_transfers'][transfer_type] = {
                        'available': False,
                        'description': config['description'],
                        'priority': config['priority']
                    }
                    capability_report['missing_teams'].append({
                        'type': transfer_type,
                        'description': config['description'],
                        'priority': config['priority']
                    })
            
            # Gerar recomendações
            if capability_report['missing_teams']:
                high_priority_missing = [t for t in capability_report['missing_teams'] if t['priority'] <= 1]
                if high_priority_missing:
                    capability_report['recommendations'].append(
                        f"CRÍTICO: Criar equipes para: {', '.join([t['type'] for t in high_priority_missing])}"
                    )
                
                medium_priority_missing = [t for t in capability_report['missing_teams'] if 1 < t['priority'] <= 2]
                if medium_priority_missing:
                    capability_report['recommendations'].append(
                        f"IMPORTANTE: Considerar criar equipes para: {', '.join([t['type'] for t in medium_priority_missing])}"
                    )
            
            # Calcular score de capacidade
            total_types = len(self.transfer_keywords)
            available_types = len([t for t in capability_report['can_handle_transfers'].values() if t['available']])
            capability_score = (available_types / total_types) * 100
            
            capability_report['capability_score'] = round(capability_score, 1)
            capability_report['capability_level'] = self._get_capability_level(capability_score)
            
            logger.info(f"Capacidade de transferência do provedor {provedor.nome}: {capability_score}% ({capability_report['capability_level']})")
            
            return capability_report
            
        except Exception as e:
            logger.error(f"Erro ao verificar capacidade de transferência: {e}")
            return {}
    
    def _get_capability_level(self, score: float) -> str:
        """Retorna o nível de capacidade baseado no score"""
        if score >= 90:
            return "EXCELENTE"
        elif score >= 75:
            return "BOM"
        elif score >= 50:
            return "REGULAR"
        elif score >= 25:
            return "LIMITADO"
        else:
            return "CRÍTICO"

# Instância global do serviço
transfer_service = TransferService()
