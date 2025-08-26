"""
Definições de Functions para OpenAI Function Calling - Database Tools
Ferramentas seguras para acesso ao banco de dados via IA
"""

# Definições dos tools seguindo a documentação OpenAI Function Calling
DATABASE_FUNCTION_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "buscar_equipes_disponiveis",
            "description": "# Debug logging removed for security Busca todas as equipes disponíveis do provedor atual. Use para verificar quais equipes existem antes de transferir ou quando o cliente perguntar sobre setores disponíveis.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function", 
        "function": {
            "name": "buscar_membro_disponivel_equipe",
            "description": "👤 Busca membro disponível em uma equipe específica. Use antes de executar transferência para verificar se há alguém disponível na equipe de destino.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_equipe": {
                        "type": "string",
                        "enum": ["SUPORTE", "FINANCEIRO", "ATENDIMENTO"],
                        "description": "Nome da equipe para buscar membro disponível"
                    }
                },
                "required": ["nome_equipe"],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function",
        "function": {
            "name": "executar_transferencia_conversa",
            "description": "FERRAMENTA PRINCIPAL PARA TRANSFERÊNCIAS! Executa transferência segura de conversa para equipe. Move automaticamente de 'Com IA' para 'Em Espera'. Use SEMPRE que cliente solicitar transferência para suporte/financeiro/atendimento.",
            "parameters": {
                "type": "object",
                "properties": {
                    "conversation_id": {
                        "type": "integer",
                        "description": "ID da conversa atual que será transferida"
                    },
                    "equipe_nome": {
                        "type": "string", 
                        "enum": ["SUPORTE", "FINANCEIRO", "ATENDIMENTO"],
                        "description": "Nome da equipe de destino. SUPORTE para problemas técnicos, FINANCEIRO para questões de pagamento/fatura, ATENDIMENTO para questões gerais."
                    },
                    "motivo": {
                        "type": "string",
                        "description": "Motivo da transferência explicado em português"
                    }
                },
                "required": ["conversation_id", "equipe_nome", "motivo"],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_conversas_ativas", 
            "description": "Busca conversas ativas do provedor. Use para verificar status das conversas, relatórios ou quando precisar de informações sobre atendimentos em andamento.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_estatisticas_atendimento",
            "description": "Busca estatísticas gerais de atendimento do provedor. Use quando cliente ou agente pedir relatórios, números de atendimento ou visão geral do desempenho.",
            "parameters": {
                "type": "object", 
                "properties": {},
                "required": [],
                "additionalProperties": False
            },
            "strict": True
        }
    }
]

# Mapeamento de nomes de função para implementação
DATABASE_FUNCTION_MAPPING = {
    "buscar_equipes_disponiveis": "buscar_equipes_disponíveis",
    "buscar_membro_disponivel_equipe": "buscar_membro_disponível_equipe",
    "executar_transferencia_conversa": "executar_transferencia_conversa",
    "buscar_conversas_ativas": "buscar_conversas_ativas",
    "buscar_estatisticas_atendimento": "buscar_estatisticas_atendimento"
}

# Instruções específicas para o sistema prompt
DATABASE_SYSTEM_INSTRUCTIONS = """
FERRAMENTAS DE BANCO DE DADOS DISPONÍVEIS:

**Para Transferências (PRIORITÁRIO):**
1. buscar_equipes_disponiveis() - Verificar equipes existentes
2. buscar_membro_disponivel_equipe(nome_equipe) - Verificar disponibilidade  
3. executar_transferencia_conversa(conversation_id, equipe_nome, motivo) - Executar transferência

**Para Consultas e Relatórios:**
4. buscar_conversas_ativas(status, assignee_id) - Listar conversas ativas
5. buscar_estatisticas_atendimento() - Estatísticas gerais

🚨 REGRAS CRÍTICAS PARA TRANSFERÊNCIAS:

1. **FLUXO OBRIGATÓRIO quando cliente pedir transferência:**
   - Cliente: "Quero falar com suporte técnico"
   - IA: Execute executar_transferencia_conversa(equipe_nome="SUPORTE", motivo="Cliente solicitou suporte técnico")
   - Sistema: Move de "Com IA" → "Em Espera" automaticamente

2. **MAPEAMENTO DE SOLICITAÇÕES:**
   - **GERAL**: "alguém", "ajuda", "atendente", "pessoa", "humano" → ATENDIMENTO
   - **TÉCNICO**: "suporte", "técnico", "internet", "problema", "conexão" → SUPORTE
   - **FINANCEIRO**: "financeiro", "fatura", "pagamento", "cobrança", "boleto" → FINANCEIRO  
   - **COMERCIAL**: "atendimento", "comercial", "dúvida geral", "informação" → ATENDIMENTO

3. **NUNCA USE transferir_para_equipe (REMOVIDA):**
   - Use APENAS executar_transferencia_conversa
   - Esta é a ÚNICA função válida para transferências
   - Parâmetros: equipe_nome, motivo (conversation_id é automático)

4. **NÃO FAÇA BUSCAR_FATURAS após transferência ser solicitada:**
   - Se cliente quer transferência = Use executar_transferencia_conversa
   - Se cliente quer fatura = Use buscar_faturas_vencidas
   - NUNCA misture as duas ações

4. **SEGURANÇA AUTOMÁTICA:**
   - Todas as funções respeitam isolamento do provedor
   - Conversation_id é validado automaticamente
   - Transações são atômicas e seguras

5. **MENSAGENS AO CLIENTE:**
   - Sempre confirme transferência: "Transferindo para [EQUIPE]..."
   - Use mensagem retornada pela função: mensagem_cliente
   - Seja educado e explique o motivo

**EXEMPLOS CORRETOS:**
Cliente: "Preciso falar com o financeiro"
IA: executa executar_transferencia_conversa("FINANCEIRO", "Cliente solicitou atendimento financeiro")

Cliente: "Alguém para me ajudar aí?"
IA: executa executar_transferencia_conversa("ATENDIMENTO", "Cliente pediu ajuda de atendente")

Cliente: "Quero ajuda"
IA: executa executar_transferencia_conversa("ATENDIMENTO", "Cliente solicitou atendimento humano")

Resultado: Conversa move de "Com IA" para "Em Espera" + Notificação WebSocket

**EXEMPLO INCORRETO:**
Cliente: "Preciso do financeiro" 
IA: "Vou buscar suas faturas..." + executa buscar_faturas_vencidas
ERRADO! Cliente quer transferência, não fatura!
"""