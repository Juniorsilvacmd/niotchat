from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.admin import AdminSite
from django.shortcuts import render
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from django import forms
from .models import User, Company, CompanyUser, Label, SystemConfig, Provedor, Canal, AuditLog
from conversations.models import Team
from django.contrib.auth.forms import UserChangeForm
from django.contrib.auth.forms import ReadOnlyPasswordHashField


class UserPermissionsForm(forms.ModelForm):
    class Meta:
        model = User
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'permissions' in self.fields:
            # Definir as opções de permissões disponíveis
            PERMISSIONS_CHOICES = [
                ('view_ai_conversations', 'Ver atendimentos com IA'),
                ('view_assigned_conversations', 'Ver apenas atendimentos atribuídos a mim'),
                ('view_team_unassigned', 'Ver atendimentos não atribuídos da minha equipe'),
                ('manage_contacts', 'Gerenciar contatos'),
                ('manage_reports', 'Gerenciar relatórios'),
                ('manage_knowledge_base', 'Gerenciar base de conhecimento'),
            ]
            self.fields['permissions'] = forms.MultipleChoiceField(
                choices=PERMISSIONS_CHOICES,
                widget=forms.CheckboxSelectMultiple,
                required=False,
                help_text='Selecione as permissões que este usuário deve ter'
            )


class UserCreationForm(forms.ModelForm):
    """Formulário customizado para criação de usuários com seleção de provedor"""
    password1 = forms.CharField(label='Senha', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Confirmar Senha', widget=forms.PasswordInput)
    provedor = forms.ModelChoiceField(
        queryset=Provedor.objects.filter(is_active=True),
        required=False,
        empty_label="Selecione um provedor (opcional)",
        help_text="Selecione o provedor ao qual este usuário será associado"
    )
    
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'user_type', 'provedor')
    
    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("As senhas não coincidem")
        return password2
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
            # Associar usuário ao provedor se selecionado
            provedor = self.cleaned_data.get('provedor')
            if provedor:
                provedor.admins.add(user)
        return user


class CustomUserChangeForm(UserChangeForm):
    password = ReadOnlyPasswordHashField(
        label="Senha",
        help_text="Para alterar senha utilize este formulário."
    )
    
    class Meta:
        model = User
        fields = '__all__'


class CustomAdminSite(AdminSite):
    site_header = 'Nio Chat - Administração'
    site_title = 'Nio Chat Admin'
    index_title = 'Painel de Administração'

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('usuarios-sistema/', self.admin_view(self.usuarios_sistema_view), name='usuarios-sistema'),
        ]
        return custom_urls + urls

    def usuarios_sistema_view(self, request):
        """View para mostrar todos os usuários do sistema com informações detalhadas"""
        # Buscar todos os usuários com informações de empresa e provedores
        users_with_companies = []
        
        for user in User.objects.all().select_related().prefetch_related('company_users__company', 'provedores_admin'):
            # Buscar empresas do usuário
            companies = []
            for company_user in user.company_users.all():
                companies.append({
                    'name': company_user.company.name,
                    'role': company_user.get_role_display(),
                    'is_active': company_user.is_active,
                    'type': 'Empresa'
                })
            
            # Buscar provedores do usuário
            for provedor in user.provedores_admin.all():
                companies.append({
                    'name': provedor.nome,
                    'role': 'Admin',
                    'is_active': provedor.is_active,
                    'type': 'Provedor'
                })
            
            # Determinar status online (últimos 5 minutos)
            is_online = False
            if user.last_seen:
                time_diff = timezone.now() - user.last_seen
                is_online = time_diff <= timedelta(minutes=5) and user.is_online
            
            # Formatar último acesso
            last_access = "Nunca"
            if user.last_seen:
                last_access = user.last_seen.strftime("%d/%m/%Y %H:%M:%S")
            
            users_with_companies.append({
                'user': user,
                'companies': companies,
                'is_online': is_online,
                'last_access': last_access,
                'status': 'Ativo' if user.is_active else 'Inativo'
            })
        
        context = {
            'title': 'Usuários do Sistema',
            'users_with_companies': users_with_companies,
            'opts': User._meta,
        }
        
        return render(request, 'admin/core/usuarios_sistema.html', context)


# Registrar o site admin customizado
admin_site = CustomAdminSite(name='niochat_admin')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = CustomUserChangeForm
    add_form = UserCreationForm
    list_display = ('username', 'email', 'user_type', 'is_online', 'is_active', 'date_joined', 'permissions_display')
    list_filter = ('user_type', 'is_online', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    fieldsets = (
        (None, {
            'fields': ('username', 'password')
        }),
        ('Informações Pessoais', {
            'fields': ('first_name', 'last_name', 'email')
        }),
        ('Permissões', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Datas importantes', {
            'fields': ('last_login', 'date_joined')
        }),
        ('Informações Adicionais', {
            'fields': ('user_type', 'avatar', 'phone', 'is_online', 'last_seen')
        }),
        ('Permissões Personalizadas', {
            'fields': ('permissions',),
            'description': 'Permissões específicas do usuário no sistema'
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2'),
        }),
        ('Informações Pessoais', {
            'classes': ('wide',),
            'fields': ('first_name', 'last_name', 'email', 'user_type'),
        }),
        ('Associação', {
            'classes': ('wide',),
            'fields': ('provedor',),
            'description': 'Associe este usuário a um provedor se necessário'
        }),
    )
    
    def permissions_display(self, obj):
        """Exibe as permissões de forma legível"""
        if obj.permissions:
            # Mapear códigos para nomes legíveis
            permission_names = {
                'view_ai_conversations': 'Atendimentos IA',
                'view_assigned_conversations': 'Atendimentos atribuídos',
                'view_team_unassigned': 'Atendimentos equipe',
                'manage_contacts': 'Contatos',
                'manage_reports': 'Relatórios',
                'manage_knowledge_base': 'Base de conhecimento',
            }
            readable_permissions = [permission_names.get(p, p) for p in obj.permissions[:3]]
            return ', '.join(readable_permissions) + ('...' if len(obj.permissions) > 3 else '')
        return 'Nenhuma'
    permissions_display.short_description = 'Permissões'
    
    actions = ['associar_provedor_mega_fibra']
    
    def associar_provedor_mega_fibra(self, request, queryset):
        """Action para associar usuários ao provedor Mega Fibra"""
        try:
            provedor = Provedor.objects.get(nome__icontains='Mega Fibra')
            count = 0
            for user in queryset:
                if user not in provedor.admins.all():
                    provedor.admins.add(user)
                    count += 1
            
            if count == 1:
                message = f"1 usuário foi associado ao provedor {provedor.nome}"
            else:
                message = f"{count} usuários foram associados ao provedor {provedor.nome}"
            
            self.message_user(request, message)
        except Provedor.DoesNotExist:
            self.message_user(request, "Provedor 'Mega Fibra' não encontrado", level='ERROR')
        except Exception as e:
            self.message_user(request, f"Erro ao associar usuários: {str(e)}", level='ERROR')
    
    associar_provedor_mega_fibra.short_description = "Associar ao provedor Mega Fibra"


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'provedor', 'is_active', 'created_at')
    list_filter = ('provedor', 'is_active', 'created_at')
    search_fields = ('name', 'provedor__nome')


@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    list_display = ('site_name', 'contact_email', 'default_language', 'timezone', 'allow_public_signup', 'max_users_per_company')
    fieldsets = (
        (None, {
            'fields': ('site_name', 'site_logo', 'contact_email', 'default_language', 'timezone')
        }),
        ('E-mail', {
            'fields': ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'email_from')
        }),
        ('Limites e Segurança', {
            'fields': ('allow_public_signup', 'max_users_per_company')
        }),
        ('SGP', {
            'fields': ('sgp_url', 'sgp_token', 'sgp_app')
        }),
        ('OpenAI', {
            'fields': ('openai_api_key',),
            'description': 'Configurações da API da OpenAI para geração de respostas automáticas'
        }),
    )


class ProvedorAdminForm(forms.ModelForm):
    sgp_url = forms.CharField(label='URL do SGP', required=False)
    sgp_token = forms.CharField(label='Token do SGP', required=False)
    sgp_app = forms.CharField(label='App do SGP', required=False)
    whatsapp_url = forms.CharField(label='URL do WhatsApp', required=False)
    whatsapp_token = forms.CharField(label='Token do WhatsApp', required=False)

    class Meta:
        model = Provedor
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        ext = self.instance.integracoes_externas or {}
        self.fields['sgp_url'].initial = ext.get('sgp_url', '')
        self.fields['sgp_token'].initial = ext.get('sgp_token', '')
        self.fields['sgp_app'].initial = ext.get('sgp_app', '')
        self.fields['whatsapp_url'].initial = ext.get('whatsapp_url', '')
        self.fields['whatsapp_token'].initial = ext.get('whatsapp_token', '')

    def clean(self):
        cleaned_data = super().clean()
        ext = self.instance.integracoes_externas or {}
        ext['sgp_url'] = cleaned_data.get('sgp_url', '')
        ext['sgp_token'] = cleaned_data.get('sgp_token', '')
        ext['sgp_app'] = cleaned_data.get('sgp_app', '')
        ext['whatsapp_url'] = cleaned_data.get('whatsapp_url', '')
        ext['whatsapp_token'] = cleaned_data.get('whatsapp_token', '')
        cleaned_data['integracoes_externas'] = ext
        return cleaned_data

@admin.register(Provedor)
class ProvedorAdmin(admin.ModelAdmin):
    form = ProvedorAdminForm
    list_display = ('nome', 'site_oficial', 'endereco', 'is_active', 'created_at')
    search_fields = ('nome', 'site_oficial', 'endereco')
    list_filter = ('is_active', 'created_at')
    filter_horizontal = ('admins',)
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'site_oficial', 'endereco', 'is_active')
        }),
        ('Informações de Contato', {
            'fields': ('redes_sociais', 'horarios_atendimento', 'dias_atendimento', 'telefones', 'emails')
        }),
        ('Produtos e Serviços', {
            'fields': ('planos', 'planos_internet', 'planos_descricao', 'dados_adicionais')
        }),
        ('Integração SGP', {
            'fields': ('sgp_url', 'sgp_token', 'sgp_app'),
            'description': 'Configurações para integração com o sistema SGP'
        }),
        ('Integração WhatsApp (Uazapi)', {
            'fields': ('whatsapp_url', 'whatsapp_token'),
            'description': 'Configurações para envio de mensagens via WhatsApp. Cada provedor deve ter sua própria URL e token.'
        }),
        ('Personalização do Agente IA', {
            'fields': ('nome_agente_ia', 'estilo_personalidade', 'uso_emojis', 'personalidade', 'modo_falar', 'informacoes_extras', 'avatar_agente')
        }),
        ('Informações Comerciais', {
            'fields': ('taxa_adesao', 'inclusos_plano', 'multa_cancelamento', 'tipo_conexao', 'prazo_instalacao', 'documentos_necessarios', 'observacoes')
        }),
        ('Administradores', {
            'fields': ('admins',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related('audit_logs')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'timestamp', 'ip_address', 'provedor', 'details')
    list_filter = ('action', 'timestamp', 'provedor')
    search_fields = ('user__username', 'details', 'ip_address')
    readonly_fields = ('timestamp',)
    ordering = ('-timestamp',)
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'provedor')


@admin.register(Canal)
class CanalAdmin(admin.ModelAdmin):
    list_display = ['tipo', 'nome', 'ativo', 'created_at']
    list_filter = ['tipo', 'ativo']
    search_fields = ['nome', 'email', 'url']
    readonly_fields = ['created_at', 'updated_at']

    def get_fields(self, request, obj=None):
        base_fields = ['provedor', 'tipo', 'ativo']
        tipo = None
        if obj:
            tipo = obj.tipo
        elif request.method == 'POST':
            tipo = request.POST.get('tipo')
        if tipo == 'whatsapp' or tipo == 'whatsapp_beta':
            return base_fields + ['nome']
        elif tipo == 'telegram':
            return base_fields + ['api_id', 'api_hash', 'app_title', 'short_name', 'verification_code', 'phone_number']
        elif tipo == 'email':
            return base_fields + ['email', 'smtp_host', 'smtp_port']
        elif tipo == 'website':
            return base_fields + ['url']
        elif tipo == 'instagram':
            return base_fields + ['url']
        elif tipo == 'facebook':
            return base_fields + ['url']
        # Se não selecionou tipo ainda, mostra só os campos válidos
        return base_fields + ['nome', 'api_id', 'api_hash', 'app_title', 'short_name', 'verification_code', 'phone_number', 'email', 'smtp_host', 'smtp_port', 'url']

    def get_tipo_display(self, obj):
        return obj.get_tipo_display()

    class Meta:
        verbose_name = 'Canal'
        verbose_name_plural = 'Canais'

    class Media:
        js = ('core/canal_admin.js',)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'provedor', 'is_active', 'created_at')
    list_filter = ('provedor', 'is_active', 'created_at')
    search_fields = ('name', 'provedor__nome')


# Registrar modelos no site admin customizado
admin_site.register(User, UserAdmin)
admin_site.register(Label, LabelAdmin)
admin_site.register(SystemConfig, SystemConfigAdmin)
admin_site.register(Provedor, ProvedorAdmin)
admin_site.register(AuditLog, AuditLogAdmin) # Register AuditLogAdmin
admin_site.register(Canal, CanalAdmin)
admin_site.register(Team, TeamAdmin)

