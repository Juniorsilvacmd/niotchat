from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PrivateMessage, PrivateMessageReaction

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

class PrivateMessageReactionSerializer(serializers.ModelSerializer):
    """
    Serializer para reações
    """
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = PrivateMessageReaction
        fields = ['id', 'user', 'emoji', 'created_at']

class PrivateMessageSerializer(serializers.ModelSerializer):
    """
    Serializer para mensagens privadas
    """
    sender = UserBasicSerializer(read_only=True)
    recipient = UserBasicSerializer(read_only=True)
    reply_to = serializers.SerializerMethodField()
    reactions = PrivateMessageReactionSerializer(many=True, read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = PrivateMessage
        fields = [
            'id', 'content', 'sender', 'recipient', 'message_type', 'file_url', 
            'file_name', 'file_size', 'reply_to', 'reactions', 'is_read', 
            'is_edited', 'created_at', 'updated_at', 'time_ago', 'additional_data'
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

class PrivateMessageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de mensagens privadas
    """
    recipient_id = serializers.IntegerField(write_only=True)
    reply_to_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = PrivateMessage
        fields = ['id', 'content', 'message_type', 'file_url', 'file_name', 'file_size', 'recipient_id', 'reply_to_id']
    
    def validate_content(self, value):
        if not value and self.initial_data.get('message_type') == 'text':
            raise serializers.ValidationError("Conteúdo é obrigatório para mensagens de texto")
        return value
    
    def validate_reply_to_id(self, value):
        if value:
            try:
                message = PrivateMessage.objects.get(id=value)
                return message
            except PrivateMessage.DoesNotExist:
                raise serializers.ValidationError("Mensagem para resposta não encontrada")
        return None