from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    InternalChatRoom,
    InternalChatParticipant, 
    InternalChatMessage,
    InternalChatMessageRead,
    InternalChatReaction
)

User = get_user_model()

class UserBasicSerializer(serializers.ModelSerializer):
    """
    Serializer básico para usuário (para evitar dados sensíveis)
    """
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'first_name', 'last_name']
    
    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

class InternalChatParticipantSerializer(serializers.ModelSerializer):
    """
    Serializer para participantes do chat
    """
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = InternalChatParticipant
        fields = ['id', 'user', 'joined_at', 'is_admin', 'is_active', 'last_seen']

class InternalChatReactionSerializer(serializers.ModelSerializer):
    """
    Serializer para reações
    """
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = InternalChatReaction
        fields = ['id', 'user', 'emoji', 'created_at']

class InternalChatMessageSerializer(serializers.ModelSerializer):
    """
    Serializer para mensagens do chat
    """
    sender = UserBasicSerializer(read_only=True)
    reply_to = serializers.SerializerMethodField()
    reactions = InternalChatReactionSerializer(many=True, read_only=True)
    is_read = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = InternalChatMessage
        fields = [
            'id', 'content', 'sender', 'message_type', 'file_url', 'file_name', 
            'file_size', 'reply_to', 'reactions', 'is_read', 'is_edited', 
            'created_at', 'updated_at', 'time_ago', 'additional_data'
        ]
    
    def get_reply_to(self, obj):
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'content': obj.reply_to.content[:100] + ('...' if len(obj.reply_to.content) > 100 else ''),
                'sender': UserBasicSerializer(obj.reply_to.sender).data,
                'message_type': obj.reply_to.message_type
            }
        return None
    
    def get_is_read(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.read_receipts.filter(user=request.user).exists()
        return False
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"{diff.days}d"
        elif diff.seconds > 3600:
            return f"{diff.seconds // 3600}h"
        elif diff.seconds > 60:
            return f"{diff.seconds // 60}m"
        else:
            return "agora"

class InternalChatMessageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de mensagens
    """
    room_id = serializers.IntegerField(write_only=True)
    reply_to_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = InternalChatMessage
        fields = ['content', 'message_type', 'room_id', 'reply_to_id']
    
    def validate_content(self, value):
        if not value and self.initial_data.get('message_type') == 'text':
            raise serializers.ValidationError("Conteúdo é obrigatório para mensagens de texto")
        return value
    
    def validate_reply_to_id(self, value):
        if value:
            try:
                message = InternalChatMessage.objects.get(id=value)
                # Verificar se a mensagem é da mesma sala
                room_id = self.initial_data.get('room_id')
                if message.room_id != room_id:
                    raise serializers.ValidationError("Mensagem de resposta deve ser da mesma sala")
                return message
            except InternalChatMessage.DoesNotExist:
                raise serializers.ValidationError("Mensagem para resposta não encontrada")
        return None

class InternalChatRoomSerializer(serializers.ModelSerializer):
    """
    Serializer para salas de chat
    """
    participants = InternalChatParticipantSerializer(many=True, read_only=True)
    created_by = UserBasicSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    
    class Meta:
        model = InternalChatRoom
        fields = [
            'id', 'name', 'description', 'room_type', 'created_by', 
            'created_at', 'is_active', 'participants', 'last_message',
            'unread_count', 'participant_count'
        ]
    
    def get_last_message(self, obj):
        last_message = obj.messages.first()
        if last_message:
            return InternalChatMessageSerializer(last_message, context=self.context).data
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            # Contar mensagens não lidas pelo usuário atual
            return obj.messages.exclude(
                read_receipts__user=request.user
            ).exclude(
                sender=request.user
            ).count()
        return 0
    
    def get_participant_count(self, obj):
        return obj.participants.filter(is_active=True).count()

class InternalChatRoomCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de salas
    """
    participants = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = InternalChatRoom
        fields = ['name', 'description', 'room_type', 'participants']
    
    def validate_name(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Nome deve ter pelo menos 3 caracteres")
        return value.strip()
    
    def create(self, validated_data):
        participants_ids = validated_data.pop('participants', [])
        room = super().create(validated_data)
        
        # Adicionar participantes
        for user_id in participants_ids:
            try:
                user = User.objects.get(id=user_id)
                InternalChatParticipant.objects.create(
                    room=room,
                    user=user,
                    is_active=True
                )
            except User.DoesNotExist:
                continue
        
        return room