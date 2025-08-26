from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q, Prefetch
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.core.files.storage import default_storage
import uuid
import os

from .models import (
    InternalChatRoom, 
    InternalChatParticipant, 
    InternalChatMessage, 
    InternalChatMessageRead, 
    InternalChatReaction
)
from .serializers_internal_chat import (
    InternalChatRoomSerializer,
    InternalChatMessageSerializer,
    InternalChatParticipantSerializer,
    InternalChatReactionSerializer,
    InternalChatMessageCreateSerializer
)

class InternalChatRoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet para salas de chat interno
    """
    serializer_class = InternalChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Buscar provedor do usuário
        provedor = getattr(user, 'provedor', None) or user.provedores_admin.first()
        
        if not provedor:
            return InternalChatRoom.objects.none()
            
        # Retornar apenas salas do provedor onde o usuário participa
        return InternalChatRoom.objects.filter(
            provedor=provedor,
            participants__user=user,
            is_active=True
        ).prefetch_related(
            'participants__user',
            Prefetch('messages', queryset=InternalChatMessage.objects.select_related('sender').order_by('-created_at')[:50])
        ).distinct()
    
    def perform_create(self, serializer):
        user = self.request.user
        provedor = getattr(user, 'provedor', None) or user.provedores_admin.first()
        
        room = serializer.save(
            provedor=provedor,
            created_by=user
        )
        
        # Adicionar o criador como participante admin
        InternalChatParticipant.objects.create(
            room=room,
            user=user,
            is_admin=True
        )
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """
        Participar de uma sala
        """
        room = self.get_object()
        user = request.user
        
        participant, created = InternalChatParticipant.objects.get_or_create(
            room=room,
            user=user,
            defaults={'is_active': True}
        )
        
        if not created:
            participant.is_active = True
            participant.save()
        
        # Notificar outros participantes
        self._notify_room_event(room, 'user_joined', {
            'user_id': user.id,
            'username': user.username,
            'user_name': f"{user.first_name} {user.last_name}".strip() or user.username
        })
        
        return Response({'message': 'Participou da sala com sucesso'})
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """
        Sair de uma sala
        """
        room = self.get_object()
        user = request.user
        
        try:
            participant = InternalChatParticipant.objects.get(room=room, user=user)
            participant.is_active = False
            participant.save()
            
            # Notificar outros participantes
            self._notify_room_event(room, 'user_left', {
                'user_id': user.id,
                'username': user.username,
                'user_name': f"{user.first_name} {user.last_name}".strip() or user.username
            })
            
            return Response({'message': 'Saiu da sala com sucesso'})
        except InternalChatParticipant.DoesNotExist:
            return Response({'error': 'Não está participando desta sala'}, status=400)
    
    def _notify_room_event(self, room, event_type, data):
        """
        Notificar evento da sala via WebSocket
        """
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"internal_chat_{room.id}",
            {
                'type': 'room_event',
                'event_type': event_type,
                'data': data
            }
        )

class InternalChatMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet para mensagens do chat interno
    """
    serializer_class = InternalChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        user = self.request.user
        room_id = self.request.query_params.get('room_id')
        
        if not room_id:
            return InternalChatMessage.objects.none()
        
        # Verificar se o usuário participa da sala
        try:
            room = InternalChatRoom.objects.get(id=room_id)
            if not room.participants.filter(user=user, is_active=True).exists():
                return InternalChatMessage.objects.none()
        except InternalChatRoom.DoesNotExist:
            return InternalChatMessage.objects.none()
        
        return InternalChatMessage.objects.filter(
            room_id=room_id,
            is_deleted=False
        ).select_related('sender', 'reply_to__sender').prefetch_related('reactions__user').order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return InternalChatMessageCreateSerializer
        return InternalChatMessageSerializer
    
    def perform_create(self, serializer):
        user = self.request.user
        room_id = self.request.data.get('room_id')
        
        # Verificar se o usuário pode enviar mensagem nesta sala
        room = get_object_or_404(InternalChatRoom, id=room_id)
        if not room.participants.filter(user=user, is_active=True).exists():
            raise permissions.PermissionDenied("Você não tem permissão para enviar mensagens nesta sala")
        
        # Processar upload de arquivo se houver
        file_data = self._handle_file_upload(self.request)
        
        message = serializer.save(
            sender=user,
            room=room,
            **file_data
        )
        
        # Marcar como lida pelo remetente
        InternalChatMessageRead.objects.create(
            message=message,
            user=user
        )
        
        # Notificar via WebSocket
        self._notify_new_message(message)
        
        return message
    
    def _handle_file_upload(self, request):
        """
        Processar upload de arquivo
        """
        file_data = {}
        uploaded_file = request.FILES.get('file')
        
        if uploaded_file:
            # Gerar nome único
            file_extension = os.path.splitext(uploaded_file.name)[1]
            unique_filename = f"internal_chat/{uuid.uuid4()}{file_extension}"
            
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
        """
        Notificar nova mensagem via WebSocket
        """
        channel_layer = get_channel_layer()
        
        # Serializar mensagem para envio
        from .serializers_internal_chat import InternalChatMessageSerializer
        message_data = InternalChatMessageSerializer(message).data
        
        async_to_sync(channel_layer.group_send)(
            f"internal_chat_{message.room.id}",
            {
                'type': 'new_message',
                'message': message_data
            }
        )
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """
        Marcar mensagem como lida
        """
        message = self.get_object()
        user = request.user
        
        read_receipt, created = InternalChatMessageRead.objects.get_or_create(
            message=message,
            user=user
        )
        
        if created:
            # Notificar que a mensagem foi lida
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"internal_chat_{message.room.id}",
                {
                    'type': 'message_read',
                    'message_id': message.id,
                    'user_id': user.id
                }
            )
        
        return Response({'message': 'Mensagem marcada como lida'})
    
    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        """
        Reagir a uma mensagem
        """
        message = self.get_object()
        user = request.user
        emoji = request.data.get('emoji')
        
        if not emoji:
            return Response({'error': 'Emoji é obrigatório'}, status=400)
        
        # Criar ou remover reação
        reaction, created = InternalChatReaction.objects.get_or_create(
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
        async_to_sync(channel_layer.group_send)(
            f"internal_chat_{message.room.id}",
            {
                'type': action_type,
                'message_id': message.id,
                'user_id': user.id,
                'emoji': emoji
            }
        )
        
        return Response({'message': f'Reação {emoji} {"adicionada" if created else "removida"}'})

class InternalChatParticipantViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para participantes do chat
    """
    serializer_class = InternalChatParticipantSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        room_id = self.request.query_params.get('room_id')
        if not room_id:
            return InternalChatParticipant.objects.none()
        
        return InternalChatParticipant.objects.filter(
            room_id=room_id,
            is_active=True
        ).select_related('user')