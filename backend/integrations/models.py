from django.db import models
from core.models import Company, Provedor


class TelegramIntegration(models.Model):
    """Modelo para integração com Telegram"""
    
    provedor = models.OneToOneField(
        Provedor,
        on_delete=models.CASCADE,
        related_name='telegram_integration',
        verbose_name='Provedor',
        null=True,
        blank=True
    )
    
    api_id = models.CharField(
        max_length=100,
        verbose_name='API ID'
    )
    
    api_hash = models.CharField(
        max_length=100,
        verbose_name='API Hash'
    )
    
    phone_number = models.CharField(
        max_length=20,
        verbose_name='Número de Telefone'
    )
    
    session_string = models.TextField(
        null=True,
        blank=True,
        verbose_name='String de Sessão'
    )
    
    is_active = models.BooleanField(
        default=False,
        verbose_name='Ativo'
    )
    
    is_connected = models.BooleanField(
        default=False,
        verbose_name='Conectado'
    )
    
    last_sync = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Última Sincronização'
    )
    
    settings = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Configurações'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Integração Telegram'
        verbose_name_plural = 'Integrações Telegram'
    
    def __str__(self):
        return f"Telegram - {self.provedor.nome}"


class EmailIntegration(models.Model):
    """Modelo para integração com E-mail"""
    
    PROVIDER_CHOICES = (
        ('gmail', 'Gmail'),
        ('outlook', 'Outlook'),
        ('yahoo', 'Yahoo'),
        ('custom', 'Personalizado'),
    )
    
    provedor = models.ForeignKey(
        Provedor,
        on_delete=models.CASCADE,
        related_name='email_integrations',
        verbose_name='Provedor',
        null=True,
        blank=True
    )
    
    name = models.CharField(
        max_length=200,
        verbose_name='Nome'
    )
    
    email = models.EmailField(
        verbose_name='E-mail'
    )
    
    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        default='gmail',
        verbose_name='Provedor'
    )
    
    # IMAP Settings
    imap_host = models.CharField(
        max_length=200,
        verbose_name='Servidor IMAP'
    )
    
    imap_port = models.IntegerField(
        default=993,
        verbose_name='Porta IMAP'
    )
    
    imap_use_ssl = models.BooleanField(
        default=True,
        verbose_name='IMAP SSL'
    )
    
    # SMTP Settings
    smtp_host = models.CharField(
        max_length=200,
        verbose_name='Servidor SMTP'
    )
    
    smtp_port = models.IntegerField(
        default=587,
        verbose_name='Porta SMTP'
    )
    
    smtp_use_tls = models.BooleanField(
        default=True,
        verbose_name='SMTP TLS'
    )
    
    username = models.CharField(
        max_length=200,
        verbose_name='Usuário'
    )
    
    password = models.CharField(
        max_length=200,
        verbose_name='Senha'
    )
    
    is_active = models.BooleanField(
        default=False,
        verbose_name='Ativo'
    )
    
    is_connected = models.BooleanField(
        default=False,
        verbose_name='Conectado'
    )
    
    last_sync = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Última Sincronização'
    )
    
    settings = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Configurações'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Integração E-mail'
        verbose_name_plural = 'Integrações E-mail'
    
    def __str__(self):
        return f"{self.name} - {self.email}"


class WhatsAppIntegration(models.Model):
    """Modelo para integração com WhatsApp"""
    
    provedor = models.OneToOneField(
        Provedor,
        on_delete=models.CASCADE,
        related_name='whatsapp_integration',
        verbose_name='Provedor',
        null=True,
        blank=True
    )
    
    phone_number = models.CharField(
        max_length=20,
        verbose_name='Número de Telefone'
    )
    
    instance_name = models.CharField(
        max_length=100,
        verbose_name='Nome da Instância',
        help_text='Nome da instância no Evolution API',
        null=True,
        blank=True
    )
    
    webhook_url = models.URLField(
        null=True,
        blank=True,
        verbose_name='URL do Webhook'
    )
    
    access_token = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        verbose_name='Token de Acesso'
    )
    
    verify_token = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        verbose_name='Token de Verificação'
    )
    
    is_active = models.BooleanField(
        default=False,
        verbose_name='Ativo'
    )
    
    is_connected = models.BooleanField(
        default=False,
        verbose_name='Conectado'
    )
    
    last_sync = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Última Sincronização'
    )
    
    settings = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Configurações'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Integração WhatsApp'
        verbose_name_plural = 'Integrações WhatsApp'
    
    def __str__(self):
        return f"WhatsApp - {self.provedor.nome}"


class WebchatIntegration(models.Model):
    """Modelo para integração com Chat Web"""
    provedor = models.OneToOneField(
        Provedor,
        on_delete=models.CASCADE,
        related_name='webchat_integration',
        verbose_name='Provedor',
        null=True,
        blank=True
    )
    widget_color = models.CharField(
        max_length=7,
        default='#007bff',
        verbose_name='Cor do Widget'
    )
    welcome_message = models.TextField(
        default='Olá! Como podemos ajudá-lo?',
        verbose_name='Mensagem de Boas-vindas'
    )
    pre_chat_form_enabled = models.BooleanField(
        default=True,
        verbose_name='Formulário Pré-chat Habilitado'
    )
    pre_chat_form_options = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Opções do Formulário Pré-chat'
    )
    business_hours = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Horário de Funcionamento'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    settings = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Configurações'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        verbose_name = 'Integração Chat Web'
        verbose_name_plural = 'Integrações Chat Web'
    def __str__(self):
        return f"Chat Web - {self.provedor.nome}"

