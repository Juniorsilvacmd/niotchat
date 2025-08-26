"""
Serviço para buscar faturas via endpoint SGP e enviar via Uazapi
"""

import requests
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import json
from django.utils import timezone

logger = logging.getLogger(__name__)

class FaturaService:
    """Serviço para gerenciar faturas via SGP e Uazapi"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'NioChat/1.0'
        })

    def buscar_fatura_sgp(self, provedor, cpf_cnpj: str) -> Optional[Dict[str, Any]]:
        """
        Busca fatura no SGP via endpoint /api/ura/fatura2via/ usando CPF/CNPJ diretamente
        
        Args:
            provedor: Objeto Provedor com configurações SGP
            cpf_cnpj: CPF ou CNPJ do cliente para buscar fatura
            
        Returns:
            Dados da fatura ou None se erro
        """
        try:
            # Importar SGPClient para usar a mesma autenticação
            from .sgp_client import SGPClient
            
            # Obter configurações do SGP do provedor (dinâmicas por provedor)
            integracao = provedor.integracoes_externas or {}
            sgp_url = integracao.get('sgp_url')
            sgp_token = integracao.get('sgp_token')
            sgp_app = integracao.get('sgp_app')
            
            if not all([sgp_url, sgp_token, sgp_app]):
                logger.error("Configurações do SGP não encontradas no provedor")
                return None
            
            # Criar cliente SGP com as configurações dinâmicas do provedor
            sgp = SGPClient(
                base_url=sgp_url,
                token=sgp_token,
                app_name=sgp_app
            )
            
            logger.info(f"Buscando fatura no SGP via SGPClient para CPF/CNPJ: {cpf_cnpj}")
            
            # Usar o método do SGPClient que aceita CPF/CNPJ diretamente
            resultado = sgp.segunda_via_fatura(cpf_cnpj)
            
            if resultado and resultado.get('status') == 1:
                logger.info(f"Fatura encontrada para CPF/CNPJ: {cpf_cnpj}")
                return resultado
            else:
                logger.warning(f"Fatura não encontrada para CPF/CNPJ: {cpf_cnpj}: {resultado.get('msg', 'Sem mensagem')}")
                return None
                
        except Exception as e:
            logger.error(f"Erro ao buscar fatura via SGPClient: {e}")
            return None

    

    def _formatar_multiplas_faturas_vencidas(self, faturas_vencidas: list) -> str:
        """
        Formata mensagem para múltiplas faturas vencidas
        
        Args:
            faturas_vencidas: Lista de faturas vencidas
            
        Returns:
            Mensagem formatada
        """
        try:
            mensagem = "🚨 *ATENÇÃO: Você tem múltiplas faturas VENCIDAS!*\n\n"
            
            for i, fatura in enumerate(faturas_vencidas, 1):
                fatura_id = fatura.get('fatura', 'N/A')
                valor = fatura.get('valor', 0)
                
                # Priorizar vencimento_original, depois vencimento
                vencimento = fatura.get('vencimento_original') or fatura.get('vencimento', 'N/A')
                
                # Formatar valor
                valor_formatado = f"R$ {valor:.2f}".replace('.', ',') if valor else "R$ 0,00"
                
                # Formatar vencimento
                vencimento_formatado = vencimento
                if vencimento and '-' in str(vencimento):
                    try:
                        vencimento_date = datetime.strptime(vencimento, "%Y-%m-%d")
                        vencimento_formatado = vencimento_date.strftime("%d/%m/%Y")
                    except:
                        pass
                
                mensagem += f"*{i} - Fatura {fatura_id}:*\n"
                mensagem += f"   💰 Valor: {valor_formatado}\n"
                mensagem += f"   📅 Vencimento: {vencimento_formatado}\n"
                mensagem += f"   🔴 Status: VENCIDA\n\n"
            
            mensagem += "⚠️ *IMPORTANTE:* Faturas vencidas têm multa e juros!\n"
            mensagem += "Qual fatura você gostaria de pagar primeiro?\n"
            mensagem += "Responda com o número da fatura (ex: 1, 2, 3...)"
            
            return mensagem
            
        except Exception as e:
            logger.error(f"Erro ao formatar múltiplas faturas vencidas: {e}")
            return "Erro ao formatar dados das faturas vencidas"

    def _formatar_multiplas_faturas_abertas(self, faturas_abertas: list) -> str:
        """
        Formata mensagem para múltiplas faturas abertas
        
        Args:
            faturas_abertas: Lista de faturas abertas
            
        Returns:
            Mensagem formatada
        """
        try:
            mensagem = "📋 *Você tem múltiplas faturas em aberto:*\n\n"
            
            for i, fatura in enumerate(faturas_abertas, 1):
                fatura_id = fatura.get('fatura', 'N/A')
                valor = fatura.get('valor', 0)
                vencimento = fatura.get('vencimento', 'N/A')
                
                # Formatar valor
                valor_formatado = f"R$ {valor:.2f}".replace('.', ',') if valor else "R$ 0,00"
                
                # Formatar vencimento
                vencimento_formatado = vencimento
                if vencimento and '-' in str(vencimento):
                    try:
                        vencimento_date = datetime.strptime(vencimento, "%Y-%m-%d")
                        vencimento_formatado = vencimento_date.strftime("%d/%m/%Y")
                    except:
                        pass
                
                mensagem += f"*{i} - Fatura {fatura_id}:*\n"
                mensagem += f"   💰 Valor: {valor_formatado}\n"
                mensagem += f"   📅 Vencimento: {vencimento_formatado}\n"
                mensagem += f"   🟡 Status: Em aberto\n\n"
            
            mensagem += "Qual fatura você gostaria de pagar?\n"
            mensagem += "Responda com o número da fatura (ex: 1, 2, 3...)"
            
            return mensagem
            
        except Exception as e:
            logger.error(f"Erro ao formatar múltiplas faturas abertas: {e}")
            return "Erro ao formatar dados das faturas abertas"

    def enviar_fatura_uazapi(self, provedor, numero_whatsapp: str, dados_fatura: Dict[str, Any], conversation=None, tipo_pagamento: str = 'pix') -> bool:
        """
        Envia fatura completa via Uazapi: mensagem + QR code (PIX) ou PDF (Boleto) + botões apropriados
        E salva todas as mensagens no banco do Nio Chat
        
        Args:
            provedor: Objeto Provedor com configurações
            numero_whatsapp: Número do WhatsApp do cliente
            dados_fatura: Dados da fatura do SGP
            conversation: Objeto Conversation para salvar mensagens no banco
            tipo_pagamento: 'pix' ou 'boleto' - define quais botões enviar
            
        Returns:
            True se enviado com sucesso, False caso contrário
        """
        try:
            from .uazapi_client import UazapiClient
            from .qr_code_service import qr_code_service
            
            # Obter configurações do Uazapi do provedor (campos corretos)
            integracao = provedor.integracoes_externas or {}
            uazapi_url = integracao.get('whatsapp_url')  # Corrigido: whatsapp_url
            uazapi_token = integracao.get('whatsapp_token')  # Corrigido: whatsapp_token
            
            if not all([uazapi_url, uazapi_token]):
                logger.error(f"Configurações do Uazapi não encontradas. whatsapp_url: {uazapi_url}, whatsapp_token: {'Configurado' if uazapi_token else 'Não configurado'}")
                return False
            
            # Criar cliente Uazapi
            uazapi = UazapiClient(base_url=uazapi_url, token=uazapi_token)
            
            if not dados_fatura.get('links'):
                logger.error("Dados da fatura não contêm links de pagamento")
                return False
            
            # Pegar primeira fatura
            fatura = dados_fatura['links'][0]
            codigo_pix = fatura.get('codigopix')
            linha_digitavel = fatura.get('linhadigitavel')
            link_fatura = fatura.get('link')
            
            # 1. ENVIAR MENSAGEM ANTIGA DA FATURA (COMO NAS IMAGENS)
            fatura = dados_fatura.get('links', [{}])[0]
            fatura_id = fatura.get('fatura', 'N/A')
            vencimento = fatura.get('vencimento_original') or fatura.get('vencimento', 'N/A')
            valor = fatura.get('valor', 0)
            
            # Formatar vencimento para dd/mm/yyyy
            vencimento_formatado = vencimento
            if vencimento and '-' in str(vencimento):
                try:
                    vencimento_date = datetime.strptime(vencimento, "%Y-%m-%d")
                    vencimento_formatado = vencimento_date.strftime("%d/%m/%Y")
                except:
                    pass
            
            # Formatar valor
            valor_formatado = f"R$ {valor:.2f}".replace('.', ',') if valor else "R$ 0,00"
            
            # Determinar se está vencida
            status_vencimento = "está vencida" if vencimento else "está em aberto"
            if vencimento:
                try:
                    vencimento_date = datetime.strptime(vencimento, "%Y-%m-%d")
                    hoje = datetime.now()
                    if vencimento_date < hoje:
                        status_vencimento = "está vencida"
                    else:
                        status_vencimento = "está em aberto"
                except:
                    status_vencimento = "está em aberto"
            
            mensagem_fatura = f"💳 Sua fatura {status_vencimento}:\n\nFatura ID: {fatura_id}\nVencimento: {vencimento_formatado}\nValor: {valor_formatado}"
            
            resultado_mensagem = uazapi.enviar_mensagem(numero_whatsapp, mensagem_fatura)
            
            if not resultado_mensagem:
                logger.error("Falha ao enviar mensagem da fatura")
                return False
            
            # SALVAR MENSAGEM DA FATURA NO BANCO
            if conversation:
                try:
                    from conversations.models import Message
                    Message.objects.create(
                        conversation=conversation,
                        message_type='text',
                        content=mensagem_fatura,
                        is_from_customer=False,
                        created_at=timezone.now()
                    )
                    logger.info("✅ Mensagem da fatura salva no banco")
                except Exception as e:
                    logger.warning(f"Erro ao salvar mensagem da fatura no banco: {e}")
            
            # 2. ENVIAR QR CODE PIX (apenas para PIX) ou PDF BOLETO (apenas para Boleto)
            if tipo_pagamento == 'pix' and codigo_pix:
                # Gerar QR code PIX
                qr_code_bytes = qr_code_service.gerar_qr_code_pix_bytes(codigo_pix)
                
                if qr_code_bytes:
                    resultado_qr = uazapi.enviar_imagem(
                        numero=numero_whatsapp,
                        imagem_bytes=qr_code_bytes,
                        legenda="QR Code PIX para pagamento"
                    )
                    
                    if not resultado_qr:
                        logger.error("Falha ao enviar QR code PIX")
                        return False
                    
                    # SALVAR MENSAGEM DO QR CODE NO BANCO
                    if conversation:
                        try:
                            from conversations.models import Message
                            # Salvar como mensagem de imagem
                            Message.objects.create(
                                conversation=conversation,
                                message_type='image',
                                content="QR Code PIX para pagamento",
                                is_from_customer=False,
                                file_url=f"/api/media/qr_code_pix_{conversation.id}.png",
                                created_at=timezone.now()
                            )
                            logger.info("✅ Mensagem do QR Code salva no banco")
                        except Exception as e:
                            logger.warning(f"Erro ao salvar mensagem do QR Code no banco: {e}")
                else:
                    logger.warning("QR code PIX não pôde ser gerado")
                    return False
                    
            elif tipo_pagamento == 'boleto' and link_fatura:
                # Para Boleto: enviar PDF diretamente (sem mensagem extra)
                # Agora enviar o PDF do boleto diretamente via URL
                resultado_pdf = uazapi.enviar_documento(
                    numero=numero_whatsapp,
                    documento_url=link_fatura,
                    nome_arquivo=f"boleto_{fatura.get('fatura', 'N/A')}.pdf",
                    legenda="Boleto Bancário em PDF"
                )
                
                if resultado_pdf:
                    # SALVAR MENSAGEM DO PDF NO BANCO
                    if conversation:
                        try:
                            from conversations.models import Message
                            Message.objects.create(
                                conversation=conversation,
                                message_type='document',
                                content="📄 Boleto Bancário em PDF",
                                is_from_customer=False,
                                file_url=link_fatura,
                                created_at=timezone.now()
                            )
                            logger.info("✅ Mensagem do PDF do boleto salva no banco")
                        except Exception as e:
                            logger.warning(f"Erro ao salvar mensagem do PDF no banco: {e}")
                    
                    logger.info("✅ PDF do boleto enviado com sucesso")
                else:
                    logger.error("Falha ao enviar PDF do boleto")
                    return False
            
            # 3. ENVIAR BOTÕES INTERATIVOS APROPRIADOS PARA O TIPO DE PAGAMENTO
            choices = []
            
            if tipo_pagamento == 'pix' and codigo_pix:
                # Para PIX: apenas botão "Copiar Chave PIX"
                choices.append(f"Copiar Chave PIX|copy:{codigo_pix}")
                texto_botoes = "Clique para copiar a chave PIX:"
                footer_text = "Copie e cole o código no aplicativo do seu banco."
                
            elif tipo_pagamento == 'boleto' and linha_digitavel:
                # Para Boleto: apenas botão "Copiar Linha Digitável"
                choices.append(f"Copiar Linha Digitável|copy:{linha_digitavel}")
                texto_botoes = "Clique no botão para copiar a linha digitável:"
                footer_text = "Clique para copiar a linha digitável"
            
            # Enviar botões interativos se houver
            if choices:
                resultado_botoes = uazapi.enviar_menu(
                    numero=numero_whatsapp,
                    tipo="button",
                    texto=texto_botoes,
                    choices=choices,
                    footer_text=footer_text
                )
                
                if not resultado_botoes:
                    logger.error("Falha ao enviar botões interativos")
                    return False
                
                # SALVAR MENSAGEM DOS BOTÕES NO BANCO
                if conversation:
                    try:
                        from conversations.models import Message
                        # Salvar como mensagem com botões interativos
                        botao_texto = f"{texto_botoes}\n\n"
                        for choice in choices:
                            if "|" in choice:
                                nome, acao = choice.split("|", 1)
                                botao_texto += f"🔘 {nome}\n"
                        
                        botao_texto += f"\n{footer_text}"
                        
                        Message.objects.create(
                            conversation=conversation,
                            message_type='text',
                            content=botao_texto,
                            is_from_customer=False,
                            additional_attributes={
                                'has_buttons': True,
                                'button_choices': choices,
                                'is_interactive': True
                            },
                            created_at=timezone.now()
                        )
                        logger.info("✅ Mensagem dos botões interativos salva no banco")
                    except Exception as e:
                        logger.warning(f"Erro ao salvar mensagem dos botões no banco: {e}")
            
            logger.info(f"Fatura enviada com sucesso para {numero_whatsapp}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar fatura via Uazapi: {e}")
            return False

    def enviar_qr_code_pix(self, provedor, numero_whatsapp: str, dados_fatura: Dict[str, Any], conversation=None) -> bool:
        """
        Envia QR code PIX em mensagem separada
        
        Args:
            provedor: Objeto Provedor com configurações
            numero_whatsapp: Número do WhatsApp do cliente
            dados_fatura: Dados da fatura do SGP
            
        Returns:
            True se enviado com sucesso, False caso contrário
        """
        try:
            from .uazapi_client import UazapiClient
            from .qr_code_service import qr_code_service
            
            # Obter configurações do Uazapi do provedor (campos corretos)
            integracao = provedor.integracoes_externas or {}
            uazapi_url = integracao.get('whatsapp_url')  # Corrigido: whatsapp_url
            uazapi_token = integracao.get('whatsapp_token')  # Corrigido: whatsapp_token
            
            if not all([uazapi_url, uazapi_token]):
                logger.warning("Configurações do Uazapi não encontradas")
                return False
            
            # Criar cliente Uazapi
            uazapi = UazapiClient(base_url=uazapi_url, token=uazapi_token)
            
            if not dados_fatura.get('links'):
                logger.error("Dados da fatura não contêm links de pagamento")
                return False
            
            # Pegar primeira fatura
            fatura = dados_fatura['links'][0]
            codigo_pix = fatura.get('codigopix')
            
            if not codigo_pix:
                logger.warning("Código PIX não disponível para gerar QR code")
                return False
            
            # Gerar QR code PIX
            qr_code_bytes = qr_code_service.gerar_qr_code_pix_bytes(codigo_pix)
            
            if not qr_code_bytes:
                logger.error("Falha ao gerar QR code PIX")
                return False
            
            # Enviar imagem do QR code
            resultado = uazapi.enviar_imagem(
                numero=numero_whatsapp,
                imagem_bytes=qr_code_bytes,
                legenda="QR Code PIX para pagamento"
            )
            
            if resultado:
                # SALVAR MENSAGEM DO QR CODE NO BANCO
                if conversation:
                    try:
                        from conversations.models import Message
                        # Salvar como mensagem de imagem
                        Message.objects.create(
                            conversation=conversation,
                            message_type='image',
                            content="QR Code PIX para pagamento",
                            is_from_customer=False,
                            file_url=f"/api/media/qr_code_pix_{conversation.id}.png",
                            created_at=timezone.now()
                        )
                        logger.info("✅ Mensagem do QR Code PIX salva no banco")
                    except Exception as e:
                        logger.warning(f"Erro ao salvar mensagem do QR Code PIX no banco: {e}")
                
                logger.info(f"QR code PIX enviado via Uazapi para {numero_whatsapp}")
                return True
            else:
                logger.error(f"Erro ao enviar QR code via Uazapi")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao enviar QR code PIX: {str(e)}")
            return False

    def enviar_boleto_pdf(self, provedor, numero_whatsapp: str, dados_fatura: Dict[str, Any], conversation=None) -> bool:
        """
        Envia boleto em PDF via WhatsApp quando solicitado pela IA
        E salva todas as mensagens no banco do Nio Chat
        
        Args:
            provedor: Objeto Provedor com configurações
            numero_whatsapp: Número do WhatsApp do cliente
            dados_fatura: Dados da fatura do SGP
            conversation: Objeto Conversation para salvar mensagens no banco
            
        Returns:
            True se enviado com sucesso, False caso contrário
        """
        try:
            from .uazapi_client import UazapiClient
            
            # Obter configurações do Uazapi do provedor
            integracao = provedor.integracoes_externas or {}
            uazapi_url = integracao.get('whatsapp_url')
            uazapi_token = integracao.get('whatsapp_token')
            
            if not all([uazapi_url, uazapi_token]):
                logger.error("Configurações do Uazapi não encontradas")
                return False
            
            # Criar cliente Uazapi
            uazapi = UazapiClient(base_url=uazapi_url, token=uazapi_token)
            
            if not dados_fatura.get('links'):
                logger.error("Dados da fatura não contêm links de pagamento")
                return False
            
            # Pegar primeira fatura
            fatura = dados_fatura['links'][0]
            link_boleto = fatura.get('link')
            
            if not link_boleto:
                logger.warning("Link do boleto não disponível")
                return False
            
            # Enviar mensagem informando que o boleto será enviado
            mensagem_boleto = "📄 *Boleto Bancário*\n\nVou enviar o boleto em PDF para você agora."
            resultado_mensagem = uazapi.enviar_mensagem(numero_whatsapp, mensagem_boleto)
            
            if not resultado_mensagem:
                logger.error("Falha ao enviar mensagem sobre boleto")
                return False
            
            # SALVAR MENSAGEM DO BOLETO NO BANCO
            if conversation:
                try:
                    from conversations.models import Message
                    Message.objects.create(
                        conversation=conversation,
                        message_type='text',
                        content=mensagem_boleto,
                        is_from_customer=False,
                        created_at=timezone.now()
                    )
                    logger.info("✅ Mensagem do boleto salva no banco")
                except Exception as e:
                    logger.warning(f"Erro ao salvar mensagem do boleto no banco: {e}")
            
            # Enviar link do boleto (por enquanto como texto, pode ser implementado como PDF depois)
            mensagem_link = f"🔗 *Link do Boleto:*\n{link_boleto}\n\nClique no link para acessar o boleto completo."
            resultado_link = uazapi.enviar_mensagem(numero_whatsapp, mensagem_link)
            
            if resultado_link:
                # SALVAR MENSAGEM DO LINK DO BOLETO NO BANCO
                if conversation:
                    try:
                        from conversations.models import Message
                        Message.objects.create(
                            conversation=conversation,
                            message_type='text',
                            content=mensagem_link,
                            is_from_customer=False,
                            created_at=timezone.now()
                        )
                        logger.info("✅ Mensagem do link do boleto salva no banco")
                    except Exception as e:
                        logger.warning(f"Erro ao salvar mensagem do link do boleto no banco: {e}")
                
                logger.info(f"Boleto enviado via Uazapi para {numero_whatsapp}")
                return True
            else:
                logger.error("Falha ao enviar link do boleto")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao enviar boleto: {str(e)}")
            return False

    def processar_fatura_completa(self, provedor, cpf_cnpj: str, numero_whatsapp: str, preferencia_pagamento: str = None, conversation=None) -> Dict[str, Any]:
        """
        Processa fatura completa usando CPF/CNPJ diretamente no SGP
        
        Args:
            provedor: Objeto Provedor com configurações dinâmicas
            cpf_cnpj: CPF ou CNPJ do cliente para buscar fatura diretamente
            numero_whatsapp: Número do WhatsApp do cliente
            preferencia_pagamento: 'pix' ou 'boleto' - se None, pergunta ao cliente
            
        Returns:
            Dicionário com resultado do processamento
        """
        try:
            logger.info(f"Processando fatura completa para CPF/CNPJ: {cpf_cnpj}")
            
            # Importar SGPClient
            from .sgp_client import SGPClient
            
            # Obter configurações do SGP do provedor (dinâmicas por provedor)
            integracao = provedor.integracoes_externas or {}
            sgp_url = integracao.get('sgp_url')
            sgp_token = integracao.get('sgp_token')
            sgp_app = integracao.get('sgp_app')
            
            if not all([sgp_url, sgp_token, sgp_app]):
                return {
                    'success': False,
                    'error': 'Configurações do SGP não encontradas no provedor'
                }
            
            # Criar cliente SGP com configurações dinâmicas do provedor
            sgp = SGPClient(sgp_url, sgp_token, sgp_app)
            
            # Primeiro consultar o cliente para obter o ID do contrato
            dados_cliente = sgp.consultar_cliente(cpf_cnpj)
            
            if not dados_cliente or not dados_cliente.get('contratos'):
                return {
                    'success': False,
                    'error': 'Cliente não encontrado no SGP'
                }
            
            # Pegar o primeiro contrato (ou o ativo)
            contrato = dados_cliente['contratos'][0]
            contrato_id_real = contrato.get('contratoId')
            
            if not contrato_id_real:
                return {
                    'success': False,
                    'error': 'ID do contrato não encontrado'
                }
            
            logger.info(f"Cliente encontrado: {dados_cliente.get('razaoSocial')} - Contrato ID: {contrato_id_real}")
            
            # Agora buscar a fatura usando o ID real do contrato
            dados_fatura = sgp.segunda_via_fatura(contrato_id_real)
            
            if not dados_fatura or dados_fatura.get('status') != 1:
                return {
                    'success': False,
                    'error': 'Fatura não encontrada no SGP ou erro de autenticação'
                }
            
            if not dados_fatura or dados_fatura.get('status') != 1:
                return {
                    'success': False,
                    'error': 'Fatura não encontrada no SGP ou erro de autenticação'
                }
            
            # Classificar faturas entre vencidas e em aberto (SEMPRE priorizar vencidas)
            faturas = dados_fatura.get('links', [])
            faturas_vencidas = []
            faturas_abertas = []
            
            # Data atual para comparação
            from datetime import datetime
            data_atual = datetime.now()
            
            for f in faturas:
                vencimento_original = f.get('vencimento_original')
                
                # Verificar se a fatura está vencida comparando com a data atual
                if vencimento_original:
                    try:
                        # Converter vencimento_original para datetime
                        vencimento_date = datetime.strptime(vencimento_original, "%Y-%m-%d")
                        
                        # Se vencimento_original < data_atual, está vencida
                        if vencimento_date < data_atual:
                            faturas_vencidas.append(f)
                            logger.info(f"Fatura {f.get('fatura')} classificada como VENCIDA (vencimento: {vencimento_original})")
                        else:
                            faturas_abertas.append(f)
                            logger.info(f"Fatura {f.get('fatura')} classificada como ABERTA (vencimento: {vencimento_original})")
                    except Exception as e:
                        logger.warning(f"Erro ao processar vencimento da fatura {f.get('fatura')}: {e}")
                        # Em caso de erro, considerar como aberta
                        faturas_abertas.append(f)
                else:
                    # Se não tem vencimento_original, considerar como aberta
                    faturas_abertas.append(f)
                    logger.warning(f"Fatura {f.get('fatura')} sem vencimento_original")
            
            # LÓGICA INTELIGENTE PARA SELEÇÃO DE FATURAS
            if faturas_vencidas:
                # SEMPRE priorizar faturas vencidas
                if len(faturas_vencidas) == 1:
                    # Apenas uma fatura vencida
                    fatura_ativa = faturas_vencidas[0]
                    logger.info(f"Fatura vencida única selecionada: {fatura_ativa.get('fatura')}")
                    tipo_fatura = 'vencida_unica'
                else:
                    # Múltiplas faturas vencidas - usar a MAIS ANTIGA por padrão
                    # Ordenar por vencimento_original (mais antiga primeiro)
                    faturas_vencidas_ordenadas = sorted(faturas_vencidas, key=lambda x: x.get('vencimento_original', ''))
                    fatura_ativa = faturas_vencidas_ordenadas[0]  # Mais antiga
                    logger.info(f"Fatura vencida mais antiga selecionada: {fatura_ativa.get('fatura')} (vencimento: {fatura_ativa.get('vencimento_original')})")
                    tipo_fatura = 'vencida_multipla_mais_antiga'
                    
                    # Informar ao cliente que há múltiplas faturas vencidas
                    mensagem_multiplas = f"🔍 Encontrei {len(faturas_vencidas)} faturas vencidas. Vou enviar a mais antiga (Fatura {fatura_ativa.get('fatura')}) por padrão.\n\n"
                    mensagem_multiplas += "Se quiser ver todas as faturas vencidas, responda: 'mostrar todas'"
                    
                    # Atualizar dados_fatura com apenas a fatura mais antiga
                    dados_fatura['links'] = [fatura_ativa]
                    
            elif faturas_abertas:
                # Só usar faturas abertas se não houver vencidas
                if len(faturas_abertas) == 1:
                    fatura_ativa = faturas_abertas[0]
                    logger.info(f"Fatura aberta única selecionada: {fatura_ativa.get('fatura')}")
                    tipo_fatura = 'aberta_unica'
                else:
                    # Múltiplas faturas abertas - usar a primeira
                    fatura_ativa = faturas_abertas[0]
                    logger.info(f"Primeira fatura aberta selecionada: {fatura_ativa.get('fatura')}")
                    tipo_fatura = 'aberta_multipla'
                    
                    # Atualizar dados_fatura com apenas a primeira fatura aberta
                    dados_fatura['links'] = [fatura_ativa]
            else:
                # Nenhuma fatura encontrada
                return {
                    'success': True,
                    'fatura_encontrada': False,
                    'mensagem': '🎉 Parabéns! Você não possui nenhuma fatura no momento. Sua conta está em dia!'
                }
            
            # Se o cliente escolheu PIX, verificar se a fatura selecionada tem PIX
            if preferencia_pagamento and preferencia_pagamento.lower() == 'pix':
                # Buscar uma fatura que tenha PIX (priorizar vencidas)
                fatura_com_pix = None
                
                # Primeiro buscar nas vencidas
                for f in faturas_vencidas:
                    if f.get('codigopix'):
                        fatura_com_pix = f
                        break
                
                # Se não encontrou nas vencidas, buscar nas abertas
                if not fatura_com_pix:
                    for f in faturas_abertas:
                        if f.get('codigopix'):
                            fatura_com_pix = f
                            break
                
                if fatura_com_pix:
                    fatura_ativa = fatura_com_pix
                    logger.info(f"Fatura com PIX selecionada: {fatura_ativa.get('fatura')}")
                else:
                    return {
                        'success': False,
                        'error': 'Nenhuma fatura com PIX disponível encontrada'
                    }
            
            # Atualizar dados_fatura com apenas a fatura ativa
            dados_fatura['links'] = [fatura_ativa]
            
            # Se não especificou preferência, pergunta ao cliente de forma mais natural
            if not preferencia_pagamento:
                nome_cliente = dados_fatura.get('razaoSocial', 'Cliente')
                
                # Mensagem base
                mensagem_base = f'Perfeito, {nome_cliente}! '
                
                # Adicionar informação sobre múltiplas faturas se aplicável
                if tipo_fatura == 'vencida_multipla_mais_antiga':
                    mensagem_base += mensagem_multiplas + "\n\n"
                
                mensagem_base += "Como você prefere pagar: PIX ou Boleto?"
                
                return {
                    'success': True,
                    'fatura_encontrada': True,
                    'dados_fatura': dados_fatura,
                    'precisa_escolha': True,
                    'tipo_fatura': tipo_fatura,
                    'mensagem': mensagem_base
                }
            
            # Processar conforme preferência escolhida
            if preferencia_pagamento.lower() == 'pix':
                return self._enviar_fatura_pix(provedor, numero_whatsapp, dados_fatura, conversation)
            elif preferencia_pagamento.lower() == 'boleto':
                return self._enviar_fatura_boleto(provedor, numero_whatsapp, dados_fatura, conversation)
            else:
                return {
                    'success': False,
                    'error': 'Preferência de pagamento inválida. Use "pix" ou "boleto".'
                }
            
        except Exception as e:
            logger.error(f"Erro ao processar fatura completa: {str(e)}")
            return {
                'success': False,
                'error': f'Erro inesperado: {str(e)}'
            }

    def _enviar_fatura_pix(self, provedor, numero_whatsapp: str, dados_fatura: Dict[str, Any], conversation=None) -> Dict[str, Any]:
        """
        Envia fatura via PIX: mensagem + QR code + botão copiar chave PIX
        """
        try:
            from .uazapi_client import UazapiClient
            from .qr_code_service import qr_code_service
            
            # Obter configurações do Uazapi
            integracao = provedor.integracoes_externas or {}
            uazapi_url = integracao.get('whatsapp_url')
            uazapi_token = integracao.get('whatsapp_token')
            
            if not all([uazapi_url, uazapi_token]):
                return {
                    'success': False,
                    'error': 'Configurações do Uazapi não encontradas'
                }
            
            # Criar cliente Uazapi
            uazapi = UazapiClient(base_url=uazapi_url, token=uazapi_token)
            
            if not dados_fatura.get('links'):
                return {
                    'success': False,
                    'error': 'Dados da fatura não contêm links de pagamento'
                }
            
            # Pegar primeira fatura
            fatura = dados_fatura['links'][0]
            codigo_pix = fatura.get('codigopix')
            
            if not codigo_pix:
                return {
                    'success': False,
                    'error': 'Código PIX não disponível para esta fatura'
                }
            
            # Usar o método principal que já salva no banco (PIX)
            resultado = self.enviar_fatura_uazapi(provedor, numero_whatsapp, dados_fatura, conversation, 'pix')
            
            if resultado:
                return {
                    'success': True,
                    'fatura_enviada': True,
                    'tipo_pagamento': 'pix',
                    'dados_fatura': dados_fatura,
                    'mensagem': 'Fatura enviada via PIX com QR code e botão para copiar chave!'
                }
            else:
                return {
                    'success': False,
                    'error': 'Falha ao enviar fatura via PIX'
                }
                
        except Exception as e:
            logger.error(f"Erro ao enviar fatura PIX: {str(e)}")
            return {
                'success': False,
                'error': f'Erro ao enviar fatura PIX: {str(e)}'
            }

    def _enviar_fatura_boleto(self, provedor, numero_whatsapp: str, dados_fatura: Dict[str, Any], conversation=None) -> Dict[str, Any]:
        """
        Envia fatura via Boleto: mensagem + linha digitável + PDF + botão copiar linha digitável
        """
        try:
            from .uazapi_client import UazapiClient
            
            # Obter configurações do Uazapi
            integracao = provedor.integracoes_externas or {}
            uazapi_url = integracao.get('whatsapp_url')
            uazapi_token = integracao.get('whatsapp_token')
            
            if not all([uazapi_url, uazapi_token]):
                return {
                    'success': False,
                    'error': 'Configurações do Uazapi não encontradas'
                }
            
            # Criar cliente Uazapi
            uazapi = UazapiClient(base_url=uazapi_url, token=uazapi_token)
            
            if not dados_fatura.get('links'):
                return {
                    'success': False,
                    'error': 'Dados da fatura não contêm links de pagamento'
                }
            
            # Pegar primeira fatura
            fatura = dados_fatura['links'][0]
            linha_digitavel = fatura.get('linhadigitavel')
            link_boleto = fatura.get('link')
            
            if not linha_digitavel:
                return {
                    'success': False,
                    'error': 'Linha digitável não disponível para esta fatura'
                }
            
            # Usar o método principal que já salva no banco (BOLETO)
            resultado = self.enviar_fatura_uazapi(provedor, numero_whatsapp, dados_fatura, conversation, 'boleto')
            
            if resultado:
                return {
                    'success': True,
                    'fatura_enviada': True,
                    'tipo_pagamento': 'boleto',
                    'dados_fatura': dados_fatura,
                    'mensagem': 'Fatura enviada via Boleto com PDF e botão para copiar linha digitável!'
                }
            else:
                return {
                    'success': False,
                    'error': 'Falha ao enviar fatura via Boleto'
                }
                
        except Exception as e:
            logger.error(f"Erro ao enviar fatura Boleto: {str(e)}")
            return {
                'success': False,
                'error': f'Erro ao enviar fatura Boleto: {str(e)}'
            }

# Instância global do serviço
fatura_service = FaturaService() 