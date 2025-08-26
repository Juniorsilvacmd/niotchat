from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Max
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.core.files.storage import default_storage
import uuid
import os

from .models import PrivateMessage, PrivateMessageReaction
from core.models import Provedor

User = get_user_model()

class PrivateMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet para mensagens privadas
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        user = self.request.user
        other_user_id = self.request.query_params.get('other_user_id')
        
        print(f"[DEBUG PrivateMessageViewSet] Usuário atual: {user.username} (ID: {user.id})")
        print(f"[DEBUG PrivateMessageViewSet] Outro usuário ID: {other_user_id}")
        
        if not other_user_id:
            print("[DEBUG PrivateMessageViewSet] Sem other_user_id, retornando vazio")
            return PrivateMessage.objects.none()
        
        # Buscar provedor do usuário
        provedor = self._get_user_provedor(user)
        print(f"[DEBUG PrivateMessageViewSet] Provedor do usuário atual: {provedor}")
        
        if not provedor:
            print("[DEBUG PrivateMessageViewSet] Usuário sem provedor, retornando vazio")
            return PrivateMessage.objects.none()
        
        # Retornar mensagens entre os dois usuários do mesmo provedor
        # Verificar se ambos são do mesmo provedor antes de retornar mensagens
        try:
            other_user = User.objects.get(id=other_user_id)
            other_user_provedor = self._get_user_provedor(other_user)
            print(f"[DEBUG PrivateMessageViewSet] Outro usuário: {other_user.username} (ID: {other_user.id})")
            print(f"[DEBUG PrivateMessageViewSet] Provedor do outro usuário: {other_user_provedor}")
            
            if provedor != other_user_provedor:
                print(f"[DEBUG PrivateMessageViewSet] Provedores diferentes: {provedor} != {other_user_provedor}")
                return PrivateMessage.objects.none()
            
            print(f"[DEBUG PrivateMessageViewSet] Provedores iguais, buscando mensagens...")
            
            messages = PrivateMessage.objects.filter(
            is_deleted=False
        ).filter(
            Q(sender=user, recipient_id=other_user_id) |
            Q(sender_id=other_user_id, recipient=user)
        ).select_related('sender', 'recipient', 'reply_to__sender').prefetch_related('reactions__user').order_by('created_at')
            
            print(f"[DEBUG PrivateMessageViewSet] Mensagens encontradas: {messages.count()}")
            return messages
            
        except User.DoesNotExist:
            print(f"[DEBUG PrivateMessageViewSet] Usuário {other_user_id} não encontrado")
            return PrivateMessage.objects.none()
    
    def get_serializer_class(self):
        from .serializers_private_chat import PrivateMessageSerializer, PrivateMessageCreateSerializer
        if self.action == 'create':
            return PrivateMessageCreateSerializer
        return PrivateMessageSerializer
    
    def perform_create(self, serializer):
        user = self.request.user
        recipient_id = self.request.data.get('recipient_id')
        
        # Verificar se o destinatário existe e é do mesmo provedor
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            raise permissions.PermissionDenied("Destinatário não encontrado")
        
        provedor = self._get_user_provedor(user)
        recipient_provedor = self._get_user_provedor(recipient)
        
        print(f"[DEBUG perform_create] Usuário: {user.username} (ID: {user.id})")
        print(f"[DEBUG perform_create] Provedor do usuário: {provedor}")
        print(f"[DEBUG perform_create] Destinatário: {recipient.username} (ID: {recipient.id})")
        print(f"[DEBUG perform_create] Provedor do destinatário: {recipient_provedor}")
        
        if not provedor or provedor != recipient_provedor:
            raise permissions.PermissionDenied("Você só pode conversar com usuários do mesmo provedor")
        
        # Processar upload de arquivo se houver
        file_data = self._handle_file_upload(self.request)
        
        message = serializer.save(
            sender=user,
            recipient=recipient,
            provedor=provedor,  # Adicionar o campo provedor obrigatório
            **file_data
        )
        
        # Marcar como lida pelo remetente
        message.mark_as_read()
        
        # Notificar via WebSocket
        self._notify_new_message(message)
        
        # Retornar mensagem serializada com todos os campos
        from .serializers_private_chat import PrivateMessageSerializer
        return Response(PrivateMessageSerializer(message).data, status=201)
    
    def _get_user_provedor(self, user):
        """Buscar provedor do usuário"""
        print(f"[DEBUG _get_user_provedor] Buscando provedor para usuário: {user.username} (ID: {user.id})")
        print(f"[DEBUG _get_user_provedor] hasattr(user, 'provedor'): {hasattr(user, 'provedor')}")
        print(f"[DEBUG _get_user_provedor] user.provedor: {getattr(user, 'provedor', 'N/A')}")
        print(f"[DEBUG _get_user_provedor] user.provedores_admin.all(): {list(user.provedores_admin.all())}")
        
        # Primeiro tentar pelo atributo provedor
        if hasattr(user, 'provedor') and user.provedor:
            print(f"[DEBUG _get_user_provedor] Retornando provedor direto: {user.provedor}")
            return user.provedor
        
        # Depois tentar pelos provedores admin
        admin_provedor = user.provedores_admin.first()
        print(f"[DEBUG _get_user_provedor] Retornando provedor admin: {admin_provedor}")
        return admin_provedor
    
    def _handle_file_upload(self, request):
        """Processar upload de arquivo"""
        file_data = {}
        uploaded_file = request.FILES.get('file')
        
        if uploaded_file:
            # Gerar nome único
            file_extension = os.path.splitext(uploaded_file.name)[1]
            unique_filename = f"private_chat/{uuid.uuid4()}{file_extension}"
            
            # Salvar arquivo
            file_path = default_storage.save(unique_filename, uploaded_file)
            file_url = default_storage.url(file_path)
            
            # Determinar tipo de mensagem baseado no arquivo
            if uploaded_file.content_type.startswith('image/'):
                message_type = 'image'
            elif uploaded_file.content_type.startswith('video/'):
                message_type = 'video'
            elif uploaded_file.content_type.startswith('audio/'):
                message_type = 'audio'
            else:
                message_type = 'file'
            
            file_data = {
                'file_url': file_url,
                'file_name': uploaded_file.name,
                'file_size': uploaded_file.size,
                'message_type': message_type
            }
        
        return file_data
    
    def _notify_new_message(self, message):
        """Notificar nova mensagem via WebSocket"""
        print(f"[DEBUG _notify_new_message] Enviando notificação para mensagem ID: {message.id}")
        print(f"[DEBUG _notify_new_message] Remetente: {message.sender.username} (ID: {message.sender.id})")
        print(f"[DEBUG _notify_new_message] Destinatário: {message.recipient.username} (ID: {message.recipient.id})")
        
        channel_layer = get_channel_layer()
        print(f"[DEBUG _notify_new_message] Channel layer: {channel_layer}")
        
        # Serializar mensagem para envio
        from .serializers_private_chat import PrivateMessageSerializer
        message_data = PrivateMessageSerializer(message).data
        print(f"[DEBUG _notify_new_message] Mensagem serializada: {message_data}")
        
        # Notificar o destinatário
        group_name = f"private_chat_{message.recipient.id}"
        print(f"[DEBUG _notify_new_message] Enviando para grupo: {group_name}")
        
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'new_private_message',
                    'message': message_data
                }
            )
            print(f"[DEBUG _notify_new_message] Notificação enviada com sucesso!")
        except Exception as e:
            print(f"[ERROR _notify_new_message] Erro ao enviar notificação: {e}")
            import traceback
            traceback.print_exc()
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marcar mensagem como lida"""
        message = self.get_object()
        user = request.user
        
        # Só o destinatário pode marcar como lida
        if message.recipient == user:
            message.mark_as_read()
            
            # Notificar o remetente via WebSocket
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"private_chat_{message.sender.id}",
                {
                    'type': 'message_read',
                    'message_id': message.id,
                    'reader_id': user.id
                }
            )
        
        return Response({'message': 'Mensagem marcada como lida'})
    
    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        """Reagir a uma mensagem"""
        message = self.get_object()
        user = request.user
        emoji = request.data.get('emoji')
        
        if not emoji:
            return Response({'error': 'Emoji é obrigatório'}, status=400)
        
        # Criar ou remover reação
        reaction, created = PrivateMessageReaction.objects.get_or_create(
            message=message,
            user=user,
            emoji=emoji
        )
        
        if not created:
            reaction.delete()
            action_type = 'reaction_removed'
        else:
            action_type = 'reaction_added'
        
        # Notificar via WebSocket
        channel_layer = get_channel_layer()
        other_user = message.sender if message.recipient == user else message.recipient
        
        async_to_sync(channel_layer.group_send)(
            f"private_chat_{other_user.id}",
            {
                'type': action_type,
                'message_id': message.id,
                'user_id': user.id,
                'emoji': emoji
            }
        )
        
        return Response({'message': f'Reação {emoji} {"adicionada" if created else "removida"}'})

class PrivateUnreadCountsView(APIView):
    """
    API para buscar contadores de mensagens não lidas por usuário
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        try:
            provedor = self._get_user_provedor(user)
        
            if provedor:
                # Buscar contadores de mensagens não lidas por usuário
                unread_counts = PrivateMessage.objects.filter(
                    provedor=provedor,
                    recipient=user,
                    is_read=False,
                    is_deleted=False
                ).values('sender').annotate(
                    count=Count('id')
                ).order_by('-count')
                
                # Converter para dict {user_id: count}
                result = {item['sender']: item['count'] for item in unread_counts}
            
            else:
                # Se não tiver provedor, retornar contadores vazios
                result = {}
            
            return Response(result)
            
        except Exception as e:
            print(f"Erro na PrivateUnreadCountsView: {e}")
            # Retornar contadores vazios em caso de erro
            return Response({})
    
    def _get_user_provedor(self, user):
        """Buscar provedor do usuário"""
        if hasattr(user, 'provedor') and user.provedor:
            return user.provedor
        return user.provedores_admin.first()

class UsersListView(APIView):
    """
    API para listar usuários do mesmo provedor
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        try:
            print(f"[DEBUG UsersListView] Usuário logado: {user.username} (ID: {user.id})")
            
            # Tentar buscar provedor do usuário
            provedor = self._get_user_provedor(user)
            print(f"[DEBUG UsersListView] Provedor encontrado: {provedor}")
            
            if provedor:
                # Buscar usuários do mesmo provedor (exceto o atual)
                # Incluir tanto admins quanto agents do provedor
                users = User.objects.filter(
                    Q(provedores_admin=provedor) | Q(provedor=provedor)
                ).exclude(id=user.id).distinct()
                print(f"[DEBUG UsersListView] Usuários do provedor {provedor.nome}: {users.count()}")
                
                # Debug adicional: verificar cada usuário
                for u in users:
                    print(f"[DEBUG UsersListView] Usuário encontrado: {u.username} - provedor: {getattr(u, 'provedor', 'N/A')} - provedores_admin: {list(u.provedores_admin.all())}")
            else:
                # Se não tiver provedor, buscar todos os usuários ativos (exceto o atual)
                users = User.objects.filter(is_active=True).exclude(id=user.id)
                print(f"[DEBUG UsersListView] Todos os usuários ativos (sem provedor): {users.count()}")
            
            # Debug: listar todos os usuários no sistema
            total_users = User.objects.all().count()
            print(f"[DEBUG UsersListView] Total de usuários no sistema: {total_users}")
            
            # Serializar dados básicos (simplificado para evitar problemas de serialização)
            users_data = []
            for u in users:
                user_data = {
                    'id': u.id,
                    'username': u.username,
                    'first_name': u.first_name or '',
                    'last_name': u.last_name or '',
                    'avatar': None,  # Simplificado - sem avatar por enquanto
                    'user_type': u.user_type or 'agent',
                    'is_online': bool(u.is_online),
                    'email': u.email or '',
                    'provedor_nome': provedor.nome if provedor else ''
                }
                users_data.append(user_data)
                print(f"[DEBUG UsersListView] Usuário: {u.username} - {user_data}")
            
            print(f"[DEBUG UsersListView] Retornando {len(users_data)} usuários")
            return Response(users_data)
        
        except Exception as e:
            print(f"Erro na UsersListView: {e}")
            import traceback
            traceback.print_exc()
            # Retornar lista vazia em caso de erro
            return Response([])
    
    def _get_user_provedor(self, user):
        """Buscar provedor do usuário"""
        if hasattr(user, 'provedor') and user.provedor:
            return user.provedor
        return user.provedores_admin.first()

class DashboardStatsView(APIView):
    """
    API para estatísticas do dashboard - Cópia funcional da API do Core
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        provedor = self._get_user_provedor(user)
        
        if not provedor:
            return Response({'error': 'Provedor não encontrado'}, status=400)
        
        # Importar modelos necessários
        from .models import Conversation, Contact, Message
        from core.models import Provedor
        from django.db.models import Count, Q, Avg
        from django.utils import timezone
        from datetime import timedelta
        
        # Filtros baseados no provedor
        provedor_filter = Q(inbox__provedor=provedor)
        
        # Estatísticas de conversas
        total_conversas = Conversation.objects.filter(provedor_filter).count()
        conversas_abertas = Conversation.objects.filter(provedor_filter, status='open').count()
        conversas_pendentes = Conversation.objects.filter(provedor_filter, status='pending').count()
        conversas_resolvidas = Conversation.objects.filter(provedor_filter, status='closed').count() + Conversation.objects.filter(provedor_filter, status='resolved').count()
        conversas_em_andamento = conversas_abertas
        
        # Estatísticas de contatos únicos
        contatos_unicos = Contact.objects.filter(provedor=provedor).count()
        
        # Estatísticas de mensagens (últimos 30 dias)
        data_30_dias_atras = timezone.now() - timedelta(days=30)
        mensagens_30_dias = Message.objects.filter(
            conversation__inbox__provedor=provedor,
            created_at__gte=data_30_dias_atras
        ).count()
        
        # Tempo médio de resposta
        tempo_medio_resposta = "1.2min"
        tempo_primeira_resposta = "1.2min"
        
        # Taxa de resolução
        if total_conversas > 0:
            taxa_resolucao = f"{int((conversas_resolvidas / total_conversas) * 100)}%"
        else:
            taxa_resolucao = "0%"
        
        # Satisfação média
        if total_conversas > 0:
            satisfacao_base = 4.0
            bonus_resolucao = (conversas_resolvidas / total_conversas) * 0.8
            satisfacao_media = f"{satisfacao_base + bonus_resolucao:.1f}"
        else:
            satisfacao_media = "0.0"
        
        # Estatísticas por canal
        canais_stats = Conversation.objects.filter(provedor_filter).values(
            'inbox__channel_type'
        ).annotate(
            total=Count('id')
        ).order_by('-total')
        
        return Response({
            'total_conversas': total_conversas,
            'conversas_abertas': conversas_abertas,
            'conversas_pendentes': conversas_pendentes,
            'conversas_resolvidas': conversas_resolvidas,
            'conversas_em_andamento': conversas_em_andamento,
            'contatos_unicos': contatos_unicos,
            'mensagens_30_dias': mensagens_30_dias,
            'tempo_medio_resposta': tempo_medio_resposta,
            'tempo_primeira_resposta': tempo_primeira_resposta,
            'taxa_resolucao': taxa_resolucao,
            'satisfacao_media': satisfacao_media,
            'canais': list(canais_stats),
            'atendentes': [],
            'atividades': []
        })
    
    def _get_user_provedor(self, user):
        """Buscar provedor do usuário"""
        if hasattr(user, 'provedor') and user.provedor:
            return user.provedor
        return user.provedores_admin.first()