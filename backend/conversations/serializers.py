from rest_framework import serializers
from .models import Contact, Inbox, Conversation, Message, Team, TeamMember
from core.serializers import UserSerializer, LabelSerializer


class ContactSerializer(serializers.ModelSerializer):
    inbox = serializers.SerializerMethodField()
    
    class Meta:
        model = Contact
        fields = [
            'id', 'name', 'email', 'phone', 'avatar',
            'additional_attributes', 'provedor', 'created_at', 'updated_at', 'inbox'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_inbox(self, obj):
        # Buscar a conversa mais recente do contato
        latest_conversation = obj.conversations.order_by('-created_at').first()
        if latest_conversation and latest_conversation.inbox:
            return InboxSerializer(latest_conversation.inbox).data
        return None


class InboxSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inbox
        fields = [
            'id', 'name', 'channel_type', 'provedor',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class MessageSerializer(serializers.ModelSerializer):
    media_type = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'message_type',
            'media_type', 'file_url',
            'content', 'is_from_customer', 'created_at', 'external_id', 'additional_attributes'
        ]
        read_only_fields = ['id', 'created_at']

    def get_media_type(self, obj):
        # Garante que sempre retorna o tipo de mídia correto
        return obj.message_type

    def get_file_url(self, obj):
        # Busca a URL do arquivo nos atributos adicionais
        if obj.additional_attributes:
            # Priorizar URL local se disponível
            local_url = obj.additional_attributes.get('local_file_url')
            if local_url:
                return local_url
            
            # Fallback para URL original
            return obj.additional_attributes.get('file_url')
        return None

    def create(self, validated_data):
        validated_data['is_from_customer'] = False
        return super().create(validated_data)


class ConversationSerializer(serializers.ModelSerializer):
    contact = ContactSerializer(read_only=True)
    inbox = InboxSerializer(read_only=True)
    assignee = UserSerializer(read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'contact', 'inbox', 'assignee', 'status',
            'labels', 'additional_attributes',
            'last_message_at', 'created_at', 'messages'
        ]
        read_only_fields = ['id', 'last_message_at', 'created_at']


class ConversationUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualização de conversas, permitindo modificar assignee e status"""
    
    class Meta:
        model = Conversation
        fields = ['assignee', 'status']


class ConversationListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de conversas"""
    contact = ContactSerializer(read_only=True)
    inbox = InboxSerializer(read_only=True)
    assignee = UserSerializer(read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'contact', 'inbox', 'assignee', 'status',
            'labels', 'last_message_at', 'created_at',
            'last_message', 'unread_count'
        ]
        read_only_fields = ['id', 'last_message_at', 'created_at']
    
    def get_last_message(self, obj):
        last_message = obj.messages.last()
        if last_message:
            return MessageSerializer(last_message).data
        return None
    
    def get_unread_count(self, obj):
        # Implementar lógica de contagem de mensagens não lidas
        return 0


class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = TeamMember
        fields = ['id', 'user', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']

class TeamSerializer(serializers.ModelSerializer):
    members = TeamMemberSerializer(many=True, read_only=True)
    class Meta:
        model = Team
        fields = [
            'id', 'name', 'description', 'provedor', 'members',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'provedor']

