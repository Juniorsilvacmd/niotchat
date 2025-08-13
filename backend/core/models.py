from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from rest_framework.authtoken.models import Token as AuthToken
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.utils.deprecation import MiddlewareMixin


class User(AbstractUser):
    """Modelo de usuário customizado"""
    
    USER_TYPES = (
        ('superadmin', 'Super Administrador'),
        ('admin', 'Administrador da Empresa'),
        ('agent', 'Atendente'),
    )
    
    user_type = models.CharField(
        max_length=20,
        choices=USER_TYPES,
        default='agent',
        verbose_name='Tipo de Usuário'
    )
    
    avatar = models.ImageField(
        upload_to='avatars/',
        null=True,
        blank=True,
        verbose_name='Avatar'
    )
    
    phone = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name='Telefone'
    )
    
    is_online = models.BooleanField(
        default=False,
        verbose_name='Online'
    )
    
    last_seen = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Última Visualização'
    )
    
    # Campo para armazenar permissões específicas
    permissions = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Permissões Específicas'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []
    
    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
    
    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"


class Company(models.Model):
    """Modelo para empresas"""
    
    name = models.CharField(
        max_length=200,
        verbose_name='Nome da Empresa'
    )
    
    slug = models.SlugField(
        unique=True,
        verbose_name='Slug'
    )
    
    logo = models.ImageField(
        upload_to='company_logos/',
        null=True,
        blank=True,
        verbose_name='Logo'
    )
    
    description = models.TextField(
        null=True,
        blank=True,
        verbose_name='Descrição'
    )
    
    website = models.URLField(
        null=True,
        blank=True,
        verbose_name='Website'
    )
    
    email = models.EmailField(
        null=True,
        blank=True,
        verbose_name='E-mail'
    )
    
    phone = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name='Telefone'
    )
    
    address = models.TextField(
        null=True,
        blank=True,
        verbose_name='Endereço'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'
    
    def __str__(self):
        return self.name


class CompanyUser(models.Model):
    """Relacionamento entre usuários e empresas"""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='company_users'
    )
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='company_users'
    )
    
    role = models.CharField(
        max_length=20,
        choices=User.USER_TYPES,
        default='agent',
        verbose_name='Função'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'company')
        verbose_name = 'Usuário da Empresa'
        verbose_name_plural = 'Usuários da Empresa'
    
    def __str__(self):
        return f"{self.user.username} - {self.company.name}"


class Label(models.Model):
    """Modelo para rótulos/etiquetas"""
    
    name = models.CharField(
        max_length=100,
        verbose_name='Nome'
    )
    
    color = models.CharField(
        max_length=7,
        default='#007bff',
        verbose_name='Cor',
        help_text='Cor em formato hexadecimal (ex: #007bff)'
    )
    
    description = models.TextField(
        null=True,
        blank=True,
        verbose_name='Descrição'
    )
    
    provedor = models.ForeignKey(
        'Provedor',
        on_delete=models.CASCADE,
        related_name='labels',
        verbose_name='Provedor',
        null=True,
        blank=True
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('name', 'provedor')
        verbose_name = 'Rótulo'
        verbose_name_plural = 'Rótulos'
    
    def __str__(self):
        return f"{self.name} ({self.provedor.nome})"


class AuditLog(models.Model):
    ACTIONS = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('edit', 'Edição'),
        ('create', 'Criação'),
        ('delete', 'Exclusão'),
        ('other', 'Outro'),
    ]
    user = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Usuário')
    action = models.CharField(max_length=20, choices=ACTIONS)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.TextField(null=True, blank=True)
    provedor = models.ForeignKey('Provedor', on_delete=models.CASCADE, related_name='audit_logs', verbose_name='Provedor', null=True, blank=True)

    class Meta:
        verbose_name = 'Log de Auditoria'
        verbose_name_plural = 'Logs de Auditoria'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"


class SystemConfig(models.Model):
    """Configurações globais do sistema"""
    site_name = models.CharField(max_length=100, default="Nio Chat", verbose_name="Nome do Sistema")
    site_logo = models.ImageField(upload_to='system/', null=True, blank=True, verbose_name="Logo do Sistema")
    contact_email = models.EmailField(null=True, blank=True, verbose_name="E-mail de Contato")
    default_language = models.CharField(max_length=10, default="pt-br", verbose_name="Idioma Padrão")
    timezone = models.CharField(max_length=50, default="America/Sao_Paulo", verbose_name="Fuso Horário")
    smtp_host = models.CharField(max_length=100, null=True, blank=True, verbose_name="SMTP Host")
    smtp_port = models.IntegerField(null=True, blank=True, verbose_name="SMTP Porta")
    smtp_user = models.CharField(max_length=100, null=True, blank=True, verbose_name="SMTP Usuário")
    smtp_password = models.CharField(max_length=100, null=True, blank=True, verbose_name="SMTP Senha")
    email_from = models.EmailField(null=True, blank=True, verbose_name="E-mail Remetente Padrão")
    allow_public_signup = models.BooleanField(default=False, verbose_name="Permitir Cadastro Público")
    max_users_per_company = models.IntegerField(default=10, verbose_name="Limite de Usuários por Empresa")
    # Campos do SGP
    sgp_url = models.CharField(max_length=255, blank=True, null=True, verbose_name="URL do SGP")
    sgp_token = models.CharField(max_length=255, blank=True, null=True, verbose_name="Token do SGP")
    sgp_app = models.CharField(max_length=255, blank=True, null=True, verbose_name="App do SGP")
    # Campo da OpenAI
    openai_api_key = models.CharField(max_length=255, blank=True, null=True, verbose_name="Chave da API OpenAI")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuração do Sistema"
        verbose_name_plural = "Configurações do Sistema"

    def __str__(self):
        return "Configurações do Sistema"


class Provedor(models.Model):
    nome = models.CharField(max_length=200)
    site_oficial = models.URLField(blank=True, null=True)
    endereco = models.CharField(max_length=300, blank=True, null=True)
    redes_sociais = models.JSONField(blank=True, null=True, help_text="Redes sociais da empresa")
    horarios_atendimento = models.TextField(blank=True, null=True, help_text="Horários de atendimento (texto ou JSON)")
    dias_atendimento = models.TextField(blank=True, null=True, help_text="Dias de atendimento (texto ou JSON)")
    planos = models.TextField(blank=True, null=True, help_text="Planos da empresa (texto ou JSON)")
    dados_adicionais = models.TextField(blank=True, null=True, help_text="FAQ, orientações, termos, políticas, etc")
    integracoes_externas = models.JSONField(blank=True, null=True, help_text="Dados de integração com SGP/URA: app, token, endpoints personalizados")
    # Personalização do agente/atendente
    nome_agente_ia = models.CharField(max_length=100, blank=True, null=True)
    estilo_personalidade = models.CharField(max_length=50, blank=True, null=True, help_text="Ex: Formal, Brincalhão, Educado")
    uso_emojis = models.CharField(max_length=20, blank=True, null=True, help_text="sempre, ocasionalmente, nunca")
    personalidade = models.JSONField(blank=True, null=True, help_text="Lista de traços de personalidade do agente IA")
    planos_internet = models.TextField(blank=True, null=True, help_text="Planos de internet oferecidos pela empresa (texto ou JSON)")
    planos_descricao = models.TextField(blank=True, null=True, help_text="Descrição detalhada dos planos oferecidos pela empresa")
    modo_falar = models.CharField(max_length=50, blank=True, null=True, help_text="Modo de falar/sotaque do agente (ex: nordestino, formal, descontraído)")
    informacoes_extras = models.TextField(blank=True, null=True, help_text="Informações extras, regras de fidelidade, integrações RAG, etc")
    avatar_agente = models.ImageField(upload_to='avatars/', blank=True, null=True)
    telefones = models.JSONField(blank=True, null=True, help_text="Telefones de contato: suporte, financeiro, comercial, etc")
    emails = models.JSONField(blank=True, null=True, help_text="E-mails de contato: suporte, financeiro, comercial, etc")
    taxa_adesao = models.CharField(max_length=100, blank=True, null=True, help_text="Taxa de adesão (sim/não, valor)")
    inclusos_plano = models.TextField(blank=True, null=True, help_text="O que está incluso no plano do cliente")
    multa_cancelamento = models.CharField(max_length=100, blank=True, null=True, help_text="Multa de cancelamento (sim/não, valor/regra)")
    tipo_conexao = models.CharField(max_length=100, blank=True, null=True, help_text="Tipo de conexão: fibra, rádio, etc")
    prazo_instalacao = models.CharField(max_length=100, blank=True, null=True, help_text="Prazo de instalação após contratação")
    documentos_necessarios = models.TextField(blank=True, null=True, help_text="Documentos necessários para contratação")
    observacoes = models.TextField(blank=True, null=True, help_text="Observações adicionais")
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    # Configurações de IA avançadas
    ferramentas_ia = models.JSONField(blank=True, null=True, help_text="Ferramentas personalizadas para o agente IA")
    fluxo_atendimento = models.JSONField(blank=True, null=True, help_text="Fluxo de atendimento personalizado para o agente IA")
    regras_gerais = models.JSONField(blank=True, null=True, help_text="Regras gerais personalizadas para o agente IA")
    # Multi-tenant: cada provedor tem seus admins
    admins = models.ManyToManyField('User', related_name='provedores_admin', blank=True, help_text="Usuários administradores deste provedor")
    # Equipes do provedor
    # teams = models.ManyToManyField('conversations.Team', related_name='provedores', blank=True, help_text="Equipes deste provedor")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Provedor'
        verbose_name_plural = 'Provedores'

    def __str__(self):
        return self.nome


class Canal(models.Model):
    TIPO_CHOICES = [
        ('whatsapp', 'WhatsApp'),
        ('whatsapp_beta', 'WhatsApp Beta'),
        ('telegram', 'Telegram'),
        ('email', 'E-mail'),
        ('website', 'Website'),
        ('instagram', 'Instagram'),
        ('facebook', 'Facebook'),
    ]
    
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    nome = models.CharField(max_length=100, blank=True, null=True)
    ativo = models.BooleanField(default=True)
    provedor = models.ForeignKey(Provedor, on_delete=models.CASCADE, related_name='canais')
    
    # Campos específicos para WhatsApp
    # (já existem)
    
    # Campos específicos para Telegram
    api_id = models.CharField(max_length=20, blank=True, null=True, help_text="App API ID do Telegram")
    api_hash = models.CharField(max_length=100, blank=True, null=True, help_text="App API Hash do Telegram")
    app_title = models.CharField(max_length=100, blank=True, null=True, help_text="App Title do Telegram")
    short_name = models.CharField(max_length=50, blank=True, null=True, help_text="Short Name do Telegram")
    verification_code = models.CharField(max_length=10, blank=True, null=True, help_text="Código de verificação do Telegram")
    phone_number = models.CharField(max_length=20, blank=True, null=True, help_text="Número de telefone do Telegram")
    
    # Campos específicos para E-mail
    email = models.EmailField(blank=True, null=True)
    smtp_host = models.CharField(max_length=100, blank=True, null=True)
    smtp_port = models.CharField(max_length=10, blank=True, null=True)
    
    # Campos específicos para Website
    url = models.URLField(blank=True, null=True)
    
    # Campo para dados extras (como instance_id do WhatsApp Beta)
    dados_extras = models.JSONField(blank=True, null=True, help_text="Dados extras do canal (instance_id, etc)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Canal'
        verbose_name_plural = 'Canais'
    
    def __str__(self):
        return f"{self.get_tipo_display()} - {self.nome or self.email or self.url or 'Sem nome'}"


# Sinal para criar token automaticamente ao criar usuário
@receiver(post_save, sender=User)
def create_auth_token(sender, instance=None, created=False, **kwargs):
    if created:
        AuthToken.objects.get_or_create(user=instance)


# Sinais para registrar login/logout
@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    from core.models import AuditLog, Provedor
    ip = request.META.get('REMOTE_ADDR')
    
    # Buscar provedor do usuário
    provedor = None
    if hasattr(user, 'provedor_id') and user.provedor_id:
        provedor = Provedor.objects.filter(id=user.provedor_id).first()
    if not provedor:
        provedor = Provedor.objects.filter(admins=user).first()
    
    AuditLog.objects.create(
        user=user, 
        action='login', 
        ip_address=ip, 
        details='Login no sistema',
        provedor=provedor
    )

@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    from core.models import AuditLog, Provedor
    ip = request.META.get('REMOTE_ADDR')
    
    # Buscar provedor do usuário
    provedor = None
    if hasattr(user, 'provedor_id') and user.provedor_id:
        provedor = Provedor.objects.filter(id=user.provedor_id).first()
    if not provedor:
        provedor = Provedor.objects.filter(admins=user).first()
    
    AuditLog.objects.create(
        user=user, 
        action='logout', 
        ip_address=ip, 
        details='Logout do sistema',
        provedor=provedor
    )

