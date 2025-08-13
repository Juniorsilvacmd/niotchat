from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from core.models import Provedor, User, AuditLog
from .models import Contact, Inbox, Conversation, Message, Team, TeamMember
from .serializers import (
    ContactSerializer, InboxSerializer, ConversationSerializer,
    ConversationListSerializer, ConversationUpdateSerializer, MessageSerializer, TeamSerializer, TeamMemberSerializer
)
from rest_framework.permissions import AllowAny
from integrations.models import WhatsAppIntegration
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import requests
import json
import base64
from django.http import FileResponse, Http404, JsonResponse
from django.conf import settings
from django.utils import timezone
import os
from datetime import datetime


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'superadmin':
            return Contact.objects.all()
        else:
            provedores = Provedor.objects.filter(admins=user)
            if provedores.exists():
                return Contact.objects.filter(provedor__in=provedores)
            return Contact.objects.none()


class InboxViewSet(viewsets.ModelViewSet):
    queryset = Inbox.objects.all()
    serializer_class = InboxSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'superadmin':
            return Inbox.objects.all()
        else:
            provedores = Provedor.objects.filter(admins=user)
            if provedores.exists():
                return Inbox.objects.filter(provedor__in=provedores)
            return Inbox.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        request = self.request
        ip = request.META.get('REMOTE_ADDR') if hasattr(request, 'META') else None
        inbox = serializer.save()
        company_name = inbox.company.name if inbox.company else 'Desconhecida'
        from core.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action='create',
            ip_address=ip,
            details=f"Empresa {company_name} criou novo canal: {inbox.name}"
        )

    def perform_destroy(self, instance):
        user = self.request.user
        request = self.request
        ip = request.META.get('REMOTE_ADDR') if hasattr(request, 'META') else None
        company_name = instance.company.name if instance.company else 'Desconhecida'
        from core.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action='delete',
            ip_address=ip,
            details=f"Empresa {company_name} excluiu canal: {instance.name}"
        )
        instance.delete()


class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Superadmin vê todas as conversas
        if user.user_type == 'superadmin':
            return Conversation.objects.all()
        
        # Admin vê todas as conversas do seu provedor
        elif user.user_type == 'admin':
            provedores = Provedor.objects.filter(admins=user)
            if provedores.exists():
                return Conversation.objects.filter(inbox__provedor__in=provedores)
            return Conversation.objects.none()
        
        # Agent (atendente) - implementar permissões baseadas em equipes e permissões específicas
        else:
            # Buscar equipes do usuário
            user_teams = TeamMember.objects.filter(user=user).values_list('team_id', flat=True)
            
            if not user_teams.exists():
                # Se não está em nenhuma equipe, só vê conversas atribuídas a ele
                provedores = user.provedores_admin.all()
                if provedores.exists():
                    provedor = provedores.first()
                    return Conversation.objects.filter(assignee=user, inbox__provedor=provedor)
                else:
                    return Conversation.objects.filter(assignee=user)
            
            # Buscar provedores das equipes do usuário
            provedores_equipes = Team.objects.filter(id__in=user_teams).values_list('provedor_id', flat=True)
            
            # Verificar permissões específicas do usuário
            user_permissions = getattr(user, 'permissions', [])
            
            # Base: conversas do provedor das equipes do usuário
            base_queryset = Conversation.objects.filter(inbox__provedor_id__in=provedores_equipes)
            
            # Filtrar baseado nas permissões
            if 'view_ai_conversations' in user_permissions:
                # Pode ver conversas com IA (identificadas por algum campo ou atributo)
                ai_conversations = base_queryset.filter(
                    additional_attributes__has_key='ai_assisted'
                )
            else:
                # Não pode ver conversas com IA
                ai_conversations = Conversation.objects.none()
            
            if 'view_assigned_conversations' in user_permissions:
                # Pode ver conversas atribuídas a ele
                assigned_conversations = base_queryset.filter(assignee=user)
            else:
                assigned_conversations = Conversation.objects.none()
            
            if 'view_team_unassigned' in user_permissions:
                # Pode ver conversas não atribuídas da equipe dele
                team_unassigned = base_queryset.filter(assignee__isnull=True)
            else:
                team_unassigned = Conversation.objects.none()
            
            # Combinar todos os querysets permitidos
            final_queryset = ai_conversations | assigned_conversations | team_unassigned
            
            # Se não tem nenhuma permissão específica, só vê conversas atribuídas a ele
            if not user_permissions:
                final_queryset = base_queryset.filter(assignee=user)
            
            return final_queryset.distinct()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ConversationListSerializer
        elif self.action in ['update', 'partial_update']:
            return ConversationUpdateSerializer
        return ConversationSerializer
    
    def perform_create(self, serializer):
        user = self.request.user
        request = self.request
        ip = request.META.get('REMOTE_ADDR') if hasattr(request, 'META') else None
        conversation = serializer.save()
        from core.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action='create',
            ip_address=ip,
            details=f"Conversa criada: {conversation.contact.name}"
        )

    def perform_update(self, serializer):
        user = self.request.user
        request = self.request
        ip = request.META.get('REMOTE_ADDR') if hasattr(request, 'META') else None
        conversation = serializer.save()
        from core.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action='edit',
            ip_address=ip,
            details=f"Conversa atualizada: {conversation.contact.name}"
        )

    def perform_destroy(self, instance):
        user = self.request.user
        request = self.request
        ip = request.META.get('REMOTE_ADDR') if hasattr(request, 'META') else None
        from core.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action='delete',
            ip_address=ip,
            details=f"Conversa excluída: {instance.contact.name}"
        )
        instance.delete()

    @action(detail=False, methods=['get'])
    def recovery_stats(self, request):
        """Estatísticas do recuperador de conversas"""
        user = self.request.user
        provedor_id = request.query_params.get('provedor_id')
        
        if not provedor_id:
            return Response({'error': 'provedor_id é obrigatório'}, status=400)
        
        try:
            provedor = Provedor.objects.get(id=provedor_id)
        except Provedor.DoesNotExist:
            return Response({'error': 'Provedor não encontrado'}, status=404)
        
        # Verificar permissão
        if user.user_type != 'superadmin' and provedor not in Provedor.objects.filter(admins=user):
            return Response({'error': 'Sem permissão'}, status=403)
        
        # Buscar conversas do provedor
        conversations = Conversation.objects.filter(inbox__provedor=provedor)
        
        # Calcular estatísticas
        total_conversations = conversations.count()
        recovered_conversations = conversations.filter(
            additional_attributes__recovery_status='recovered'
        ).count()
        pending_recoveries = conversations.filter(
            additional_attributes__recovery_status='pending'
        ).count()
        
        conversion_rate = (recovered_conversations / total_conversations * 100) if total_conversations > 0 else 0
        
        # Calcular tempo médio de resposta (real)
        # Exemplo: calcular diferença entre lastAttempt e response_received_at das conversas recuperadas
        response_times = []
        for conv in conversations.filter(additional_attributes__recovery_status='recovered'):
            last_attempt = conv.additional_attributes.get('recovery_last_attempt')
            response_time = conv.additional_attributes.get('recovery_response_time')
            if last_attempt and response_time:
                try:
                    from datetime import datetime
                    fmt = '%Y-%m-%dT%H:%M:%S' if 'T' in last_attempt else '%Y-%m-%d %H:%M:%S'
                    t1 = datetime.strptime(last_attempt[:19], fmt)
                    t2 = datetime.strptime(response_time[:19], fmt)
                    diff = (t2 - t1).total_seconds()
                    response_times.append(diff)
                except Exception:
                    pass
        if response_times:
            avg_seconds = sum(response_times) / len(response_times)
            avg_min = int(avg_seconds // 60)
            avg_h = avg_min // 60
            avg_min = avg_min % 60
            average_response_time = f"{avg_h}h {avg_min}min" if avg_h else f"{avg_min}min"
        else:
            average_response_time = ''
        
        # Buscar conversas em recuperação
        recovery_conversations = conversations.filter(
            additional_attributes__recovery_status__in=['pending', 'recovered']
        ).select_related('contact')[:10]
        
        recovery_data = []
        for conv in recovery_conversations:
            recovery_data.append({
                'id': conv.id,
                'contact': {
                    'name': conv.contact.name,
                    'phone': conv.contact.phone
                },
                'lastMessage': conv.additional_attributes.get('recovery_last_message', ''),
                'status': conv.additional_attributes.get('recovery_status', 'pending'),
                'attempts': conv.additional_attributes.get('recovery_attempts', 0),
                'lastAttempt': conv.additional_attributes.get('recovery_last_attempt'),
                'potentialValue': conv.additional_attributes.get('recovery_potential_value', 0)
            })
        
        return Response({
            'stats': {
                'totalAttempts': total_conversations,
                'successfulRecoveries': recovered_conversations,
                'pendingRecoveries': pending_recoveries,
                'conversionRate': round(conversion_rate, 1),
                'averageResponseTime': average_response_time
            },
            'conversations': recovery_data
        })

    @action(detail=False, methods=['post'])
    def recovery_settings(self, request):
        """Salvar configurações do recuperador"""
        user = self.request.user
        provedor_id = request.data.get('provedor_id')
        
        if not provedor_id:
            return Response({'error': 'provedor_id é obrigatório'}, status=400)
        
        try:
            provedor = Provedor.objects.get(id=provedor_id)
        except Provedor.DoesNotExist:
            return Response({'error': 'Provedor não encontrado'}, status=404)
        
        # Verificar permissão
        if user.user_type != 'superadmin' and provedor not in Provedor.objects.filter(admins=user):
            return Response({'error': 'Sem permissão'}, status=403)
        
        # Salvar configurações (mockado por enquanto)
        settings = {
            'enabled': request.data.get('enabled', True),
            'delayMinutes': request.data.get('delayMinutes', 30),
            'maxAttempts': request.data.get('maxAttempts', 3),
            'autoDiscount': request.data.get('autoDiscount', False),
            'discountPercentage': request.data.get('discountPercentage', 10)
        }
        
        # Aqui você salvaria as configurações no banco
        # Por enquanto, apenas retorna sucesso
        return Response({'message': 'Configurações salvas com sucesso'})

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        conversation = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            new_assignee = User.objects.get(id=user_id)
            # Remover assignee para deixar como "não atribuída"
            conversation.assignee = None
            # Mudar status para 'pending' (Em Espera) quando transferir
            conversation.status = 'pending'
            conversation.save()
            return Response({'success': True})
        except User.DoesNotExist:
            return Response({'error': 'Usuário não encontrado'}, status=status.HTTP_404_NOT_FOUND)





def send_media_via_uazapi(conversation, file_url, media_type, caption):
    """
    Envia mídia via Uazapi usando a URL do arquivo ou base64
    """
    try:
        # Iniciando envio de mídia
        
        # Log específico para PTT
        # Determinar tipo de mídia
        
        # Obter credenciais do provedor
        provedor = conversation.inbox.provedor
        uazapi_token = None
        uazapi_url = None
        
        # Buscar na integração WhatsApp primeiro
        whatsapp_integration = WhatsAppIntegration.objects.filter(provedor=provedor).first()
        if whatsapp_integration:
            uazapi_token = whatsapp_integration.access_token
            uazapi_url = (
                whatsapp_integration.settings.get('whatsapp_url')
                if whatsapp_integration.settings else None
            )
            # NÃO usar webhook_url como fallback - é a URL local para receber webhooks
            # if not uazapi_url:
            #     uazapi_url = whatsapp_integration.webhook_url
            # URL da integração WhatsApp
        else:
            # Fallback para integracoes_externas
            if not uazapi_token or uazapi_token == '':
                integracoes = provedor.integracoes_externas or {}
                uazapi_token = integracoes.get('whatsapp_token')
            if not uazapi_url or uazapi_url == '':
                integracoes = provedor.integracoes_externas or {}
                uazapi_url = integracoes.get('whatsapp_url')
        
        if not uazapi_token or not uazapi_url:
            return False, "Token ou URL do Uazapi não configurados"
        
        # Garantir que a URL termina com /send/media
        if uazapi_url and not uazapi_url.endswith('/send/media'):
            uazapi_url = uazapi_url.rstrip('/') + '/send/media'
        
        # Obter número do contato
        contact = conversation.contact
        sender_lid = contact.additional_attributes.get('sender_lid')
        chatid = contact.additional_attributes.get('chatid')
        
        # Verificar se não estamos enviando para o número conectado
        instance = conversation.inbox.additional_attributes.get('instance')
        if instance:
            clean_instance = instance.replace('@s.whatsapp.net', '').replace('@c.us', '')
            clean_chatid = chatid.replace('@s.whatsapp.net', '').replace('@c.us', '') if chatid else ''
            clean_sender_lid = sender_lid.replace('@lid', '').replace('@c.us', '') if sender_lid else ''
            
            if (clean_chatid == clean_instance) or (clean_sender_lid == clean_instance):
                return False, "Não é possível enviar mensagens para o número conectado na instância"
        
        # Usar APENAS chatid, ignorar sender_lid
        success = False
        send_result = None
        
        if chatid:
            try:
                # Converter URL para base64 se necessário
                file_base64 = None
                
                # Se file_url é uma URL local, ler o arquivo e converter para base64
                if file_url.startswith('/api/media/'):
                    # Construir caminho completo do arquivo
                    file_path = file_url.replace('/api/media/messages/', '')
                    conversation_id, filename = file_path.split('/', 1)
                    full_path = os.path.join(settings.MEDIA_ROOT, 'messages', conversation_id, filename)
                    
                    if os.path.exists(full_path):
                        with open(full_path, 'rb') as f:
                            file_data = f.read()
                            file_base64 = base64.b64encode(file_data).decode('utf-8')
                    else:
                        return False, f"Arquivo não encontrado: {full_path}"
                elif file_url.startswith('data:'):
                    # Já é base64
                    file_base64 = file_url
                else:
                    # URL externa, tentar baixar
                    try:
                        response = requests.get(file_url, timeout=30)
                        if response.status_code == 200:
                            file_base64 = base64.b64encode(response.content).decode('utf-8')
                        else:
                            return False, f"Erro ao baixar arquivo: {response.status_code}"
                    except Exception as e:
                        return False, f"Erro ao baixar arquivo: {str(e)}"
                
                # Formato correto da API Uazapi para mídia
                payload = {
                    'number': chatid,
                    'type': media_type,
                    'file': file_base64
                }
                
                # Para PTT (mensagens de voz), NÃO enviar caption
                if caption and media_type != 'ptt':
                    payload['caption'] = caption
                
                response = requests.post(
                    uazapi_url,
                    headers={'token': uazapi_token, 'Content-Type': 'application/json'},
                    json=payload,
                    timeout=30  # Timeout maior para upload de mídia
                )
                
                print(f"DEBUG: Status code = {response.status_code}")
                print(f"DEBUG: Response = {response.text}")
                
                if response.status_code == 200:
                    send_result = response.json() if response.content else response.status_code
                    success = True
                    print(f"DEBUG: Mídia enviada com sucesso para {chatid}")
                else:
                    print(f"DEBUG: Erro na API Uazapi - Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                print(f' DEBUG: Erro ao enviar mídia para {chatid}: {e}')
        else:
            print(f"DEBUG: Nenhum chatid encontrado para envio")
        
        if success:
            return True, f"Mídia enviada com sucesso: {send_result}"
        else:
            return False, f"Erro na Uazapi: Falha ao enviar mídia para chatid"
            
    except Exception as e:
        print(f"DEBUG: Erro geral: {e}")
        return False, f"Erro ao enviar mídia via Uazapi: {str(e)}"


def send_via_uazapi(conversation, content, message_type, instance, reply_to_message_id=None):
    """
    Envia mensagem via Uazapi usando a mesma lógica da IA
    """
    try:
        # Obter credenciais do provedor (mesma lógica da IA)
        provedor = conversation.inbox.provedor
        uazapi_token = None
        uazapi_url = None
        
        # Buscar na integração WhatsApp primeiro
        whatsapp_integration = WhatsAppIntegration.objects.filter(provedor=provedor).first()
        if whatsapp_integration:
            uazapi_token = whatsapp_integration.access_token
            uazapi_url = (
                whatsapp_integration.settings.get('whatsapp_url')
                if whatsapp_integration.settings else None
            )
            # NÃO usar webhook_url como fallback - é a URL local para receber webhooks
            # if not uazapi_url:
            #     uazapi_url = whatsapp_integration.webhook_url
        
        # Fallback para integracoes_externas
        if not uazapi_token or uazapi_token == '':
            integracoes = provedor.integracoes_externas or {}
            uazapi_token = integracoes.get('whatsapp_token')
        if not uazapi_url or uazapi_url == '':
            integracoes = provedor.integracoes_externas or {}
            uazapi_url = integracoes.get('whatsapp_url')
        
        if not uazapi_token or not uazapi_url:
            return False, "Token ou URL do Uazapi não configurados"
        
        # Garantir que a URL termina com /send/text
        if uazapi_url and not uazapi_url.endswith('/send/text'):
            uazapi_url = uazapi_url.rstrip('/') + '/send/text'
        
        print(f"DEBUG: Token final: {uazapi_token[:10] if uazapi_token else 'None'}...")
        print(f"DEBUG: URL final: {uazapi_url}")
        
        # Obter número do contato (mesma lógica da IA)
        contact = conversation.contact
        sender_lid = contact.additional_attributes.get('sender_lid')
        chatid = contact.additional_attributes.get('chatid')
        
        # Verificar se não estamos enviando para o número conectado
        instance = conversation.inbox.additional_attributes.get('instance')
        if instance:
            clean_instance = instance.replace('@s.whatsapp.net', '').replace('@c.us', '')
            clean_chatid = chatid.replace('@s.whatsapp.net', '').replace('@c.us', '') if chatid else ''
            clean_sender_lid = sender_lid.replace('@lid', '').replace('@c.us', '') if sender_lid else ''
            
            if (clean_chatid == clean_instance) or (clean_sender_lid == clean_instance):
                return False, "Não é possível enviar mensagens para o número conectado na instância"
        
        # Usar APENAS chatid, ignorar sender_lid
        success = False
        send_result = None
        
        if chatid:
            try:
                # Formato correto da API Uazapi
                payload = {
                    'number': chatid,
                    'text': content
                }
                
                # Adicionar informações de resposta se existir
                if reply_to_message_id:
                    # Formato correto para Uazapi - usar replyid conforme documentação
                    print(f"DEBUG: Tentando enviar resposta com replyid: {reply_to_message_id}")
                    
                    # Formato correto para Uazapi - usar apenas o ID da mensagem
                    if isinstance(reply_to_message_id, str):
                        # Se o ID contém ":", pegar apenas a parte após ":"
                        if ':' in reply_to_message_id:
                            short_id = reply_to_message_id.split(':', 1)[1]
                            payload['replyid'] = short_id
                            print(f"DEBUG: Usando short_id para replyid: {short_id}")
                        else:
                            payload['replyid'] = reply_to_message_id
                            print(f"DEBUG: Usando ID completo para replyid: {reply_to_message_id}")
                    
                    # Log do payload completo para debug
                    print(f"DEBUG: Payload completo: {payload}")
                    
                    # Log adicional para debug do formato
                    print(f"DEBUG: Tipo do reply_to_message_id: {type(reply_to_message_id)}")
                    print(f"DEBUG: Valor do reply_to_message_id: {repr(reply_to_message_id)}")
                    
                    # Tentar formato alternativo se o primeiro falhar
                    # Algumas APIs esperam um objeto com mais informações
                    if isinstance(reply_to_message_id, str) and ':' in reply_to_message_id:
                        # Se o ID contém ":", pode ser necessário apenas a parte após ":"
                        short_id = reply_to_message_id.split(':', 1)[1]
                        print(f"DEBUG: Tentando formato alternativo com short_id: {short_id}")
                        # Não alterar o payload ainda, apenas log para debug
                print(f"DEBUG: Enviando para URL: {uazapi_url}")
                print(f"DEBUG: Token: {uazapi_token[:10] if uazapi_token else 'None'}...")
                
                response = requests.post(
                    uazapi_url,
                    headers={'token': uazapi_token, 'Content-Type': 'application/json'},
                    json=payload,
                    timeout=10
                )
                
                print(f"DEBUG: Status code: {response.status_code}")
                print(f"DEBUG: Response text: {response.text}")
                
                if response.status_code == 200:
                    send_result = response.json() if response.content else response.status_code
                    success = True
                    print(f"DEBUG: Mensagem enviada com sucesso: {send_result}")
                else:
                    send_result = f"Erro na API Uazapi: {response.status_code} - {response.text}"
                    print(f"DEBUG: Erro ao enviar mensagem: {send_result}")
            except Exception as e:
                send_result = f"Erro ao enviar: {str(e)}"
        else:
            send_result = "Nenhum chatid encontrado para envio"
        
        if success:
            return True, f"Mensagem enviada com sucesso: {send_result}"
        else:
            return False, f"Erro na Uazapi: Falha ao enviar para chatid"
            
    except Exception as e:
        return False, f"Erro ao enviar via Uazapi: {str(e)}"


def send_presence_via_uazapi(conversation, presence_type):
    """
    Envia indicador de presença (digitando) via Uazapi
    """
    try:
        # Obter credenciais do provedor (mesma lógica da IA)
        provedor = conversation.inbox.provedor
        uazapi_token = None
        uazapi_url = None
        
        # Buscar na integração WhatsApp primeiro
        whatsapp_integration = WhatsAppIntegration.objects.filter(provedor=provedor).first()
        if whatsapp_integration:
            uazapi_token = whatsapp_integration.access_token
            uazapi_url = (
                whatsapp_integration.settings.get('whatsapp_url')
                if whatsapp_integration.settings else None
            )
            # NÃO usar webhook_url como fallback - é a URL local para receber webhooks
            # if not uazapi_url:
            #     uazapi_url = whatsapp_integration.webhook_url
        
        # Fallback para integracoes_externas
        if not uazapi_token or uazapi_token == '':
            integracoes = provedor.integracoes_externas or {}
            uazapi_token = integracoes.get('whatsapp_token')
        if not uazapi_url or uazapi_url == '':
            integracoes = provedor.integracoes_externas or {}
            uazapi_url = integracoes.get('whatsapp_url')
        
        if not uazapi_token or not uazapi_url:
            return False, "Token ou URL do Uazapi não configurados"
        
        # Garantir que a URL termina com /message/presence
        if uazapi_url and not uazapi_url.endswith('/message/presence'):
            uazapi_url = uazapi_url.rstrip('/') + '/message/presence'
        
        print(f"DEBUG: URL da Uazapi para presença: {uazapi_url}")
        print(f"DEBUG: Token da Uazapi: {uazapi_token[:10] if uazapi_token else 'None'}...")
        print(f"DEBUG: sender_lid: {sender_lid}")
        print(f"DEBUG: chatid: {chatid}")
        print(f"DEBUG: URL base original: {whatsapp_integration.webhook_url if whatsapp_integration else 'None'}")
        print(f"DEBUG: Provedor: {provedor.nome if provedor else 'None'}")
        print(f"DEBUG: Integrações externas: {provedor.integracoes_externas if provedor else 'None'}")
        
        # Obter número do contato (mesma lógica da IA)
        contact = conversation.contact
        sender_lid = contact.additional_attributes.get('sender_lid')
        chatid = contact.additional_attributes.get('chatid')
        
        # Tentar enviar para ambos os números como a IA faz
        success = False
        send_result = None
        
        for destino in [sender_lid, chatid]:
            if not destino:
                continue
            try:
                # Formato correto da API Uazapi para presença
                # Mapear presence_type para o formato da Uazapi
                uazapi_presence = 'composing' if presence_type == 'typing' else presence_type
                
                payload = {
                    'number': destino,
                    'presence': uazapi_presence,  # composing, recording, paused
                    'delay': 2000  # 2 segundos de duração
                }
                response = requests.post(
                    uazapi_url,
                    headers={'token': uazapi_token, 'Content-Type': 'application/json'},
                    json=payload,
                    timeout=10
                )
                if response.status_code == 200:
                    send_result = response.json() if response.content else response.status_code
                    success = True
                    print(f"DEBUG: Presença enviada com sucesso para {destino}: {presence_type}")
                    break
                else:
                    print(f"DEBUG: Erro na API Uazapi (presença) - Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                print(f'[ERRO] Erro ao enviar presença para {destino}: {e}')
                continue
        
        if success:
            return True, f"Presença enviada com sucesso: {send_result}"
        else:
            return False, f"Erro na Uazapi: Falha ao enviar presença para todos os destinos"
            
    except Exception as e:
        return False, f"Erro ao enviar presença via Uazapi: {str(e)}"


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Filtrar por conversa específica se fornecido
        conversation_id = self.request.query_params.get('conversation')
        if conversation_id:
            queryset = Message.objects.filter(conversation_id=conversation_id)
        else:
            # Superadmin vê todas as mensagens
            if user.user_type == 'superadmin':
                queryset = Message.objects.all()
            
            # Admin vê todas as mensagens do seu provedor
            elif user.user_type == 'admin':
                provedores = Provedor.objects.filter(admins=user)
                if provedores.exists():
                    queryset = Message.objects.filter(conversation__inbox__provedor__in=provedores)
                else:
                    queryset = Message.objects.none()
            
            # Agent (atendente) - implementar permissões baseadas em equipes e permissões específicas
            else:
                # Buscar equipes do usuário
                user_teams = TeamMember.objects.filter(user=user).values_list('team_id', flat=True)
                
                if not user_teams.exists():
                    # Se não está em nenhuma equipe, só vê mensagens de conversas atribuídas a ele
                    queryset = Message.objects.filter(conversation__assignee=user)
                else:
                    # Buscar provedores das equipes do usuário
                    provedores_equipes = Team.objects.filter(id__in=user_teams).values_list('provedor_id', flat=True)
                    
                    # Verificar permissões específicas do usuário
                    user_permissions = getattr(user, 'permissions', [])
                    
                    # Base: mensagens de conversas do provedor das equipes do usuário
                    base_queryset = Message.objects.filter(conversation__inbox__provedor_id__in=provedores_equipes)
                    
                    # Filtrar baseado nas permissões
                    if 'view_ai_conversations' in user_permissions:
                        # Pode ver mensagens de conversas com IA
                        ai_messages = base_queryset.filter(
                            conversation__additional_attributes__has_key='ai_assisted'
                        )
                    else:
                        ai_messages = Message.objects.none()
                    
                    if 'view_assigned_conversations' in user_permissions:
                        # Pode ver mensagens de conversas atribuídas a ele
                        assigned_messages = base_queryset.filter(conversation__assignee=user)
                    else:
                        assigned_messages = Message.objects.none()
                    
                    if 'view_team_unassigned' in user_permissions:
                        # Pode ver mensagens de conversas não atribuídas da equipe dele
                        team_unassigned_messages = base_queryset.filter(conversation__assignee__isnull=True)
                    else:
                        team_unassigned_messages = Message.objects.none()
                    
                    # Combinar todos os querysets permitidos
                    queryset = ai_messages | assigned_messages | team_unassigned_messages
                    
                    # Se não tem nenhuma permissão específica, só vê mensagens de conversas atribuídas a ele
                    if not user_permissions:
                        queryset = base_queryset.filter(conversation__assignee=user)
        
        # Ordenar por data de criação (mais antigas primeiro)
        return queryset.order_by('created_at')
    
    def perform_create(self, serializer):
        serializer.save(is_from_customer=False)

    @action(detail=False, methods=['post'])
    def send_text(self, request):
        """Enviar mensagem de texto"""
        conversation_id = request.data.get('conversation_id')
        content = request.data.get('content')
        reply_to_message_id = request.data.get('reply_to_message_id')
        reply_to_content = request.data.get('reply_to_content')
        
        if not conversation_id or not content:
            return Response({'error': 'conversation_id e content são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            
            # Preparar additional_attributes
            additional_attrs = {}
            if reply_to_message_id:
                additional_attrs['reply_to_message_id'] = reply_to_message_id
                additional_attrs['reply_to_content'] = reply_to_content
                additional_attrs['is_reply'] = True
            
            # Salvar mensagem no banco
            message = Message.objects.create(
                conversation=conversation,
                content=content,
                message_type='text',
                is_from_customer=False,
                additional_attributes=additional_attrs
            )
            
            # Enviar para o WhatsApp
            success, whatsapp_response = send_via_uazapi(conversation, content, 'text', None, reply_to_message_id)
            
            # Se o envio foi bem-sucedido, tentar extrair o external_id da resposta
            if success and whatsapp_response:
                try:
                    import json
                    import re
                    
                    # Tentar extrair o ID da resposta do WhatsApp
                    id_patterns = [
                        r"'id': '([^']+)'",
                        r'"id": "([^"]+)"',
                        r'id["\']?\s*:\s*["\']([^"\']+)["\']',
                        r'messageid["\']?\s*:\s*["\']([^"\']+)["\']'
                    ]
                    
                    for pattern in id_patterns:
                        match = re.search(pattern, whatsapp_response)
                        if match:
                            external_id = match.group(1)
                            print(f"DEBUG: External ID extraído: {external_id}")
                            
                            # Atualizar a mensagem com o external_id
                            additional_attrs = message.additional_attributes or {}
                            additional_attrs['external_id'] = external_id
                            additional_attrs['whatsapp_sent'] = success
                            additional_attrs['whatsapp_response'] = whatsapp_response
                            message.additional_attributes = additional_attrs
                            message.save()
                            
                            print(f"DEBUG: External ID salvo na mensagem: {external_id}")
                            break
                    else:
                        print(f"DEBUG: Não foi possível extrair external_id da resposta")
                        # Salvar apenas a resposta do WhatsApp
                        additional_attrs = message.additional_attributes or {}
                        additional_attrs['whatsapp_sent'] = success
                        additional_attrs['whatsapp_response'] = whatsapp_response
                        message.additional_attributes = additional_attrs
                        message.save()
                        
                except Exception as e:
                    print(f"DEBUG: Erro ao extrair external_id: {e}")
                    # Salvar apenas a resposta do WhatsApp
                    additional_attrs = message.additional_attributes or {}
                    additional_attrs['whatsapp_sent'] = success
                    additional_attrs['whatsapp_response'] = whatsapp_response
                    message.additional_attributes = additional_attrs
                    message.save()
            else:
                # Salvar apenas a resposta do WhatsApp
                additional_attrs = message.additional_attributes or {}
                additional_attrs['whatsapp_sent'] = success
                additional_attrs['whatsapp_response'] = whatsapp_response
                message.additional_attributes = additional_attrs
                message.save()
            
            # Emitir evento WebSocket para mensagem enviada
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"conversation_{conversation.id}",
                {
                    "type": "chat_message",
                    "message": MessageSerializer(message).data,
                    "sender": None,
                    "timestamp": message.created_at.isoformat(),
                }
            )
            
            response_data = MessageSerializer(message).data
            response_data['whatsapp_sent'] = success
            response_data['whatsapp_response'] = whatsapp_response
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversa não encontrada'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def send_media(self, request):
        """Enviar mídia (imagem, vídeo, documento, áudio)"""
        print("🔥🔥🔥 ENDPOINT SEND_MEDIA CHAMADO! 🔥🔥🔥")
        
        conversation_id = request.data.get('conversation_id')
        media_type = request.data.get('media_type')  # image, video, document, audio, myaudio, ptt, sticker
        file = request.FILES.get('file')
        caption = request.data.get('caption', '')
        
        print(f"DEBUG: Recebido no endpoint send_media:")
        print(f"   - conversation_id: {conversation_id}")
        print(f"   - media_type: {media_type}")
        print(f"   - file: {file.name if file else 'None'}")
        print(f"   - file.size: {file.size if file else 'None'}")
        print(f"   - file.type: {file.content_type if file else 'None'}")
        print(f"   - caption: {caption}")
        
        if not conversation_id or not media_type or not file:
            return Response({'error': 'conversation_id, media_type e file são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            
            # Criar diretório se não existir
            import os
            from django.conf import settings
            media_dir = os.path.join(settings.MEDIA_ROOT, 'messages', str(conversation_id))
            os.makedirs(media_dir, exist_ok=True)
            
            # Salvar o arquivo
            file_path = os.path.join(media_dir, file.name)
            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            
            # Para áudios enviados (PTT), converter WebM para MP3 para garantir compatibilidade
            final_filename = file.name
            final_file_path = file_path
            
            if media_type == 'ptt' and file.name.lower().endswith('.webm'):
                try:
                    import subprocess
                    mp3_filename = file.name.replace('.webm', '.mp3')
                    mp3_path = os.path.join(media_dir, mp3_filename)
                    
                    print(f"DEBUG: Convertendo WebM para MP3 para PTT")
                    
                    # Converter usando ffmpeg
                    result = subprocess.run([
                        'ffmpeg', '-i', file_path, 
                        '-acodec', 'libmp3lame', 
                        '-ab', '128k', 
                        '-y', mp3_path
                    ], capture_output=True, text=True, timeout=30)
                    
                    if result.returncode == 0:
                        print(f"DEBUG: Conversão para MP3 bem-sucedida")
                        # Usar o arquivo MP3 em vez do WebM
                        final_filename = mp3_filename
                        final_file_path = mp3_path
                        print(f"DEBUG: Arquivo MP3 criado: {mp3_filename}")
                    else:
                        print(f"DEBUG: Erro na conversão para MP3: {result.stderr}")
                except Exception as e:
                    print(f"DEBUG: Erro ao converter para MP3: {e}")
            
            # Gerar URL pública para o arquivo
            file_url = f"/api/media/messages/{conversation_id}/{final_filename}"
            
            # Preparar atributos adicionais
            additional_attrs = {
                'file_path': final_file_path,
                'file_url': file_url,
                'file_name': final_filename,
                'file_size': os.path.getsize(final_file_path),
                'local_file_url': file_url  # Adicionar URL local para compatibilidade
            }
            
            print(f"DEBUG: file_url final = {file_url}")
            print(f"DEBUG: file_path = {file_path}")
            print(f"DEBUG: file.name = {file.name}")
            print(f"DEBUG: file.size = {file.size}")
            
            # Salvar mensagem no banco
            # Para PTT (mensagens de voz), não usar caption automático
            if media_type == 'ptt':
                content_to_save = caption if caption else "Mensagem de voz"
                print(f"DEBUG: PTT detectado - usando content: {content_to_save}")
            else:
                # Para outros tipos de mídia, usar o nome do arquivo como conteúdo
                content_to_save = caption if caption else f"Arquivo: {file.name}"
                print(f"DEBUG: Outro tipo de mídia ({media_type}) - usando content: {content_to_save}")
            
            print(f"DEBUG: Salvando mensagem no banco:")
            print(f"   - content_to_save: {content_to_save}")
            print(f"   - message_type: {media_type}")
            print(f"   - is_from_customer: False")
            
            message = Message.objects.create(
                conversation=conversation,
                content=content_to_save,
                message_type=media_type,
                additional_attributes=additional_attrs,
                is_from_customer=False
            )
            
            # Enviar para o WhatsApp via Uazapi com a URL da mídia
            success, whatsapp_response = send_media_via_uazapi(conversation, file_url, media_type, caption)
            
            # Emitir evento WebSocket para mensagem enviada
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"conversation_{conversation.id}",
                {
                    "type": "chat_message",
                    "message": MessageSerializer(message).data,
                    "sender": None,
                    "timestamp": message.created_at.isoformat(),
                }
            )
            
            response_data = MessageSerializer(message).data
            response_data['whatsapp_sent'] = success
            response_data['whatsapp_response'] = whatsapp_response
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversa não encontrada'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def presence(self, request):
        """Enviar status de presença (digitando)"""
        conversation_id = request.data.get('conversation_id')
        presence_type = request.data.get('presence_type', 'typing')  # typing, recording, paused
        
        if not conversation_id:
            return Response({'error': 'conversation_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            
            # Enviar indicador de presença para o WhatsApp via Uazapi
            success, whatsapp_response = send_presence_via_uazapi(conversation, presence_type)
            
            return Response({
                'status': 'success',
                'conversation_id': conversation_id,
                'presence_type': presence_type,
                'whatsapp_sent': success,
                'whatsapp_response': whatsapp_response
            })
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversa não encontrada'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def react(self, request):
        """Enviar reação a uma mensagem"""
        try:
            message_id = request.data.get('message_id')
            emoji = request.data.get('emoji', '')
            
            if not message_id:
                return Response({'error': 'message_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Buscar a mensagem
            message = Message.objects.get(id=message_id)
            conversation = message.conversation
            
            # Verificar permissões
            user = request.user
            if user.user_type != 'superadmin':
                provedores = Provedor.objects.filter(admins=user)
                if not provedores.exists() or conversation.inbox.provedor not in provedores:
                    return Response({'error': 'Sem permissão para esta mensagem'}, status=status.HTTP_403_FORBIDDEN)
            
            # Verificar se a mensagem tem ID externo (para WhatsApp)
            external_id = message.additional_attributes.get('external_id') if message.additional_attributes else None
            if not external_id:
                return Response({'error': 'Mensagem não possui ID externo para reação'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Buscar credenciais Uazapi
            provedor = conversation.inbox.provedor
            uazapi_token = provedor.integracoes_externas.get('whatsapp_token')
            uazapi_url = provedor.integracoes_externas.get('whatsapp_url')
            
            if not uazapi_token or not uazapi_url:
                return Response({'error': 'Configuração Uazapi não encontrada'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Preparar payload para Uazapi
            chat_id = conversation.contact.phone
            if not chat_id.endswith('@s.whatsapp.net'):
                chat_id = f"{chat_id}@s.whatsapp.net"
            
            payload = {
                'number': chat_id,
                'text': emoji,
                'id': external_id
            }
            
            print(f"DEBUG: Enviando reação para Uazapi: {payload}")
            print(f"DEBUG: URL Uazapi: {uazapi_url.rstrip('/')}/message/react")
            print(f"DEBUG: Token Uazapi: {uazapi_token[:10]}...")
            
            # Enviar reação via Uazapi
            response = requests.post(
                f"{uazapi_url.rstrip('/')}/message/react",
                headers={'token': uazapi_token, 'Content-Type': 'application/json'},
                json=payload,
                timeout=10
            )
            
            print(f"DEBUG: Resposta Uazapi: {response.status_code} - {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                
                # Atualizar reação na mensagem local
                additional_attrs = message.additional_attributes or {}
                if emoji:
                    additional_attrs['reaction'] = {
                        'emoji': emoji,
                        'timestamp': result.get('reaction', {}).get('timestamp'),
                        'status': result.get('reaction', {}).get('status', 'sent')
                    }
                else:
                    # Remover reação
                    if 'reaction' in additional_attrs:
                        del additional_attrs['reaction']
                
                message.additional_attributes = additional_attrs
                message.save()
                
                # Emitir evento WebSocket
                channel_layer = get_channel_layer()
                from conversations.serializers import MessageSerializer
                message_data = MessageSerializer(message).data
                
                async_to_sync(channel_layer.group_send)(
                    f'conversation_{conversation.id}',
                    {
                        'type': 'chat_message',
                        'message': message_data,
                        'sender': None,
                        'timestamp': message.updated_at.isoformat(),
                    }
                )
                
                # Serializar a mensagem atualizada
                from conversations.serializers import MessageSerializer
                message_data = MessageSerializer(message).data
                
                return Response({
                    'success': True,
                    'message': 'Reação enviada com sucesso' if emoji else 'Reação removida com sucesso',
                    'reaction': result.get('reaction', {}),
                    'updated_message': message_data
                })
            else:
                error_msg = f"Erro Uazapi: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = error_data.get('message', error_msg)
                except:
                    pass
                
                return Response({
                    'success': False,
                    'error': error_msg
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Message.DoesNotExist:
            return Response({'error': 'Mensagem não encontrada'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"DEBUG: Erro ao enviar reação: {e}")
            return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def delete_message(self, request):
        """Apagar mensagem para todos"""
        try:
            message_id = request.data.get('message_id')
            
            if not message_id:
                return Response({'error': 'message_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Buscar a mensagem
            message = Message.objects.get(id=message_id)
            conversation = message.conversation
            
            # Verificar permissões
            user = request.user
            if user.user_type != 'superadmin':
                provedores = Provedor.objects.filter(admins=user)
                if not provedores.exists() or conversation.inbox.provedor not in provedores:
                    return Response({'error': 'Sem permissão para esta mensagem'}, status=status.HTTP_403_FORBIDDEN)
            
            # Verificar se a mensagem tem ID externo (para WhatsApp)
            external_id = message.additional_attributes.get('external_id') if message.additional_attributes else None
            
            # Se tem external_id, tentar excluir via Uazapi
            if external_id:
                # Buscar credenciais Uazapi
                provedor = conversation.inbox.provedor
                uazapi_token = provedor.integracoes_externas.get('whatsapp_token')
                uazapi_url = provedor.integracoes_externas.get('whatsapp_url')
                
                if uazapi_token and uazapi_url:
                    # Preparar payload para Uazapi
                    chat_id = conversation.contact.phone
                    if not chat_id.endswith('@s.whatsapp.net'):
                        chat_id = f"{chat_id}@s.whatsapp.net"
                    
                    # Tentar diferentes formatos de ID
                    id_formats = [external_id]
                    
                    # Se o ID contém ":", tentar sem o prefixo
                    if ':' in external_id:
                        short_id = external_id.split(':', 1)[1]
                        id_formats.append(short_id)
                    
                    # Se o ID não contém ":", tentar com o prefixo do provedor
                    else:
                        # Buscar o número do provedor
                        provedor_number = None
                        if provedor.integracoes_externas:
                            # Tentar extrair o número do provedor das configurações
                            instance = provedor.integracoes_externas.get('instance')
                            if instance:
                                provedor_number = instance.replace('@s.whatsapp.net', '').replace('@c.us', '')
                        
                        if provedor_number:
                            full_id = f"{provedor_number}:{external_id}"
                            id_formats.append(full_id)
                    
                    print(f"DEBUG: Tentando formatos de ID: {id_formats}")
                    
                    success = False
                    for msg_id in id_formats:
                        payload = {
                            'number': chat_id,
                            'id': msg_id
                        }
                        
                        print(f"DEBUG: Tentando apagar com ID: {msg_id}")
                        print(f"DEBUG: URL Uazapi: {uazapi_url.rstrip('/')}/message/delete")
                        print(f"DEBUG: Token Uazapi: {uazapi_token[:10]}...")
                        
                        # Apagar mensagem via Uazapi
                        response = requests.post(
                            f"{uazapi_url.rstrip('/')}/message/delete",
                            headers={'token': uazapi_token, 'Content-Type': 'application/json'},
                            json=payload,
                            timeout=10
                        )
                        
                        print(f"DEBUG: Resposta Uazapi: {response.status_code} - {response.text}")
                        
                        if response.status_code == 200:
                            result = response.json()
                            print(f"DEBUG: Mensagem apagada via Uazapi com sucesso usando ID: {msg_id}")
                            success = True
                            break
                        else:
                            print(f"DEBUG: Erro ao apagar via Uazapi com ID {msg_id}: {response.status_code}")
                    
                    if success:
                        # Se conseguiu apagar via Uazapi, verificar se é mensagem da IA
                        if not message.is_from_customer:
                            # Mensagem da IA: apagar apenas do WhatsApp, manter no sistema
                            print(f"DEBUG: Mensagem da IA apagada do WhatsApp, mantendo no sistema")
                            return Response({
                                'success': True,
                                'message': 'Mensagem apagada do WhatsApp com sucesso',
                                'data': result
                            })
                        else:
                            # Mensagem do cliente: marcar como deletada no sistema também
                            print(f"DEBUG: Mensagem do cliente apagada, marcando como deletada no sistema")
                            additional_attrs = message.additional_attributes or {}
                            additional_attrs['status'] = 'deleted'
                            additional_attrs['deleted_at'] = str(datetime.now())
                            message.additional_attributes = additional_attrs
                            message.save()
                    else:
                        print(f"DEBUG: Todos os formatos de ID falharam")
                        result = {'error': f'Erro Uazapi: todos os formatos falharam'}
                        return Response({
                            'success': False,
                            'message': 'Não foi possível apagar a mensagem no WhatsApp',
                            'data': result
                        })
                else:
                    print(f"DEBUG: Configuração Uazapi não encontrada")
                    result = {'warning': 'Configuração Uazapi não encontrada'}
                    return Response({
                        'success': False,
                        'message': 'Configuração Uazapi não encontrada',
                        'data': result
                    })
            else:
                print(f"DEBUG: Mensagem não possui external_id")
                result = {'warning': 'Mensagem não possui ID externo'}
                return Response({
                    'success': False,
                    'message': 'Mensagem não possui ID externo para exclusão',
                    'data': result
                })
            
            # Só chega aqui se o Uazapi retornou sucesso
            # Atualizar status da mensagem local (sempre)
            additional_attrs = message.additional_attributes or {}
            additional_attrs['status'] = 'deleted'
            additional_attrs['deleted_at'] = str(datetime.now())
            message.additional_attributes = additional_attrs
            message.save()
            
            # Emitir evento WebSocket
            channel_layer = get_channel_layer()
            from conversations.serializers import MessageSerializer
            message_data = MessageSerializer(message).data
            
            async_to_sync(channel_layer.group_send)(
                f'conversation_{conversation.id}',
                {
                    'type': 'chat_message',
                    'message': message_data,
                    'sender': None,
                    'timestamp': message.updated_at.isoformat(),
                }
            )
            
            # Serializar a mensagem atualizada
            from conversations.serializers import MessageSerializer
            message_data = MessageSerializer(message).data
            
            return Response({
                'success': True,
                'message': 'Mensagem apagada com sucesso',
                'data': result,
                'updated_message': message_data
            })
                
        except Message.DoesNotExist:
            return Response({'error': 'Mensagem não encontrada'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"DEBUG: Erro ao apagar mensagem: {e}")
            return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'superadmin':
            return Team.objects.all()
        else:
            provedores = Provedor.objects.filter(admins=user)
            if provedores.exists():
                return Team.objects.filter(provedor__in=provedores)
            return Team.objects.none()
    
    def perform_create(self, serializer):
        """Definir empresa automaticamente baseado no usuário atual e adicionar membros corretamente"""
        user = self.request.user
        
        # Para superadmin, permitir escolher empresa ou usar a primeira
        if user.user_type == 'superadmin':
            provedor = serializer.validated_data.get('provedor')
            if not provedor:
                provedor = Provedor.objects.first()
                if not provedor:
                    raise serializers.ValidationError("Nenhum provedor encontrado no sistema")
        else:
            provedores = Provedor.objects.filter(admins=user)
            if not provedores.exists():
                raise serializers.ValidationError("Usuário não está associado a nenhum provedor")
            provedor = provedores.first()
        
        # Salvar a equipe com a empresa definida
        team = serializer.save(provedor=provedor)
        
        # Adicionar membros a partir do payload da requisição
        members_ids = self.request.data.get('members', [])
        if isinstance(members_ids, str):
            # Se vier como string JSON, converte
            import json
            try:
                members_ids = json.loads(members_ids)
            except Exception:
                members_ids = []
        for member_id in members_ids:
            try:
                member_user = User.objects.get(id=member_id)
                TeamMember.objects.get_or_create(user=member_user, team=team)
            except User.DoesNotExist:
                pass
        return team
    
    def perform_update(self, serializer):
        # Atualizar equipe e seus membros
        user = self.request.user
        # Para superadmin, permitir escolher empresa ou usar a primeira
        if user.user_type == 'superadmin':
            provedor = serializer.validated_data.get('provedor')
            if not provedor:
                provedor = Provedor.objects.first()
                if not provedor:
                    raise serializers.ValidationError("Nenhum provedor encontrado no sistema")
        else:
            provedores = Provedor.objects.filter(admins=user)
            if not provedores.exists():
                raise serializers.ValidationError("Usuário não está associado a nenhum provedor")
            provedor = provedores.first()
        # Salvar a equipe com a empresa definida
        team = serializer.save(provedor=provedor)
        # Limpar todos os membros existentes
        TeamMember.objects.filter(team=team).delete()
        # Adicionar membros a partir do payload da requisição
        members_ids = self.request.data.get('members', [])
        if isinstance(members_ids, str):
            # Se vier como string JSON, converte
            import json
            try:
                members_ids = json.loads(members_ids)
            except Exception:
                members_ids = []
        for member_id in members_ids:
            try:
                member_user = User.objects.get(id=member_id)
                TeamMember.objects.get_or_create(user=member_user, team=team)
            except User.DoesNotExist:
                pass
        return team
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Adicionar membro à equipe"""
        team = self.get_object()
        user_id = request.data.get('user_id')
        is_admin = request.data.get('is_admin', False)
        
        try:
            user = User.objects.get(id=user_id)
            team_member, created = TeamMember.objects.get_or_create(
                user=user,
                team=team,
                defaults={'is_admin': is_admin}
            )
            
            if created:
                return Response({'status': 'member added'})
            else:
                return Response({'error': 'User already in team'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """Remover membro da equipe"""
        team = self.get_object()
        user_id = request.data.get('user_id')
        
        try:
            team_member = TeamMember.objects.get(user_id=user_id, team=team)
            team_member.delete()
            return Response({'status': 'member removed'})
        except TeamMember.DoesNotExist:
            return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)


class TeamMemberViewSet(viewsets.ModelViewSet):
    queryset = TeamMember.objects.all()
    serializer_class = TeamMemberSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'superadmin':
            return TeamMember.objects.all()
        else:
            provedores = Provedor.objects.filter(admins=user)
            if provedores.exists():
                return TeamMember.objects.filter(team__provedor__in=provedores)
            return TeamMember.objects.none()


from django.http import FileResponse, Http404, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@csrf_exempt
def serve_media_file(request, conversation_id, filename):
    """
    Serve media files for conversations
    """
    print(f"🔍 DEBUG: serve_media_file chamado - conversation_id: {conversation_id}, filename: {filename}")
    print(f"🔍 DEBUG: Método HTTP: {request.method}")
    print(f"🔍 DEBUG: User: {request.user}")
    
    try:
        # Verificar se a conversa existe
        conversation = Conversation.objects.get(id=conversation_id)
        print(f"🔍 DEBUG: Conversa encontrada: {conversation.id}")
        
        # Construir caminho do arquivo
        media_dir = os.path.join(settings.MEDIA_ROOT, 'messages', str(conversation_id))
        file_path = os.path.join(media_dir, filename)
        print(f"🔍 DEBUG: Caminho do arquivo: {file_path}")
        
        # Verificar se o arquivo existe
        if not os.path.exists(file_path):
            print(f"❌ DEBUG: Arquivo não encontrado: {file_path}")
            raise Http404("Arquivo não encontrado")
        
        print(f"✅ DEBUG: Arquivo encontrado: {file_path}")
        
        # Verificar se o arquivo está dentro do diretório de mídia (segurança)
        if not file_path.startswith(settings.MEDIA_ROOT):
            print(f"❌ DEBUG: Acesso negado - arquivo fora do diretório de mídia")
            raise Http404("Acesso negado")
        
        # Determinar o tipo MIME baseado na extensão
        import mimetypes
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        print(f"🔍 DEBUG: Content-Type: {content_type}")
        
        # Servir o arquivo
        response = FileResponse(open(file_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        print(f"✅ DEBUG: Arquivo servido com sucesso")
        return response
        
    except Conversation.DoesNotExist:
        print(f"❌ DEBUG: Conversa não encontrada: {conversation_id}")
        raise Http404("Conversa não encontrada")
    except Exception as e:
        print(f"❌ DEBUG: Erro ao servir arquivo de mídia: {e}")
        raise Http404("Erro ao servir arquivo")


def test_media_access(request, conversation_id):
    """
    Test endpoint to check if media files are accessible
    """
    try:
        conversation = Conversation.objects.get(id=conversation_id)
        
        # Listar arquivos de mídia da conversa
        media_dir = os.path.join(settings.MEDIA_ROOT, 'messages', str(conversation_id))
        
        if not os.path.exists(media_dir):
            return JsonResponse({
                'success': False,
                'error': 'Diretório de mídia não existe',
                'media_dir': media_dir
            })
        
        files = []
        for filename in os.listdir(media_dir):
            file_path = os.path.join(media_dir, filename)
            if os.path.isfile(file_path):
                files.append({
                    'name': filename,
                    'size': os.path.getsize(file_path),
                    'url': f'/api/media/messages/{conversation_id}/{filename}/'
                })
        
        return JsonResponse({
            'success': True,
            'conversation_id': conversation_id,
            'media_dir': media_dir,
            'files': files
        })
        
    except Conversation.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Conversa não encontrada'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

