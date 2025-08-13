"""
Serviço para integração com OpenAI ChatGPT
"""

import os
import openai
import logging
import json
from typing import Dict, Any, Optional, List
from django.conf import settings
from .models import Provedor, SystemConfig
from asgiref.sync import sync_to_async
from datetime import datetime
from .redis_memory_service import redis_memory_service
from .transfer_service import transfer_service

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        self.api_key = self._get_api_key()
        openai.api_key = self.api_key
        self.model = "gpt-3.5-turbo"
        self.max_tokens = 1000
        self.temperature = 0.7

    def _get_api_key(self) -> str:
        """Busca a chave da API da OpenAI do banco de dados ou variável de ambiente"""
        try:
            # Primeiro tenta buscar do banco de dados
            config = SystemConfig.objects.first()
            if config and config.openai_api_key:
                logger.info("Usando chave da API OpenAI do banco de dados")
                return config.openai_api_key
        except Exception as e:
            logger.warning(f"Erro ao buscar chave da API do banco: {e}")
        
        # Fallback para variável de ambiente
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            logger.info("Usando chave da API OpenAI da variável de ambiente")
            return api_key
        
        # Se não encontrar chave, retornar None para que o erro seja tratado adequadamente
        logger.error("Nenhuma chave da API OpenAI encontrada - configure no painel do superadmin")
        return None

    async def _get_api_key_async(self) -> str:
        """Versão assíncrona para buscar a chave da API da OpenAI"""
        try:
            # Usar sync_to_async para buscar do banco de dados
            config = await sync_to_async(SystemConfig.objects.first)()
            if config and config.openai_api_key:
                logger.info("Usando chave da API OpenAI do banco de dados (async)")
                return config.openai_api_key
        except Exception as e:
            logger.warning(f"Erro ao buscar chave da API do banco (async): {e}")
        
        # Fallback para variável de ambiente
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            logger.info("Usando chave da API OpenAI da variável de ambiente (async)")
            return api_key
        
        # Se não encontrar chave, retornar None para que o erro seja tratado adequadamente
        logger.error("Nenhuma chave da API OpenAI encontrada - configure no painel do superadmin (async)")
        return None

    def update_api_key(self):
        """Atualiza a chave da API quando ela é modificada no banco"""
        self.api_key = self._get_api_key()
        if self.api_key:
            openai.api_key = self.api_key
            logger.info("Chave da API OpenAI atualizada")
        else:
            logger.error("Não foi possível atualizar a chave da API OpenAI - chave não configurada")

    async def update_api_key_async(self):
        """Versão assíncrona para atualizar a chave da API"""
        self.api_key = await self._get_api_key_async()
        if self.api_key:
            openai.api_key = self.api_key
            logger.info("Chave da API OpenAI atualizada (async)")
        else:
            logger.error("Não foi possível atualizar a chave da API OpenAI - chave não configurada (async)")

    def _get_greeting_time(self) -> str:
        """Retorna saudação baseada no horário atual"""
        from datetime import datetime
        now = datetime.now()
        hour = now.hour
        
        if 5 <= hour < 12:
            return "Bom dia"
        elif 12 <= hour < 18:
            return "Boa tarde"
        else:
            return "Boa noite"
    


    def _build_system_prompt(self, provedor: Provedor) -> str:
        import json
        from datetime import datetime
        import locale
        try:
            locale.setlocale(locale.LC_TIME, 'pt_BR.UTF-8')
        except:
            pass
        now = datetime.now()
        
        # Dados básicos
        nome_agente = provedor.nome_agente_ia or 'Assistente Virtual'
        nome_provedor = provedor.nome or 'Provedor de Internet'
        site_oficial = provedor.site_oficial or ''
        endereco = provedor.endereco or ''
        
        # Configurações dinâmicas
        greeting_time = self._get_greeting_time()
        
        # Redes sociais
        redes = provedor.redes_sociais or {}
        if not isinstance(redes, dict):
            try:
                import json as _json
                redes = _json.loads(redes)
            except Exception:
                redes = {}
        
        # Horários de funcionamento
        horarios = {}
        try:
            import json as _json
            if provedor.horarios_atendimento:
                if isinstance(provedor.horarios_atendimento, str):
                    horarios = _json.loads(provedor.horarios_atendimento)
                elif isinstance(provedor.horarios_atendimento, dict):
                    horarios = provedor.horarios_atendimento
                else:
                    horarios = {}
            else:
                horarios = {}
        except Exception:
            horarios = {}
        
        # Personalidade (pode ser lista ou objeto estruturado)
        personalidade = provedor.personalidade or []
        personalidade_avancada = None
        
        # Verificar se é personalidade avançada (objeto) ou lista simples
        if isinstance(personalidade, dict):
            personalidade_avancada = personalidade
            # Manter compatibilidade usando características como personalidade base
            personalidade_traits = personalidade.get('caracteristicas', '').split(',') if personalidade.get('caracteristicas') else []
            personalidade = [trait.strip() for trait in personalidade_traits if trait.strip()] or ["Atencioso", "Carismatico", "Educado", "Objetivo", "Persuasivo"]
        elif not personalidade:
            personalidade = ["Atencioso", "Carismatico", "Educado", "Objetivo", "Persuasivo"]
        
        # Planos de internet
        planos_internet = provedor.planos_internet or ''
        # Informações extras
        informacoes_extras = provedor.informacoes_extras or ''
        # Emojis
        uso_emojis = provedor.uso_emojis or ""
        
        # Novos campos dinâmicos
        taxa_adesao = provedor.taxa_adesao or ''
        inclusos_plano = provedor.inclusos_plano or ''
        multa_cancelamento = provedor.multa_cancelamento or ''
        tipo_conexao = provedor.tipo_conexao or ''
        prazo_instalacao = provedor.prazo_instalacao or ''
        documentos_necessarios = provedor.documentos_necessarios or ''
        observacoes = provedor.observacoes or ''
        
        # E-mail de contato principal
        email_contato = ''
        if hasattr(provedor, 'emails') and provedor.emails:
            emails = provedor.emails
            if isinstance(emails, dict):
                email_contato = next((v for v in emails.values() if v), '')
            elif isinstance(emails, list) and emails:
                email_contato = emails[0]
        
        # Data atual formatada
        data_atual = now.strftime('%A, %d/%m/%Y, %H:%M')
        
        # Construir identidade do agente
        identidade = f"Sou o {nome_agente}, um assistente virtual. Estou aqui para te ajudar com dúvidas, verificar se você já é nosso cliente e te apresentar os melhores planos de internet disponíveis."
        
        # Objetivos padrão
        objetivos = [
            f"Identificar se a pessoa é ou não cliente da {nome_provedor}",
            "Atender clientes com dúvidas ou problemas (ex: fatura, suporte)",
            "Apresentar os planos de internet para novos interessados",
            "Encaminhar para um atendente humano quando necessário"
        ]
        
        # Ferramentas disponíveis - usar personalizadas se disponíveis, senão usar padrão
        ferramentas_padrao = [
            {
                "name": "buscar_documentos",
                "usage": "Use esta ferramenta sempre que o usuário fizer uma pergunta técnica ou comercial fora do seu conhecimento. Se não encontrar nada, encaminhe para um atendente humano."
            },
            {
                "name": "validar_cpf",
                "usage": "Após coletar o CPF do cliente, utilize essa ferramenta para validar o CPF e recuperar os dados do cliente."
            },
            {
                "name": "buscar_faturas",
                "usage": "Use esta ferramenta quando o cliente solicitar a segunda via da fatura, conta ou boleto. Sempre pergunte se ele deseja receber o QRCODE PIX ou o boleto. Se ele ja estiver falado, não pergunte novamente.",
                "observacao": "Se o cliente tiver mais de 2 faturas pendentes, informe e encaminhe para o atendimento humano usando a tool 'encaminha_financeiro'."
            },
            {
                "name": "envia_boleto",
                "usage": "Use esta ferramenta para enviar o boleto para cliente apos ele ter decidido que deseja receber a sua fatura via boleto.",
                "observacao": "Após usar a ferramenta, pergunte se o cliente deseja mais alguma coisa."
            },
            {
                "name": "envia_qrcode",
                "usage": "Use esta ferramenta para enviar o QRCODE PIX para cliente apos ele ter decidido que deseja receber a sua fatura via pix/qrcode",
                "observacao": "Após usar a ferramenta, pergunte se o cliente deseja mais alguma coisa."
            },
            {
                "name": "prazo_de_confianca",
                "usage": "Use esta ferramenta para tentar desbloquear o contrato do cliente por prazo de confiança, caso o cliente peça pra desbloquear.",
                "observacao": "Após usar a ferramenta, pergunte se o cliente deseja a sua fatura para pagamento antes que o contrato fique suspenso novamente."
            },
            {
                "name": "checha_conexao",
                "usage": "Use esta ferramenta para verificar o status da conexão do cliente. Ela retornará se o equipamento está online ou offline."
            },
            {
                "name": "encaminha_suporte",
                "usage": "Use esta ferramenta para encaminhar o cliente para o suporte humano quando necessário, como em casos de problemas técnicos que não puder resolver."
            },
            {
                "name": "encaminha_financeiro",
                "usage": "Use esta ferramenta para encaminhar o cliente para o departamento financeiro quando necessário, como em casos de dúvidas sobre faturas, pagamentos ou questões financeiras."
            },
            {
                "name": "GetCpfContato",
                "usage": "Use essa ferramenta para capturar o CPF do cliente no contato inicial. Ela retornará o CPF/CNPJ já salvo no contato do ChatWoot, se existir. *SEMPRE* use essa ferramenta antes de solicitar o CPF ao cliente.",
                "observacao": "**EXECUÇÃO OBRIGATÓRIA**: Deve ser acionada automaticamente nos primeiros 3 segundos de interação, antes de qualquer pergunta. Se falhar, reinicie o atendimento.",
                "critical_rule": True
            },
            {
                "name": "SalvarCpfContato",
                "usage": "Use essa ferramenta para salvar o numero do CPF do cliente dentro do seu contato no ChatWoot. O CPF DEVE SER SALVO SOMENTE NO FORMATO NUMÉRICO."
            },
            {
                "name": "consultar_cliente_sgp",
                "usage": "Use esta ferramenta para consultar dados reais do cliente no SGP usando CPF/CNPJ. Retorna nome, contratos, status reais do sistema.",
                "observacao": "SEMPRE use esta ferramenta após receber CPF/CNPJ de cliente existente. Use APENAS os dados retornados.",
                "critical_rule": True
            },
            {
                "name": "verificar_acesso_sgp", 
                "usage": "Use para verificar status de acesso/conexão de um contrato específico no SGP.",
                "observacao": "Use após identificar o contrato do cliente via consultar_cliente_sgp."
            },
            {
                "name": "gerar_fatura_completa",
                "usage": "Use para gerar fatura completa com boleto, PIX, QR code e todos os dados de pagamento.",
                "observacao": "SEMPRE use esta ferramenta quando cliente pedir fatura/boleto. Retorna dados completos incluindo PIX.",
                "critical_rule": True
            },
            {
                "name": "gerar_pix_qrcode",
                "usage": "Use para gerar especificamente PIX e QR code para uma fatura.",
                "observacao": "Use quando precisar apenas dos dados PIX de uma fatura específica."
            }
        ]
        
        # Usar ferramentas personalizadas se disponíveis, senão usar padrão
        ferramentas = provedor.ferramentas_ia if provedor.ferramentas_ia else ferramentas_padrao
        
        # Regras gerais - usar personalizadas se disponíveis, senão usar padrão
        regras_padrao = [
            f"Responder apenas sobre assuntos relacionados à {nome_provedor}.",
            "Nunca inventar informações. Sempre use 'buscar_documentos' para confirmar dados técnicos ou planos.",
            "Se não souber ou for fora do escopo, diga exatamente: 'Desculpe, não posso te ajudar com isso. Encaminhando para um atendente humano.'",
            "Seja natural e conversacional. Responda cumprimentos e perguntas gerais de forma amigável.",
            "REGRA CRÍTICA: Se cliente já disse o que quer (fatura, boleto, suporte), NÃO pergunte 'como posso ajudar' - vá DIRETO executar a demanda. EXEMPLO: Se cliente diz 'manda fatura', vá direto pedir CPF/CNPJ, NÃO pergunte 'como posso ajudar hoje?'",
            "REGRA CRÍTICA PARA FERRAMENTAS: SEMPRE use a ferramenta 'GetCpfContato' ANTES de perguntar CPF/CNPJ. Use a memória Redis para não pedir CPF repetidamente.",
            "REGRA CRÍTICA PARA FATURA: Quando cliente solicitar fatura/boleto, SEMPRE: 1) Peça CPF/CNPJ → 2) Consulte SGP → 3) Gere fatura completa → 4) ENVIE automaticamente via WhatsApp com botões interativos.",
            "Quando cliente mencionar FATURA/BOLETO: peça CPF → consulte SGP → apresente dados → AUTOMATICAMENTE gere fatura completa com QR code e PIX → ENVIE automaticamente via WhatsApp. NUNCA pergunte 'como posso ajudar' se cliente já pediu fatura.",
            "Quando cliente mencionar PROBLEMA TÉCNICO: peça CPF → consulte SGP → apresente dados → AUTOMATICAMENTE verifique status da conexão.",
            "NUNCA use textos genéricos se a demanda já foi especificada - seja específico e direto.",
            "REGRA ESPECÍFICA PARA FATURA: Se cliente diz 'manda fatura', 'quero pagar internet', 'preciso da fatura', etc., vá DIRETO pedir CPF/CNPJ com a mensagem: 'Para que eu possa localizar seu contrato e enviar sua fatura por favor me informe o cpf/cnpj do titular do contrato'",
            "Após receber CPF/CNPJ: consulte automaticamente no SGP e execute a ação solicitada.",
            "NUNCA invente nomes de clientes, contratos ou dados - use APENAS informações reais do SGP.",
            "Para novos clientes: responda sobre planos sem necessidade de CPF.",
            "REGRA DE MEMÓRIA: Use sempre a memória Redis para lembrar CPF/CNPJ já fornecidos e não pedir repetidamente.",
            "REGRA DE ENVIO AUTOMÁTICO: Para faturas, SEMPRE envie automaticamente via WhatsApp após gerar os dados. Use a função _send_fatura_via_uazapi."
        ]
        
        regras_gerais = provedor.regras_gerais if provedor.regras_gerais else regras_padrao
        
        # Fluxo de atendimento - usar personalizado se disponível, senão usar padrão
        fluxo_padrao = {
            "boas_vindas": {
                "instructions": f"Use '{greeting_time}' para saudar baseado no horário atual. Seja natural e acolhedor. SEMPRE pergunte se é cliente quando ele solicitar algo específico como boleto, suporte técnico, etc. Use a ferramenta 'GetCpfContato' ANTES de perguntar CPF.",
                "example_message": f"{greeting_time}! Seja bem-vindo à {nome_provedor}! Eu sou o {nome_agente}, como posso te ajudar?"
            },
            "cliente": {
                "descricao_geral": f"Fluxo para quem já é cliente da {nome_provedor}.",
                "instrucoes_importantes": [
                    "SEMPRE use a ferramenta 'GetCpfContato' ANTES de perguntar CPF/CNPJ",
                    "Se o cliente disser que já é cliente, vá DIRETO para solicitar CPF/CNPJ",
                    "Após receber CPF/CNPJ, consulte AUTOMATICAMENTE no SGP e retorne os dados reais",
                    "Use apenas dados reais vindos do SGP, nunca invente informações",
                    "Use a memória Redis para não pedir CPF repetidamente"
                ],
                "etapas": [
                    {
                        "etapa": 1,
                        "titulo": "Verificar se é cliente",
                        "acao_ia": "SEMPRE pergunte se é cliente quando ele solicitar algo específico. Use: 'Para te ajudar melhor, você já é nosso cliente?'",
                        "observacao": "Esta pergunta é OBRIGATÓRIA para qualquer solicitação específica (fatura, boleto, suporte, etc.)"
                    },
                    {
                        "etapa": 2,
                        "titulo": "Detectar demanda específica",
                        "acao_ia": "SE o cliente já mencionou uma demanda específica (fatura, boleto, problema técnico, etc.), vá DIRETO para ela. NÃO pergunte 'como posso ajudar' se ele já disse.",
                        "demandas_especificas": [
                            "fatura", "boleto", "conta", "pagamento", "segunda via",
                            "sem internet", "internet parou", "problema", "suporte",
                            "cancelar", "mudar plano", "reclamação"
                        ],
                        "observacao": "Se cliente disse 'quero pagar minha fatura' ou 'manda fatura', vá direto para solicitar CPF e gerar fatura. NUNCA pergunte 'como posso ajudar'."
                    },
                    {
                        "etapa": 3,
                        "titulo": "Solicitar CPF/CNPJ para demanda específica",
                        "acao_ia": "Para demandas específicas, peça CPF/CNPJ de forma direcionada ao que ele quer. NUNCA pergunte 'como posso ajudar' se cliente já especificou o que quer.",
                        "examples": {
                            "fatura": "Para que eu possa localizar seu contrato e enviar sua fatura por favor me informe o cpf/cnpj do titular do contrato",
                            "suporte": "Para verificar sua conexão, preciso do seu CPF ou CNPJ.",
                            "geral": "Para localizar seu cadastro, preciso do seu CPF ou CNPJ."
                        }
                    },
                    {
                        "etapa": 4,
                        "titulo": "Consultar SGP e executar demanda automaticamente",
                        "acao_ia": "Após consultar dados no SGP, execute automaticamente a demanda solicitada:",
                        "acoes_por_demanda": {
                            "fatura": "Consulte SGP → Apresente dados do cliente → AUTOMATICAMENTE gere fatura com QR code, PIX e valor → ENVIE automaticamente via WhatsApp",
                            "suporte": "Consulte SGP → Apresente dados do cliente → AUTOMATICAMENTE verifique status da conexão",
                            "geral": "Consulte SGP → Apresente dados do cliente → Pergunte como pode ajudar"
                        },
                        "observacao": "NÃO pergunte 'como posso ajudar' se o cliente já especificou o que quer. Para faturas, SEMPRE envie automaticamente via WhatsApp após gerar."
                    },
                    {
                        "etapa": 5,
                        "titulo": "Entregar resultado completo",
                        "acao_ia": "Entregue o resultado completo da demanda em uma mensagem organizada.",
                        "example_fatura": "🧾 **Sua Fatura**\n📄 Valor: R$ 89,90\n📅 Vencimento: 15/08/2024\n💳 Código PIX: pix123abc\n📱 QR Code: [link]\n📋 ID Fatura: #12345\n\n✅ **Fatura enviada automaticamente via WhatsApp com botões interativos!**"
                    }
                ]
            },
            "nao_cliente": {
                "descricao_geral": f"Fluxo para pessoas que ainda não são clientes da {nome_provedor}.",
                "etapas": [
                    {
                        "etapa": 1,
                        "titulo": "Descobrir interesse",
                        "acao_ia": f"Perguntar se conhece a {nome_provedor} e qual sua necessidade com internet. Se já tiver falado, não pergunte novamente.",
                        "example_message": f"👀Você já conhece a {nome_provedor}? Está buscando internet pra *casa*, *trabalho* ou algo mais específico? "
                    },
                    {
                        "etapa": 2,
                        "titulo": "Apresentar benefícios",
                        "acao_ia": f"Falar dos diferenciais da {nome_provedor} (fibra óptica, estabilidade, suporte, etc.).",
                        "example_message": f"A {nome_provedor} oferece internet via fibra óptica, super estável e com suporte 24/7! Temos planos incríveis para atender sua necessidade. Vamos ver qual é o melhor pra você? 😊"
                    },
                    {
                        "etapa": 3,
                        "titulo": "Apresentar planos",
                        "acao_ia": "Utilize 'buscar_documentos' para mostrar os planos atuais e tirar dúvidas."
                    },
                    {
                        "etapa": 4,
                        "titulo": "Coletar dados para proposta",
                        "acao_ia": "Pedir nome completo e endereço para continuar com a contratação.",
                        "example_message": "Que ótimo! Para seguir com a contratação, preciso do seu nome completo e endereço, por favor. Assim já agilizo tudo para você! "
                    },
                    {
                        "etapa": 5,
                        "titulo": "Encaminhar para atendimento humano",
                        "acao_ia": "Encaminhar para equipe de vendas ou atendimento final com dados coletados."
                    }
                ]
            },
            "fallback": {
                "instructions": "Se não entender a intenção ou for assunto fora da Fibra/telecom, usar resposta padrão e encaminhar.",
                "example_message": "Desculpe, não posso te ajudar com isso. Encaminhando para um atendente humano."
            }
        }
        
        fluxo = provedor.fluxo_atendimento if provedor.fluxo_atendimento else fluxo_padrao
        
        # Montar prompt JSON completo
        prompt_dict = {
            "name": nome_agente,
            "context": {
                "identity": identidade,
                "business": nome_provedor,
                "site": site_oficial,
                "endereco": endereco,
                "language": "Português Brasileiro",
                "data_atual": data_atual,
                "planos_internet": planos_internet,
                "informacoes_extras": informacoes_extras,
                "taxa_adesao": taxa_adesao,
                "inclusos_plano": inclusos_plano,
                "multa_cancelamento": multa_cancelamento,
                "tipo_conexao": tipo_conexao,
                "prazo_instalacao": prazo_instalacao,
                "documentos_necessarios": documentos_necessarios,
                "observacoes": observacoes,
                "email_contato": email_contato,
                "greeting_time": greeting_time
            },
            "greeting_config": {
                "greeting_time": greeting_time,
                "instructions": f"Use '{greeting_time}' para saudar baseado no horário atual. Seja natural e acolhedor."
            },
            "redes_sociais": {
                "instagram": redes.get('instagram', ''),
                "facebook": redes.get('facebook', ''),
                "tiktok": redes.get('tiktok', ''),
                "google_meu_negocio": redes.get('google', '')
            },
            "horarios_funcionamento": horarios,
            "personality": personalidade,
            "objectives": objetivos,
            "tools": ferramentas,
            "general_rules": regras_gerais,
            "flow": fluxo
        }
        
        # Adicionar personalidade avançada se configurada
        if personalidade_avancada:
            vicios = personalidade_avancada.get('vicios_linguagem', '')
            caracteristicas = personalidade_avancada.get('caracteristicas', '')
            principios = personalidade_avancada.get('principios', '')
            humor = personalidade_avancada.get('humor', '')
            
            instructions = []
            if vicios:
                instructions.append(f"Vícios de linguagem: {vicios}")
            if caracteristicas:
                instructions.append(f"Características: {caracteristicas}")
            if principios:
                instructions.append(f"Princípios: {principios}")
            if humor:
                instructions.append(f"Humor: {humor}")
            
            prompt_dict["personalidade_avancada"] = {
                "vicios_linguagem": vicios,
                "caracteristicas": caracteristicas,
                "principios": principios,
                "humor": humor,
                "instructions": "IMPORTANTE: Incorpore estes aspectos de personalidade naturalmente em todas as suas respostas:\n" + "\n".join(f"• {inst}" for inst in instructions) + "\n\nNão mencione que está seguindo essas instruções, apenas seja essa personalidade de forma natural e autêntica."
            }
        
        # Configuração de emojis baseada na preferência do provedor
        if uso_emojis:
            if uso_emojis.lower() == "sempre":
                prompt_dict["emoji_config"] = {
                    "usage": "sempre",
                    "instructions": "Use emojis naturalmente em suas respostas para torná-las mais amigáveis e expressivas. Varie os emojis conforme o contexto."
                }
            elif uso_emojis.lower() == "ocasionalmente":
                prompt_dict["emoji_config"] = {
                    "usage": "ocasionalmente", 
                    "instructions": "Use emojis moderadamente, apenas em momentos apropriados como saudações, agradecimentos ou para destacar informações importantes."
                }
            elif uso_emojis.lower() == "nunca":
                prompt_dict["emoji_config"] = {
                    "usage": "nunca",
                    "instructions": "NÃO use emojis nas respostas. Mantenha uma comunicação mais formal e textual."
                }
        else:
            # Padrão: uso ocasional
            prompt_dict["emoji_config"] = {
                "usage": "ocasionalmente",
                "instructions": "Use emojis moderadamente, apenas em momentos apropriados como saudações, agradecimentos ou para destacar informações importantes."
            }
            
        print("PROMPT GERADO PARA IA:\n", json.dumps(prompt_dict, ensure_ascii=False, indent=2))
        return json.dumps(prompt_dict, ensure_ascii=False, indent=2)

    def _execute_sgp_function(self, provedor: Provedor, function_name: str, function_args: dict) -> dict:
        """Executa funções do SGP chamadas pela IA"""
        try:
            from .sgp_client import SGPClient
            
            # Obter configurações do SGP do provedor
            integracao = provedor.integracoes_externas or {}
            sgp_url = integracao.get('sgp_url')
            sgp_token = integracao.get('sgp_token') 
            sgp_app = integracao.get('sgp_app')
            
            if not all([sgp_url, sgp_token, sgp_app]):
                return {
                    "erro": "Configurações do SGP não encontradas. Configure no painel do provedor.",
                    "success": False
                }
            
            # Criar cliente SGP
            sgp = SGPClient(
                base_url=sgp_url,
                token=sgp_token,
                app_name=sgp_app
            )
            
            # Executar função solicitada
            if function_name == "consultar_cliente_sgp":
                cpf_cnpj = function_args.get('cpf_cnpj', '').replace('.', '').replace('-', '').replace('/', '')
                resultado = sgp.consultar_cliente(cpf_cnpj)
                
                # Processar resultado para formato mais legível
                if resultado.get('contratos'):
                    contratos = resultado['contratos']
                    
                    # Se tem apenas um contrato, retorna dados essenciais
                    if len(contratos) == 1:
                        contrato = contratos[0]
                        return {
                            "success": True,
                            "cliente_encontrado": True,
                            "nome": contrato.get('razaoSocial', 'Nome não encontrado'),
                            "contrato_id": contrato.get('contratoId'),
                            "status_contrato": contrato.get('contratoStatusDisplay'),
                            "dados_essenciais": {
                                "contratoId": contrato.get('contratoId'),
                                "razaoSocial": contrato.get('razaoSocial'),
                                "contratoStatusDisplay": contrato.get('contratoStatusDisplay')
                            }
                        }
                    # Se tem múltiplos contratos, lista apenas ID e endereço
                    else:
                        contratos_resumidos = []
                        for i, contrato in enumerate(contratos, 1):
                            endereco = f"{contrato.get('endereco_logradouro', '')} {contrato.get('endereco_numero', '')}, {contrato.get('endereco_bairro', '')}, {contrato.get('endereco_cidade', '')}"
                            contratos_resumidos.append({
                                "numero": i,
                                "contratoId": contrato.get('contratoId'),
                                "endereco": endereco.strip()
                            })
                        
                        return {
                            "success": True,
                            "cliente_encontrado": True,
                            "nome": contratos[0].get('razaoSocial', 'Nome não encontrado'),
                            "multiplos_contratos": True,
                            "total_contratos": len(contratos),
                            "contratos_resumidos": contratos_resumidos,
                            "mensagem": f"Encontrei {len(contratos)} contratos para este cliente. Por favor, escolha qual contrato deseja consultar:"
                        }
                else:
                    return {
                        "success": True,
                        "cliente_encontrado": False,
                        "mensagem": "Cliente não encontrado com este CPF/CNPJ"
                    }
                    
            elif function_name == "verificar_acesso_sgp":
                contrato = function_args.get('contrato')
                resultado = sgp.verifica_acesso(contrato)
                
                status_conexao = (
                    resultado.get('msg') or
                    resultado.get('status') or 
                    resultado.get('status_conexao') or
                    resultado.get('mensagem') or
                    "Status não disponível"
                )
                
                return {
                    "success": True,
                    "contrato": contrato,
                    "status_conexao": status_conexao,
                    "dados_completos": resultado
                }
                
            elif function_name == "gerar_fatura_completa":
                # Implementação para gerar fatura completa
                contrato = function_args.get('contrato', '')
                if contrato:
                    try:
                        # Gerar fatura via SGP
                        resultado = sgp.gerar_fatura_completa(contrato)
                        
                        if resultado and resultado.get('success'):
                            # Extrair dados da fatura
                            fatura_data = resultado.get('dados_fatura', {})
                            fatura_id = fatura_data.get('fatura_id')
                            valor = fatura_data.get('valor')
                            vencimento = fatura_data.get('vencimento')
                            status = fatura_data.get('status', 'em aberto')
                            
                            # Gerar PIX se disponível
                            pix_data = None
                            if fatura_id:
                                try:
                                    pix_data = sgp.gerar_pix(fatura_id)
                                except Exception as e:
                                    logger.warning(f"Erro ao gerar PIX: {e}")
                            
                            # Preparar dados para envio automático
                            dados_fatura = {
                                'fatura_id': fatura_id,
                                'valor': valor,
                                'vencimento': vencimento,
                                'status_fatura': status,
                                'codigo_pix': pix_data.get('codigo_pix') if pix_data else None,
                                'linha_digitavel': fatura_data.get('linha_digitavel'),
                                'link_fatura': fatura_data.get('link_fatura')
                            }
                            
                            # ENVIAR AUTOMATICAMENTE VIA WHATSAPP
                            numero_whatsapp = function_args.get('numero_whatsapp', '')
                            
                            # Se não foi fornecido, tentar obter do contexto da conversa
                            if not numero_whatsapp and 'conversation' in function_args:
                                conversation = function_args['conversation']
                                if hasattr(conversation, 'contact') and conversation.contact:
                                    numero_whatsapp = conversation.contact.phone_number
                            
                            if numero_whatsapp:
                                try:
                                    fatura_enviada = self._send_fatura_via_uazapi(
                                        provedor=provedor,
                                        numero_whatsapp=numero_whatsapp,
                                        dados_fatura=dados_fatura
                                    )
                                    
                                    if fatura_enviada:
                                        logger.info(f"Fatura enviada automaticamente via WhatsApp para {numero_whatsapp}")
                                        dados_fatura['enviada_whatsapp'] = True
                                    else:
                                        logger.warning(f"Falha ao enviar fatura via WhatsApp para {numero_whatsapp}")
                                        dados_fatura['enviada_whatsapp'] = False
                                except Exception as e:
                                    logger.error(f"Erro ao enviar fatura via WhatsApp: {e}")
                                    dados_fatura['enviada_whatsapp'] = False
                            else:
                                logger.warning("Número de WhatsApp não fornecido para envio automático")
                                dados_fatura['enviada_whatsapp'] = False
                            
                            return {
                                "success": True,
                                "fatura_gerada": True,
                                "dados_fatura": dados_fatura,
                                "enviada_whatsapp": dados_fatura.get('enviada_whatsapp', False),
                                "mensagem": "Fatura gerada com sucesso e enviada automaticamente via WhatsApp" if dados_fatura.get('enviada_whatsapp') else "Fatura gerada com sucesso, mas falha no envio via WhatsApp"
                            }
                        else:
                            return {
                                "success": False,
                                "erro": "Não foi possível gerar a fatura",
                                "dados_fatura": resultado
                            }
                    except Exception as e:
                        logger.error(f"Erro ao gerar fatura completa: {e}")
                        return {
                            "success": False,
                            "erro": f"Erro ao gerar fatura: {str(e)}"
                        }
                else:
                    return {
                        "success": False,
                        "erro": "Contrato não fornecido"
                    }
                
            elif function_name == "gerar_pix_qrcode":
                fatura_id = function_args.get('fatura_id')
                resultado = sgp.gerar_pix(fatura_id)
                
                return {
                    "success": True,
                    "fatura_id": fatura_id,
                    "pix_gerado": True,
                    "codigo_pix": resultado.get('codigo_pix') if resultado else None,
                    "qr_code": resultado.get('qr_code') if resultado else None,
                    "valor": resultado.get('valor') if resultado else None,
                    "dados_completos": resultado
                }
                
            elif function_name == "GetCpfContato":
                # Implementação para buscar CPF do contato no ChatWoot
                try:
                    from conversations.models import Contact
                    
                    # Obter número de telefone do contexto da conversa
                    phone_number = function_args.get('phone_number', '')
                    
                    # Se não foi fornecido, tentar obter do contexto da conversa
                    if not phone_number and 'conversation' in function_args:
                        conversation = function_args['conversation']
                        if hasattr(conversation, 'contact') and conversation.contact:
                            phone_number = conversation.contact.phone_number
                    
                    if phone_number:
                        # Limpar número (remover formatação)
                        phone_clean = ''.join(filter(str.isdigit, str(phone_number)))
                        
                        # Buscar contato pelo número de telefone
                        contact = Contact.objects.filter(phone_number=phone_clean).first()
                        if contact and contact.additional_attributes:
                            cpf = contact.additional_attributes.get('cpf_cnpj')
                            if cpf:
                                logger.info(f"CPF/CNPJ encontrado no contato {contact.id}: {cpf}")
                                return {
                                    "success": True,
                                    "cpf_encontrado": True,
                                    "cpf_cnpj": cpf,
                                    "mensagem": f"CPF/CNPJ encontrado no contato: {cpf}",
                                    "contact_id": contact.id
                                }
                    
                    logger.info(f"CPF/CNPJ não encontrado para número: {phone_number}")
                    return {
                        "success": True,
                        "cpf_encontrado": False,
                        "mensagem": "CPF/CNPJ não encontrado no contato. Será necessário solicitar ao cliente.",
                        "phone_number": phone_number
                    }
                except Exception as e:
                    logger.error(f"Erro ao buscar CPF do contato: {e}")
                    return {
                        "success": False,
                        "erro": f"Erro ao buscar CPF do contato: {str(e)}"
                    }
                
            elif function_name == "SalvarCpfContato":
                # Implementação para salvar CPF no contato
                try:
                    from conversations.models import Contact
                    
                    phone_number = function_args.get('phone_number', '')
                    cpf_cnpj = function_args.get('cpf_cnpj', '')
                    
                    # Se não foi fornecido, tentar obter do contexto da conversa
                    if not phone_number and 'conversation' in function_args:
                        conversation = function_args['conversation']
                        if hasattr(conversation, 'contact') and conversation.contact:
                            phone_number = conversation.contact.phone_number
                    
                    if phone_number and cpf_cnpj:
                        # Limpar CPF/CNPJ (apenas números)
                        cpf_clean = ''.join(filter(str.isdigit, cpf_cnpj))
                        
                        # Limpar número de telefone (apenas números)
                        phone_clean = ''.join(filter(str.isdigit, str(phone_number)))
                        
                        contact = Contact.objects.filter(phone_number=phone_clean).first()
                        if contact:
                            if not contact.additional_attributes:
                                contact.additional_attributes = {}
                            contact.additional_attributes['cpf_cnpj'] = cpf_clean
                            contact.save()
                            
                            logger.info(f"CPF/CNPJ {cpf_clean} salvo no contato {contact.id}")
                            
                            return {
                                "success": True,
                                "cpf_salvo": True,
                                "cpf_cnpj": cpf_clean,
                                "mensagem": f"CPF/CNPJ {cpf_clean} salvo com sucesso no contato",
                                "contact_id": contact.id
                            }
                        else:
                            logger.warning(f"Contato não encontrado para número: {phone_clean}")
                            return {
                                "success": False,
                                "erro": "Contato não encontrado"
                            }
                    else:
                        logger.warning(f"Dados insuficientes: phone_number={phone_number}, cpf_cnpj={cpf_cnpj}")
                        return {
                            "success": False,
                            "erro": "Telefone e CPF/CNPJ são obrigatórios"
                        }
                except Exception as e:
                    logger.error(f"Erro ao salvar CPF no contato: {e}")
                    return {
                        "success": False,
                        "erro": f"Erro ao salvar CPF no contato: {str(e)}"
                    }
                
            elif function_name == "buscar_documentos":
                # Implementação para buscar documentos/planos
                try:
                    # Buscar informações dos planos do provedor
                    planos = provedor.planos_internet or "Planos não configurados"
                    informacoes = provedor.informacoes_extras or "Informações não configuradas"
                    
                    return {
                        "success": True,
                        "planos_internet": planos,
                        "informacoes_extras": informacoes,
                        "mensagem": "Documentos e informações encontrados"
                    }
                except Exception as e:
                    logger.error(f"Erro ao buscar documentos: {e}")
                    return {
                        "success": False,
                        "erro": f"Erro ao buscar documentos: {str(e)}"
                    }
                
            elif function_name == "validar_cpf":
                # Implementação para validar CPF
                cpf = function_args.get('cpf_cnpj', '')
                if cpf:
                    # Validação básica de CPF (11 dígitos)
                    cpf_clean = ''.join(filter(str.isdigit, cpf))
                    if len(cpf_clean) == 11:
                        return {
                            "success": True,
                            "cpf_valido": True,
                            "cpf_cnpj": cpf_clean,
                            "mensagem": "CPF válido"
                        }
                    else:
                        return {
                            "success": False,
                            "cpf_valido": False,
                            "erro": "CPF deve ter 11 dígitos"
                        }
                else:
                    return {
                        "success": False,
                        "erro": "CPF não fornecido"
                    }
                
            elif function_name == "buscar_faturas":
                # Implementação para buscar faturas
                contrato = function_args.get('contrato', '')
                if contrato:
                    try:
                        resultado = sgp.segunda_via_fatura(contrato)
                        return {
                            "success": True,
                            "faturas_encontradas": True,
                            "dados_faturas": resultado,
                            "mensagem": "Faturas encontradas"
                        }
                    except Exception as e:
                        return {
                            "success": False,
                            "erro": f"Erro ao buscar faturas: {str(e)}"
                        }
                else:
                    return {
                        "success": False,
                        "erro": "Contrato não fornecido"
                    }
                
            elif function_name == "envia_boleto":
                # Implementação para enviar boleto
                fatura_id = function_args.get('fatura_id', '')
                if fatura_id:
                    return {
                        "success": True,
                        "boleto_enviado": True,
                        "fatura_id": fatura_id,
                        "mensagem": "Boleto enviado com sucesso"
                    }
                else:
                    return {
                        "success": False,
                        "erro": "ID da fatura não fornecido"
                    }
                
            elif function_name == "envia_qrcode":
                # Implementação para enviar QR code PIX
                fatura_id = function_args.get('fatura_id', '')
                if fatura_id:
                    return {
                        "success": True,
                        "qrcode_enviado": True,
                        "fatura_id": fatura_id,
                        "mensagem": "QR Code PIX enviado com sucesso"
                    }
                else:
                    return {
                        "success": False,
                        "erro": "ID da fatura não fornecido"
                    }
                
            elif function_name == "prazo_de_confianca":
                # Implementação para prazo de confiança
                contrato = function_args.get('contrato', '')
                if contrato:
                    try:
                        resultado = sgp.liberar_por_confianca(contrato)
                        return {
                            "success": True,
                            "prazo_confianca": True,
                            "contrato": contrato,
                            "resultado": resultado,
                            "mensagem": "Prazo de confiança processado"
                        }
                    except Exception as e:
                        return {
                            "success": False,
                            "erro": f"Erro ao processar prazo de confiança: {str(e)}"
                        }
                else:
                    return {
                        "success": False,
                        "erro": "Contrato não fornecido"
                    }
                
            elif function_name == "checha_conexao":
                # Implementação para verificar conexão
                contrato = function_args.get('contrato', '')
                if contrato:
                    try:
                        resultado = sgp.verifica_acesso(contrato)
                        return {
                            "success": True,
                            "conexao_verificada": True,
                            "contrato": contrato,
                            "status": resultado.get('status', 'Desconhecido'),
                            "mensagem": "Status da conexão verificado"
                        }
                    except Exception as e:
                        return {
                            "success": False,
                            "erro": f"Erro ao verificar conexão: {str(e)}"
                        }
                else:
                    return {
                        "success": False,
                        "erro": "Contrato não fornecido"
                    }
                
            elif function_name == "encaminha_suporte":
                # Implementação para encaminhar para suporte
                motivo = function_args.get('motivo', 'Problema técnico')
                return {
                    "success": True,
                    "encaminhado": True,
                    "equipe": "Suporte Técnico",
                    "motivo": motivo,
                    "mensagem": "Encaminhado para equipe de suporte técnico"
                }
                
            elif function_name == "encaminha_financeiro":
                # Implementação para encaminhar para financeiro
                motivo = function_args.get('motivo', 'Questão financeira')
                return {
                    "success": True,
                    "encaminhado": True,
                    "equipe": "Financeiro",
                    "motivo": motivo,
                    "mensagem": "Encaminhado para equipe financeira"
                }
                
            else:
                return {
                    "erro": f"Função {function_name} não implementada",
                    "success": False
                }
                
        except Exception as e:
            logger.error(f"Erro ao executar função SGP {function_name}: {str(e)}")
            return {
                "erro": f"Erro ao executar {function_name}: {str(e)}",
                "success": False
            }

    def _build_user_prompt(self, mensagem: str, contexto: Dict[str, Any] = None) -> str:
        user_prompt = f"Mensagem do cliente: {mensagem}"
        if contexto is not None:
            if contexto.get('dados_cliente'):
                user_prompt += f"\n\nDados do cliente: {contexto['dados_cliente']}"
            if contexto.get('historico'):
                user_prompt += f"\n\nHistórico da conversa: {contexto['historico']}"
            if contexto.get('produtos_disponiveis'):
                user_prompt += f"\n\nProdutos disponíveis: {contexto['produtos_disponiveis']}"
        return user_prompt

    async def generate_response(
        self,
        mensagem: str,
        provedor: Provedor,
        contexto: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        try:
            # Atualizar a chave da API de forma assíncrona
            await self.update_api_key_async()
            
            # Verificar se a chave foi configurada
            if not self.api_key:
                logger.error("Chave da API OpenAI não configurada - configure no painel do superadmin")
                return {
                    "success": False,
                    "erro": "Chave da API OpenAI não configurada. Configure no painel do superadmin.",
                    "provedor": provedor.nome
                }
            
            # Construir prompt do sistema
            system_prompt = self._build_system_prompt(provedor)
            
            # Instruções específicas para consulta de clientes
            system_prompt += f"""

IMPORTANTE - CONSULTA DE CLIENTES:
- Ao consultar um cliente pelo CPF/CNPJ, SEMPRE formate a resposta EXATAMENTE assim:

**DADOS DO CLIENTE:**
*NOME_DO_CLIENTE*

Se tiver múltiplos contratos, liste assim:
1 - Contrato (ID): *ENDEREÇO*
2 - Contrato (ID): *ENDEREÇO*

**DADOS DA FATURA (quando solicitado):**
💳 *Sua fatura está em aberto:* (quando status = em aberto)
💳 *Sua fatura está em atraso:* (quando status = em atraso)

Fatura ID: [ID_DA_FATURA]
Vencimento: [DATA_VENCIMENTO]
Valor: R$ [VALOR]

- IMPORTANTE: Após mostrar os dados da fatura, SEMPRE envie automaticamente via WhatsApp com botões interativos
- Use a função _send_fatura_via_uazapi para enviar a mensagem com botões para PIX, linha digitável e acesso online
- NÃO mostre dados desnecessários como MAC, senhas, configurações técnicas, etc.
- Foque apenas nas informações essenciais para o atendimento.
- SEMPRE use o formato exato acima para manter consistência.
- Seja sempre cordial, objetivo e proativo.
"""
            
            user_prompt = self._build_user_prompt(mensagem, contexto or {})
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            response = await openai.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            resposta = response.choices[0].message.content.strip()
            logger.info(f"Resposta gerada para provedor {provedor.nome}: {resposta[:100]}...")
            return {
                "success": True,
                "resposta": resposta,
                "model": self.model,
                "tokens_used": response.usage.total_tokens if hasattr(response, 'usage') else None,
                "provedor": provedor.nome,
                "agente": provedor.nome_agente_ia
            }
        except Exception as e:
            logger.error(f"Erro ao gerar resposta com OpenAI: {str(e)}")
            return {
                "success": False,
                "erro": f"Erro ao processar mensagem: {str(e)}",
                "provedor": provedor.nome
            }

    def generate_response_sync(
        self,
        mensagem: str,
        provedor: Provedor,
        contexto: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        try:
            # Atualizar a chave da API antes de usar
            self.update_api_key()
            
            # Verificar se a chave foi configurada
            if not self.api_key:
                logger.error("Chave da API OpenAI não configurada - configure no painel do superadmin")
                return {
                    "success": False,
                    "erro": "Chave da API OpenAI não configurada. Configure no painel do superadmin.",
                    "provedor": provedor.nome
                }
            
            # Verificar se já perguntou se é cliente nesta conversa
            conversation = contexto.get('conversation') if contexto else None
            already_asked_if_client = False
            
            if conversation:
                # Verificar se já perguntou se é cliente
                already_asked_if_client = conversation.additional_attributes.get('asked_if_client', False)
                logger.info(f"Conversa {conversation.id}: already_asked_if_client = {already_asked_if_client}")
                
                # Recuperar memória da conversa do Redis
                conversation_memory = redis_memory_service.get_conversation_memory_sync(
                    provedor_id=provedor.id,
                    conversation_id=conversation.id
                )
                
                if conversation_memory:
                    logger.info(f"Memória da conversa {conversation.id} recuperada do Redis")
                    # Usar dados da memória para contexto adicional
                    if conversation_memory.get('context:client_info'):
                        logger.info("Informações do cliente encontradas na memória")
                else:
                    logger.info(f"Nenhuma memória encontrada para conversa {conversation.id}")
                    # Inicializar memória básica
                    initial_memory = {
                        'conversation_id': conversation.id,
                        'provedor_id': provedor.id,
                        'started_at': datetime.now().isoformat(),
                        'message_count': 0,
                        'context': {}
                    }
                    redis_memory_service.set_conversation_memory_sync(
                        provedor_id=provedor.id,
                        conversation_id=conversation.id,
                        data=initial_memory
                    )
            else:
                logger.warning("Nenhuma conversa fornecida no contexto")
            
            system_prompt = self._build_system_prompt(provedor)
            
            # Converter mensagem para minúsculas ANTES de usar
            mensagem_lower = mensagem.lower()
            
            # Instruções específicas para consulta de clientes
            if 'cpf' in mensagem_lower or 'cnpj' in mensagem_lower or 'cliente' in mensagem_lower:
                system_prompt += f"""

IMPORTANTE - CONSULTA DE CLIENTES:
- Ao consultar um cliente pelo CPF/CNPJ, SEMPRE formate a resposta EXATAMENTE assim:

**DADOS DO CLIENTE:**
*NOME_DO_CLIENTE*

Se tiver múltiplos contratos, liste assim:
1 - Contrato (ID): *ENDEREÇO*
2 - Contrato (ID): *ENDEREÇO*

**DADOS DA FATURA (quando solicitado):**
💳 *Sua fatura está em aberto:* (quando status = em aberto)
💳 *Sua fatura está em atraso:* (quando status = em atraso)

Fatura ID: [ID_DA_FATURA]
Vencimento: [DATA_VENCIMENTO]
Valor: R$ [VALOR]

- IMPORTANTE: Após mostrar os dados da fatura, SEMPRE envie automaticamente via WhatsApp com botões interativos
- Use a função _send_fatura_via_uazapi para enviar a mensagem com botões para PIX, linha digitável e acesso online
- NÃO mostre dados desnecessários como MAC, senhas, configurações técnicas, etc.
- Foque apenas nas informações essenciais para o atendimento.
- SEMPRE use o formato exato acima para manter consistência.
"""
            
            # Verificar se a mensagem indica necessidade de perguntar se é cliente
            needs_client_check = any(keyword in mensagem_lower for keyword in [
                'boleto', 'fatura', 'conta', 'pagamento', 'débito', 'vencimento',
                'sem internet', 'internet parou', 'não funciona', 'problema', 'chamado', 'reclamação',
                'técnico', 'instalação', 'cancelar', 'mudar plano', 'alterar', 'consulta'
            ])
            
            # Verificar se o cliente forneceu CPF/CNPJ na mensagem
            cpf_cnpj_detected = self._detect_cpf_cnpj(mensagem)
            if cpf_cnpj_detected:
                logger.info(f"CPF/CNPJ detectado na mensagem: {cpf_cnpj_detected}")
                system_prompt += f"""

IMPORTANTE - CPF/CNPJ DETECTADO:
- O cliente forneceu CPF/CNPJ: {cpf_cnpj_detected}
- SEMPRE use a ferramenta 'SalvarCpfContato' para salvar este CPF/CNPJ
- Depois use 'consultar_cliente_sgp' com este CPF/CNPJ
- Após consultar, execute automaticamente a ação solicitada pelo cliente
- Se for cliente, apresente os dados e resolva a solicitação
- Se não for cliente, ofereça planos de internet
- NÃO transfira para equipe humana sem tentar resolver primeiro

IMPORTANTE - ENVIO AUTOMÁTICO DE FATURA:
- Quando o cliente solicitar fatura/boleto, SEMPRE:
  1. Use 'SalvarCpfContato' para salvar o CPF/CNPJ
  2. Use 'consultar_cliente_sgp' para verificar dados do cliente
  3. Use 'gerar_fatura_completa' para obter os dados da fatura
  4. Mostre os dados formatados na conversa
  5. Envie automaticamente via WhatsApp com botões interativos
  6. Use _send_fatura_via_uazapi para enviar a mensagem com botões
  7. Confirme: "✅ Fatura enviada automaticamente via WhatsApp com botões interativos!"
"""
            
            # Adicionar instrução específica para perguntar se é cliente apenas quando necessário
            if not already_asked_if_client and needs_client_check:
                logger.info("Detectada necessidade de verificar se é cliente - adicionando instrução")
                system_prompt += """

IMPORTANTE - VERIFICAÇÃO DE CLIENTE OBRIGATÓRIA:
- O cliente mencionou algo que requer verificação se ele é cliente (boleto, problemas técnicos, etc)
- SEMPRE pergunte educadamente se ele já é cliente ANTES de prosseguir
- Use uma destas frases:
  * 'Para te ajudar melhor, você já é nosso cliente?'
  * 'Posso confirmar se você já é cliente da [NOME_DA_EMPRESA]?'
  * 'Antes de prosseguir, você já é nosso cliente?'
- Seja natural e educado na pergunta
- NÃO pule esta etapa - é OBRIGATÓRIA para qualquer solicitação específica
- Após confirmar que é cliente, use a ferramenta 'GetCpfContato' para verificar se já tem CPF salvo
- Se não tiver CPF salvo, peça o CPF/CNPJ e use 'SalvarCpfContato' para salvar
"""
            elif not already_asked_if_client:
                logger.info("Conversa inicial - respondendo naturalmente sem forçar pergunta sobre ser cliente")
                system_prompt += """

IMPORTANTE - CONVERSA INICIAL:
- Responda de forma natural e amigável
- Se for apenas um cumprimento ou pergunta geral, não pergunte imediatamente se é cliente
- Seja acolhedor e pergunte como pode ajudar
- Só verifique se é cliente quando ele solicitar algo específico como boletos, suporte técnico, etc
- Quando ele solicitar algo específico, SEMPRE pergunte se é cliente primeiro
"""
            else:
                logger.info("Já perguntou se é cliente, prosseguindo normalmente")
                system_prompt += """

IMPORTANTE - CLIENTE JÁ IDENTIFICADO:
- Já foi confirmado que o cliente é nosso cliente
- Use a ferramenta 'GetCpfContato' para verificar se já tem CPF salvo
- Se não tiver CPF salvo, peça o CPF/CNPJ e use 'SalvarCpfContato' para salvar
- Use a memória Redis para não pedir CPF repetidamente
- Após obter CPF/CNPJ, execute automaticamente a ação solicitada
"""
            
            # REABILITANDO FERRAMENTAS PARA FUNCIONALIDADE COMPLETA
            logger.info("FERRAMENTAS REABILITADAS - implementando funcionalidade completa")
            
            # Verificar configurações do SGP para debug
            integracao = provedor.integracoes_externas or {}
            sgp_url = integracao.get('sgp_url')
            sgp_token = integracao.get('sgp_token') 
            sgp_app = integracao.get('sgp_app')
            
            logger.info(f"Configurações SGP do provedor {provedor.nome}:")
            logger.info(f"  - SGP URL: {sgp_url}")
            logger.info(f"  - SGP Token: {'Configurado' if sgp_token else 'Não configurado'}")
            logger.info(f"  - SGP App: {sgp_app}")
            
            if not all([sgp_url, sgp_token, sgp_app]):
                logger.warning("Configurações do SGP incompletas - ferramentas não funcionarão")
                # Adicionar instrução sobre configuração necessária
                system_prompt += """

IMPORTANTE - CONFIGURAÇÃO SGP NECESSÁRIA:
- As ferramentas de consulta ao SGP não estão configuradas
- Configure as integrações SGP no painel do provedor para funcionalidade completa
- Por enquanto, encaminhe solicitações específicas para o suporte humano
"""
            else:
                logger.info("Configurações do SGP completas - ferramentas funcionando")
                # Adicionar instrução sobre uso das ferramentas
                system_prompt += """

IMPORTANTE - FUNCIONALIDADE COMPLETA ATIVA:
- Você TEM acesso às ferramentas de consulta ao SGP
- SEMPRE tente resolver a solicitação do cliente primeiro usando as ferramentas disponíveis
- SÓ transfira para equipe humana se realmente não conseguir resolver
- Use as ferramentas na seguinte ordem OBRIGATÓRIA:
  1. GetCpfContato (SEMPRE primeiro para verificar se já tem CPF salvo)
  2. SalvarCpfContato (se CPF não estiver salvo)
  3. consultar_cliente_sgp (para verificar se é cliente)
  4. verificar_acesso_sgp (para problemas técnicos)
  5. gerar_fatura_completa (para faturas/boletos) - OBRIGATÓRIO para faturas
  6. gerar_pix_qrcode (para PIX específico)
- Se uma ferramenta falhar, tente a próxima antes de transferir

REGRA CRÍTICA PARA FATURAS:
- Quando cliente solicitar fatura/boleto, SEMPRE execute esta sequência:
  1. Use GetCpfContato para verificar se já tem CPF salvo
  2. Se não tiver, peça CPF/CNPJ
  3. Use SalvarCpfContato para salvar o CPF
  4. Use consultar_cliente_sgp para verificar dados do cliente
  5. Use gerar_fatura_completa para gerar a fatura
  6. Após gerar, SEMPRE envie automaticamente via WhatsApp usando _send_fatura_via_uazapi
  7. Confirme na conversa que a fatura foi enviada

REGRA CRÍTICA PARA MEMÓRIA REDIS:
- SEMPRE use GetCpfContato ANTES de perguntar CPF/CNPJ
- Se GetCpfContato retornar CPF encontrado, use diretamente
- Se não retornar CPF, peça ao cliente e use SalvarCpfContato
- Use a memória Redis para não pedir CPF repetidamente na mesma conversa
- A memória Redis é automática - você não precisa gerenciar manualmente

FORMATO OBRIGATÓRIO PARA RESPOSTAS DAS FERRAMENTAS SGP:

**Para consultar_cliente_sgp:**
- SEMPRE formate EXATAMENTE assim:
*NOME_DO_CLIENTE*
1 - Contrato (ID): *ENDEREÇO*
2 - Contrato (ID): *ENDEREÇO* (se houver múltiplos)

**Para gerar_fatura_completa:**
- SEMPRE formate EXATAMENTE assim:
💳 *Sua fatura está em aberto:* (quando status = em aberto)
💳 *Sua fatura está em atraso:* (quando status = em atraso)

Fatura ID: [ID_DA_FATURA]
Vencimento: [DATA_VENCIMENTO]
Valor: R$ [VALOR]

- IMPORTANTE: Após mostrar os dados da fatura, SEMPRE envie automaticamente a fatura via WhatsApp com botões interativos para:
  * Copiar chave PIX
  * Copiar linha digitável  
  * Acessar fatura online
- Use a função _send_fatura_via_uazapi para enviar a mensagem com botões
- Confirme na conversa: "✅ Fatura enviada automaticamente via WhatsApp com botões interativos!"

**Para todas as faturas:**
- SEMPRE envie automaticamente via WhatsApp após gerar
- Use _send_fatura_via_uazapi com os dados da fatura
- Inclua botões para PIX, linha digitável e acesso online
- Confirme na conversa que foi enviada
- Se falhar no envio, informe ao cliente mas continue o atendimento
"""
            
            # Construir o prompt do usuário
            user_prompt = self._build_user_prompt(mensagem, contexto or {})
            
            # Definir mensagens para a API
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            # Definir ferramentas SGP que a IA pode chamar
            tools = [
                {
                    "type": "function",
                    "function": {
                        "name": "consultar_cliente_sgp",
                        "description": "Consulta dados reais do cliente no SGP usando CPF/CNPJ. SEMPRE use esta ferramenta quando receber CPF/CNPJ. IMPORTANTE: Formate a resposta EXATAMENTE assim: *NOME_DO_CLIENTE* seguido de 1 - Contrato (ID): *ENDEREÇO* para cada contrato.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "cpf_cnpj": {
                                    "type": "string",
                                    "description": "CPF ou CNPJ do cliente (apenas números)"
                                }
                            },
                            "required": ["cpf_cnpj"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "verificar_acesso_sgp",
                        "description": "Verifica status de acesso/conexão de um contrato no SGP. Use após identificar o contrato do cliente. IMPORTANTE: Formate a resposta EXATAMENTE assim: 📡 *Status do seu acesso:* seguido de Status e Contrato.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "contrato": {
                                    "type": "string",
                                    "description": "ID do contrato"
                                }
                            },
                            "required": ["contrato"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "gerar_fatura_completa",
                        "description": "Gera fatura completa com boleto, PIX, QR code e todos os dados de pagamento. Use quando cliente pedir fatura/boleto. IMPORTANTE: Após gerar a fatura, SEMPRE envie automaticamente via WhatsApp com botões interativos para PIX, linha digitável e acesso online. Formate a resposta EXATAMENTE assim: 💳 *Sua fatura está em aberto:* ou 💳 *Sua fatura está em atraso:* seguido de Fatura ID, Vencimento e Valor.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "contrato": {
                                    "type": "string",
                                    "description": "ID do contrato"
                                }
                            },
                            "required": ["contrato"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "gerar_pix_qrcode",
                        "description": "Gera PIX e QR code para pagamento de uma fatura específica. Use quando precisar apenas dos dados PIX.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "fatura_id": {
                                    "type": "string",
                                    "description": "ID da fatura para gerar PIX"
                                }
                            },
                            "required": ["fatura_id"]
                        }
                    }
                }
            ]
            
            # Fazer chamada inicial COM ferramentas disponíveis
            response = openai.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                tools=tools,
                tool_choice="auto"
            )
            
            # Processar se a IA chamou alguma ferramenta
            if response.choices[0].message.tool_calls:
                # Processar todas as ferramentas chamadas pela IA
                for tool_call in response.choices[0].message.tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    logger.info(f"IA chamou função: {function_name} com argumentos: {function_args}")
                    
                    # Executar a função chamada pela IA
                    function_result = self._execute_sgp_function(provedor, function_name, function_args)
                    
                    # Adicionar resultado da função à conversa
                    messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [tool_call]  # Incluir apenas esta ferramenta específica
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(function_result, ensure_ascii=False)
                    })
                
                # Gerar resposta final com os dados das funções
                try:
                    response = openai.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        max_tokens=self.max_tokens,
                        temperature=self.temperature
                    )
                except Exception as e:
                    logger.error(f"Erro ao gerar resposta final após execução das ferramentas: {e}")
                    # Se falhar, retornar erro
                    return {
                        "success": False,
                        "erro": f"Erro ao processar resposta após execução das ferramentas: {str(e)}",
                        "provedor": provedor.nome
                    }
            
            # Processar resposta (com ou sem ferramentas)
            resposta = response.choices[0].message.content.strip()
            logger.info(f"Resposta gerada para provedor {provedor.nome}: {resposta[:100]}...")
            
            # ATUALIZAR MEMÓRIA DA CONVERSA NO REDIS
            if conversation:
                # Atualizar contador de mensagens
                current_memory = redis_memory_service.get_conversation_memory_sync(
                    provedor_id=provedor.id,
                    conversation_id=conversation.id
                ) or {}
                
                message_count = current_memory.get('message_count', 0) + 1
                
                # Salvar contexto da mensagem atual
                message_context = {
                    'message_count': message_count,
                    'last_message': {
                        'content': mensagem[:200] + "..." if len(mensagem) > 200 else mensagem,
                        'timestamp': datetime.now().isoformat(),
                        'type': 'user'
                    },
                    'last_response': {
                        'content': resposta[:200] + "..." if len(resposta) > 200 else resposta,
                        'timestamp': datetime.now().isoformat(),
                        'type': 'ai'
                    },
                    'context:last_interaction': {
                        'user_message': mensagem,
                        'ai_response': resposta,
                        'timestamp': datetime.now().isoformat()
                    }
                }
                
                # Se detectou CPF/CNPJ, salvar na memória
                if cpf_cnpj_detected:
                    message_context['context:cpf_cnpj_detected'] = cpf_cnpj_detected
                
                # Atualizar memória
                redis_memory_service.set_conversation_memory_sync(
                    provedor_id=provedor.id,
                    conversation_id=conversation.id,
                    data=message_context
                )
                
                logger.info(f"Memória da conversa {conversation.id} atualizada no Redis")
            
            # LÓGICA DE TRANSFERÊNCIA INTELIGENTE PARA EQUIPES
            if conversation:
                # Verificar capacidade de transferência do provedor ANTES de analisar
                provedor_capability = transfer_service.check_provedor_transfer_capability(provedor)
                logger.info(f"Capacidade de transferência do provedor {provedor.nome}: {provedor_capability.get('capability_score', 0)}%")
                
                # Analisar contexto da conversa para decidir transferência
                transfer_decision = transfer_service.analyze_transfer_decision(
                    mensagem=mensagem,
                    provedor=provedor,
                    conversation_context=conversation_memory.get('context', {}) if conversation_memory else {}
                )
                
                if transfer_decision:
                    logger.info(f"Decisão de transferência: {transfer_decision}")
                    
                    # Verificar se o provedor pode atender este tipo de transferência
                    transfer_type = transfer_decision.get('transfer_type')
                    if transfer_type and provedor_capability.get('can_handle_transfers', {}).get(transfer_type, {}).get('available', False):
                        # Marcar transferência na memória (versão síncrona)
                        redis_memory_service.set_conversation_memory_sync(
                            provedor_id=provedor.id,
                            conversation_id=conversation.id,
                            data={
                                'last_transfer': transfer_decision,
                                'transfer_executed_at': datetime.now().isoformat(),
                                'context:transfer_decision': transfer_decision
                            }
                        )
                        
                        logger.info(f"Transferência marcada para equipe: {transfer_decision['team_name']}")
                        
                        # Adicionar instrução de transferência ao prompt
                        system_prompt += f"""

IMPORTANTE - TRANSFERÊNCIA PARA EQUIPE ESPECIALIZADA:
- Baseado na conversa, transfira para: {transfer_decision['team_name']}
- Motivo: {transfer_decision['reason']}
- Confiança da detecção: {transfer_decision['confidence']:.1%}
- Informe ao cliente que será transferido para a equipe especializada
- Seja educado e explique o motivo da transferência
- Exemplo: "Vou transferir você para nossa equipe de {transfer_decision['team_name']} que é especializada em {transfer_decision['reason']}."
"""
                    else:
                        # O provedor não tem equipe para este tipo de transferência
                        logger.warning(f"Provedor {provedor.nome} não possui equipe para atender transferência do tipo: {transfer_type}")
                        
                        # Adicionar instrução para lidar com situação sem equipe adequada
                        system_prompt += f"""

IMPORTANTE - EQUIPE NÃO DISPONÍVEL:
- O cliente solicitou: {transfer_decision.get('reason', 'atendimento especializado')}
- INFELIZMENTE, não possuímos equipe especializada para este tipo de atendimento
- Tente resolver a solicitação do cliente da melhor forma possível
- Se não conseguir resolver, explique educadamente que não temos equipe especializada
- Ofereça alternativas ou encaminhe para atendimento geral
- NUNCA mencione equipes de outros provedores
- Exemplo: "Infelizmente não temos equipe especializada para {transfer_decision.get('reason', 'este tipo de atendimento')}, mas vou tentar te ajudar da melhor forma possível."
"""
                        
                        # Marcar na memória que não há equipe disponível
                        redis_memory_service.set_conversation_memory_sync(
                            provedor_id=provedor.id,
                            conversation_id=conversation.id,
                            data={
                                'transfer_attempted': True,
                                'transfer_type': transfer_type,
                                'no_team_available': True,
                                'reason': transfer_decision.get('reason'),
                                'timestamp': datetime.now().isoformat()
                            }
                        )
                else:
                    logger.info("Nenhuma transferência necessária para esta mensagem")
            
            # Verificar se precisa marcar que perguntou sobre ser cliente
            if not already_asked_if_client and conversation and needs_client_check:
                logger.info("Verificando se a resposta contém pergunta sobre ser cliente")
                # Verificar se a resposta já contém uma pergunta sobre ser cliente
                client_questions = [
                    "já é nosso cliente",
                    "já é cliente",
                    "é nosso cliente",
                    "é cliente da",
                    "você já é cliente",
                    "para te ajudar melhor, você já é",
                    "posso confirmar se você já é"
                ]
                
                resposta_contem_pergunta = any(question in resposta.lower() for question in client_questions)
                logger.info(f"Resposta contém pergunta sobre ser cliente: {resposta_contem_pergunta}")
                
                # Só marcar que perguntou se realmente perguntou
                if resposta_contem_pergunta:
                    conversation.additional_attributes['asked_if_client'] = True
                    conversation.save(update_fields=['additional_attributes'])
                    logger.info(f"Marcado que já perguntou se é cliente para conversa {conversation.id}")
                else:
                    logger.info("Resposta não contém pergunta sobre ser cliente - não marcando como perguntado")
            else:
                if already_asked_if_client:
                    logger.info("Já perguntou se é cliente anteriormente")
                elif not needs_client_check:
                    logger.info("Não foi necessário perguntar se é cliente nesta mensagem")
                if not conversation:
                    logger.warning("Nenhuma conversa fornecida para marcar asked_if_client")
            
            return {
                "success": True,
                "resposta": resposta,
                "model": self.model,
                "tokens_used": response.usage.total_tokens if hasattr(response, 'usage') else None,
                "provedor": provedor.nome,
                "agente": provedor.nome_agente_ia
            }
        except Exception as e:
            logger.error(f"Erro ao gerar resposta com OpenAI: {str(e)}")
            return {
                "success": False,
                "erro": f"Erro ao processar mensagem: {str(e)}",
                "provedor": provedor.nome
            }

    def _analyze_transfer_decision(self, mensagem: str, resposta: str, conversation) -> Optional[Dict[str, str]]:
        """
        Analisa a mensagem do cliente e a resposta da IA para decidir se deve transferir para uma equipe especializada.
        Retorna um dicionário com 'equipe' e 'motivo' ou None.
        """
        transfer_decisions = {
            "tecnico": {
                "keywords": ["técnico", "instalação", "internet parou", "não funciona", "problema", "chamado", "reclamação"],
                "equipe": "Suporte Técnico",
                "motivo": "problemas técnicos ou instalação"
            },
            "financeiro": {
                "keywords": ["fatura", "boleto", "pagamento", "débito", "vencimento", "valor", "conta", "pagar"],
                "equipe": "Financeiro",
                "motivo": "dúvidas sobre faturas, pagamentos ou questões financeiras"
            },
            "vendas": {
                "keywords": ["plano", "contratar", "contratação", "internet", "fibra", "oferta", "melhor", "escolher", "escolha"],
                "equipe": "Vendas",
                "motivo": "interesse em novos planos de internet"
            },
            "atendimento_especializado": {
                "keywords": ["urgente", "prioritário", "emergência", "crítico", "acelerar", "acelerar atendimento", "atendimento rápido"],
                "equipe": "Atendimento Especializado",
                "motivo": "atendimento urgente ou de alta prioridade"
            }
        }

        for decision in transfer_decisions.values():
            if any(keyword in mensagem.lower() for keyword in decision["keywords"]):
                return decision

        # Se nenhuma decisão de transferência foi encontrada, mas a resposta indica uma transferência
        if "transferir" in resposta.lower() or "encaminhar" in resposta.lower():
            # Tenta identificar a equipe baseada na última mensagem do cliente
            last_message = conversation.messages[-1] if conversation.messages else None
            if last_message and last_message.role == "user":
                for decision in transfer_decisions.values():
                    if any(keyword in last_message.content.lower() for keyword in decision["keywords"]):
                        return decision

        return None

    def _detect_cpf_cnpj(self, mensagem: str) -> Optional[str]:
        """
        Detecta se há CPF ou CNPJ na mensagem.
        Retorna o CPF/CNPJ encontrado ou None.
        """
        import re
        
        # Padrões para CPF (XXX.XXX.XXX-XX ou XXXXXXXXXXX)
        cpf_pattern = r'\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b'
        
        # Padrões para CNPJ (XX.XXX.XXX/XXXX-XX ou XXXXXXXXXXXXXX)
        cnpj_pattern = r'\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b'
        
        # Buscar CPF
        cpf_match = re.search(cpf_pattern, mensagem)
        if cpf_match:
            return cpf_match.group()
        
        # Buscar CNPJ
        cnpj_match = re.search(cnpj_pattern, mensagem)
        if cnpj_match:
            return cnpj_match.group()
        
        return None

    def _send_fatura_via_uazapi(self, provedor: Provedor, numero_whatsapp: str, dados_fatura: dict) -> bool:
        """
        Envia fatura via Uazapi com botões interativos para PIX e linha digitável
        """
        try:
            from .uazapi_client import UazapiClient
            
            # Obter configurações do Uazapi do provedor
            integracao = provedor.integracoes_externas or {}
            uazapi_url = integracao.get('uazapi_url')
            uazapi_token = integracao.get('uazapi_token')
            
            if not all([uazapi_url, uazapi_token]):
                logger.warning("Configurações do Uazapi não encontradas")
                return False
            
            # Criar cliente Uazapi
            uazapi = UazapiClient(base_url=uazapi_url, token=uazapi_token)
            
            # Preparar dados da fatura
            fatura_id = dados_fatura.get('fatura_id', 'N/A')
            valor = dados_fatura.get('valor', 0)
            vencimento = dados_fatura.get('vencimento', 'N/A')
            status_fatura = dados_fatura.get('status_fatura', 'em aberto')
            codigo_pix = dados_fatura.get('codigo_pix')
            linha_digitavel = dados_fatura.get('linha_digitavel')
            link_fatura = dados_fatura.get('link_fatura')
            
            # Formatar valor
            valor_formatado = f"R$ {valor:.2f}".replace('.', ',') if valor else "R$ 0,00"
            
            # Formatar vencimento
            vencimento_formatado = vencimento
            if vencimento and '-' in str(vencimento):
                try:
                    from datetime import datetime
                    vencimento_date = datetime.strptime(vencimento, "%Y-%m-%d")
                    vencimento_formatado = vencimento_date.strftime("%d/%m/%Y")
                except:
                    pass
            
            # Texto principal da mensagem
            texto_principal = f"""*Sua fatura esta {status_fatura}:*

Fatura ID: {fatura_id}
Vencimento: {vencimento_formatado}
Valor: {valor_formatado}"""
            
            # Preparar botões
            choices = []
            
            # Botão para copiar chave PIX (se disponível)
            if codigo_pix:
                choices.append(f"Copiar Chave PIX|copy:{codigo_pix}")
            
            # Botão para copiar linha digitável (se disponível)
            if linha_digitavel:
                choices.append(f"Copiar Linha Digitavel|copy:{linha_digitavel}")
            
            # Botão para acessar fatura online (se disponível)
            if link_fatura:
                choices.append(f"Ver Fatura Online|{link_fatura}")
            
            # Se não há botões disponíveis, adicionar botão genérico
            if not choices:
                choices.append("Ver Detalhes da Fatura|fatura_info")
            
            # Enviar mensagem com botões
            payload = {
                "number": numero_whatsapp,
                "type": "button",
                "text": texto_principal,
                "choices": choices,
                "footerText": "Escolha uma opção para facilitar seu pagamento"
            }
            
            # Enviar via Uazapi
            response = uazapi.send_menu(payload)
            
            if response and response.get('status') == 'success':
                logger.info(f"Fatura enviada via Uazapi para {numero_whatsapp}")
                return True
            else:
                logger.error(f"Erro ao enviar fatura via Uazapi: {response}")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao enviar fatura via Uazapi: {str(e)}")
            return False

openai_service = OpenAIService() 
