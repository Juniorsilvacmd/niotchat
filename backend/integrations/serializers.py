from rest_framework import serializers
from .models import TelegramIntegration, EmailIntegration, WhatsAppIntegration, WebchatIntegration


class TelegramIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelegramIntegration
        fields = [
            'id', 'provedor', 'api_id', 'api_hash', 'phone_number',
            'is_active', 'is_connected', 'last_sync', 'settings', 'created_at'
        ]
        read_only_fields = ['id', 'session_string', 'is_connected', 'last_sync', 'created_at']
        extra_kwargs = {
            'api_hash': {'write_only': True}
        }


class EmailIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailIntegration
        fields = [
            'id', 'provedor', 'name', 'email', 'provider',
            'imap_host', 'imap_port', 'imap_use_ssl',
            'smtp_host', 'smtp_port', 'smtp_use_tls',
            'username', 'is_active', 'is_connected',
            'last_sync', 'settings', 'created_at'
        ]
        read_only_fields = ['id', 'is_connected', 'last_sync', 'created_at']
        extra_kwargs = {
            'password': {'write_only': True}
        }


class WhatsAppIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppIntegration
        fields = [
            'id', 'provedor', 'phone_number', 'webhook_url',
            'is_active', 'is_connected', 'last_sync',
            'settings', 'created_at'
        ]
        read_only_fields = ['id', 'is_connected', 'last_sync', 'created_at']
        extra_kwargs = {
            'access_token': {'write_only': True},
            'verify_token': {'write_only': True}
        }


class WebchatIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebchatIntegration
        fields = [
            'id', 'provedor', 'widget_color', 'welcome_message',
            'pre_chat_form_enabled', 'pre_chat_form_options',
            'business_hours', 'is_active', 'settings', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

