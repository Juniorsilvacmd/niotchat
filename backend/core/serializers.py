import requests
from rest_framework import serializers
from .models import Canal, Provedor, Label, User, AuditLog, SystemConfig, Company, CompanyUser, MensagemSistema

class ProvedorSerializer(serializers.ModelSerializer):
    sgp_url = serializers.SerializerMethodField()
    sgp_token = serializers.SerializerMethodField()
    sgp_app = serializers.SerializerMethodField()
    whatsapp_url = serializers.SerializerMethodField()
    whatsapp_token = serializers.SerializerMethodField()
    channels_count = serializers.SerializerMethodField()
    users_count = serializers.SerializerMethodField()
    conversations_count = serializers.SerializerMethodField()

    class Meta:
        model = Provedor
        fields = '__all__'

    def get_sgp_url(self, obj):
        ext = obj.integracoes_externas or {}
        return ext.get('sgp_url', '')
    def get_sgp_token(self, obj):
        ext = obj.integracoes_externas or {}
        return ext.get('sgp_token', '')
    def get_sgp_app(self, obj):
        ext = obj.integracoes_externas or {}
        return ext.get('sgp_app', '')
    def get_whatsapp_url(self, obj):
        ext = obj.integracoes_externas or {}
        return ext.get('whatsapp_url', '')
    def get_whatsapp_token(self, obj):
        ext = obj.integracoes_externas or {}
        return ext.get('whatsapp_token', '')
    
    def get_channels_count(self, obj):
        return obj.canais.filter(ativo=True).count()
    
    def get_users_count(self, obj):
        return obj.admins.count()
    
    def get_conversations_count(self, obj):
        # Contar conversas relacionadas aos inboxes deste provedor
        from conversations.models import Conversation
        return Conversation.objects.filter(inbox__provedor=obj).count()

    def create(self, validated_data):
        print(f"[DEBUG ProvedorSerializer] create - Iniciando criação de provedor")
        print(f"[DEBUG ProvedorSerializer] create - Dados validados: {validated_data}")
        print(f"[DEBUG ProvedorSerializer] create - Dados iniciais: {self.initial_data}")
        
        try:
            provedor = super().create(validated_data)
            print(f"[DEBUG ProvedorSerializer] create - Provedor criado: {provedor.id} - {provedor.nome}")
            return provedor
        except Exception as e:
            print(f"[DEBUG ProvedorSerializer] create - Erro ao criar provedor: {e}")
            raise

    def update(self, instance, validated_data):
        ext = instance.integracoes_externas or {}
        print(f"[DEBUG ProvedorSerializer] Dados recebidos: {self.initial_data}")
        print(f"[DEBUG ProvedorSerializer] Integrações atuais: {ext}")
        
        ext.update({
            'sgp_url': self.initial_data.get('sgp_url', ext.get('sgp_url', '')),
            'sgp_token': self.initial_data.get('sgp_token', ext.get('sgp_token', '')),
            'sgp_app': self.initial_data.get('sgp_app', ext.get('sgp_app', '')),
            'whatsapp_url': self.initial_data.get('whatsapp_url', ext.get('whatsapp_url', '')),
            'whatsapp_token': self.initial_data.get('whatsapp_token', ext.get('whatsapp_token', '')),
        })
        
        print(f"[DEBUG ProvedorSerializer] Integrações atualizadas: {ext}")
        validated_data['integracoes_externas'] = ext
        return super().update(instance, validated_data)

class LabelSerializer(serializers.ModelSerializer):
    provedor = ProvedorSerializer(read_only=True)
    class Meta:
        model = Label
        fields = ['id', 'name', 'color', 'description', 'provedor', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    provedor = serializers.StringRelatedField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'action', 'timestamp', 'ip_address', 'details',
            'provedor', 'conversation_id', 'contact_name', 'channel_type',
            'conversation_duration', 'message_count', 'resolution_type'
        ]
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Formatar duração da conversa para exibição
        if instance.conversation_duration:
            total_seconds = int(instance.conversation_duration.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            
            if hours > 0:
                data['conversation_duration_formatted'] = f"{hours}h {minutes}m {seconds}s"
            elif minutes > 0:
                data['conversation_duration_formatted'] = f"{minutes}m {seconds}s"
            else:
                data['conversation_duration_formatted'] = f"{seconds}s"
        else:
            data['conversation_duration_formatted'] = None
        
        # Formatar ação para exibição em português
        action_display = dict(AuditLog.ACTIONS).get(instance.action, instance.action)
        data['action_display'] = action_display
        
        return data


class ConversationAuditSerializer(serializers.ModelSerializer):
    """Serializer para auditoria completa de conversas"""
    contact = serializers.SerializerMethodField()
    inbox = serializers.SerializerMethodField()
    assigned_agent = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()
    audit_logs = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = None  # Será definido dinamicamente
        fields = [
            'id', 'contact', 'inbox', 'assigned_agent', 'status', 'status_display',
            'messages', 'audit_logs', 'duration', 'message_count',
            'created_at', 'updated_at', 'last_message_at'
        ]
    
    def get_contact(self, obj):
        if hasattr(obj, 'contact') and obj.contact:
            avatar_url = None
            try:
                if obj.contact.avatar:
                    avatar_url = obj.contact.avatar.url
            except:
                pass
            
            return {
                'id': obj.contact.id,
                'name': obj.contact.name,
                'phone': obj.contact.phone,
                'email': obj.contact.email,
                'avatar': avatar_url
            }
        return None
    
    def get_inbox(self, obj):
        if hasattr(obj, 'inbox') and obj.inbox:
            return {
                'id': obj.inbox.id,
                'name': obj.inbox.name,
                'channel_type': obj.inbox.channel_type,
                'provedor': obj.inbox.provedor.nome if obj.inbox.provedor else None
            }
        return None
    
    def get_assigned_agent(self, obj):
        if hasattr(obj, 'assigned_agent') and obj.assigned_agent:
            return {
                'id': obj.assigned_agent.id,
                'username': obj.assigned_agent.username,
                'first_name': obj.assigned_agent.first_name,
                'last_name': obj.assigned_agent.last_name,
                'user_type': obj.assigned_agent.user_type
            }
        return None
    
    def get_messages(self, obj):
        if hasattr(obj, 'messages') and obj.messages.exists():
            messages = []
            for msg in obj.messages.all()[:50]:  # Limitar a 50 mensagens
                message_data = {
                    'id': msg.id,
                    'content': msg.content,
                    'message_type': msg.message_type,
                    'is_from_customer': msg.is_from_customer,
                    'created_at': msg.created_at
                }
                
                # Adicionar campos opcionais se existirem
                if hasattr(msg, 'media_type'):
                    message_data['media_type'] = msg.media_type
                if hasattr(msg, 'file_url'):
                    message_data['file_url'] = msg.file_url
                
                messages.append(message_data)
            return messages
        return []
    
    def get_audit_logs(self, obj):
        from .models import AuditLog
        logs = AuditLog.objects.filter(
            conversation_id=obj.id,
            action__in=['conversation_closed_agent', 'conversation_closed_ai', 'conversation_transferred', 'conversation_assigned']
        ).order_by('-timestamp')
        
        return [{
            'id': log.id,
            'action': log.action,
            'action_display': dict(AuditLog.ACTIONS).get(log.action, log.action),
            'user': log.user.username if log.user else None,
            'timestamp': log.timestamp,
            'details': log.details,
            'resolution_type': log.resolution_type
        } for log in logs]
    
    def get_duration(self, obj):
        if obj.created_at and obj.updated_at:
            duration = obj.updated_at - obj.created_at
            total_seconds = int(duration.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            if hours > 0:
                return f"{hours}h {minutes}m"
            else:
                return f"{minutes}m"
        return "0m"
    
    def get_message_count(self, obj):
        if hasattr(obj, 'messages'):
            return obj.messages.count()
        return 0
    
    def get_status_display(self, obj):
        status_map = {
            'open': 'Em Andamento',
            'pending': 'Pendente',
            'closed': 'Encerrada',
            'resolved': 'Resolvida',
            'transferred': 'Transferida'
        }
        return status_map.get(obj.status, obj.status)

class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfig
        fields = '__all__'

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'slug', 'logo', 'description', 'website', 
            'email', 'phone', 'address', 'is_active', 'created_at', 'updated_at'
        ]

class UserSerializer(serializers.ModelSerializer):
    provedor_id = serializers.SerializerMethodField()
    provedores_admin = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'user_type',
            'avatar', 'phone', 'is_online', 'last_seen', 'created_at', 'updated_at',
            'is_active', 'last_login', 'permissions', 'password',
            'provedor_id', 'provedores_admin',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login']
    
    def get_provedor_id(self, obj):
        provedor = obj.provedores_admin.first() if hasattr(obj, 'provedores_admin') else None
        return provedor.id if provedor else None
    
    def get_provedores_admin(self, obj):
        """Retorna informações completas sobre os provedores do usuário"""
        provedores = obj.provedores_admin.all()
        return [
            {
                'id': p.id,
                'nome': p.nome,
                'is_active': p.is_active
            }
            for p in provedores
        ]
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer específico para criação de usuários com seleção de provedor"""
    password = serializers.CharField(write_only=True, required=True)
    provedor_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name', 'user_type',
            'avatar', 'phone', 'is_active', 'permissions', 'password', 'provedor_id'
        ]
    
    def create(self, validated_data):
        provedor_id = validated_data.pop('provedor_id', None)
        password = validated_data.pop('password', None)
        
        # Criar usuário
        user = super().create(validated_data)
        
        # Definir senha
        if password:
            user.set_password(password)
            user.save()
        
        # Associar ao provedor se especificado
        if provedor_id:
            try:
                provedor = Provedor.objects.get(id=provedor_id)
                provedor.admins.add(user)
            except Provedor.DoesNotExist:
                pass  # Silenciosamente ignora se o provedor não existir
        
        return user

class CompanyUserSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    company = CompanySerializer(read_only=True)
    
    class Meta:
        model = CompanyUser
        fields = ['id', 'user', 'company', 'role', 'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at']

class CompanyUserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyUser
        fields = ['id', 'user', 'company', 'role', 'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at']

class CanalSerializer(serializers.ModelSerializer):
    provedor = ProvedorSerializer(read_only=True)
    state = serializers.SerializerMethodField()
    profile_pic = serializers.SerializerMethodField()
    
    class Meta:
        model = Canal
        fields = [
            'id', 'tipo', 'nome', 'ativo', 'provedor',
            'api_id', 'api_hash', 'app_title', 'short_name', 'verification_code', 'phone_number',  # Telegram
            'email', 'smtp_host', 'smtp_port',  # Email
            'url',  # Website
            'created_at', 'updated_at',
            'state',  # Status de conexão
            'profile_pic',  # Foto de perfil
            'dados_extras',  # Dados extras (instance_id, etc)
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'provedor']

    def get_state(self, obj):
        print(f"[DEBUG CanalSerializer] Buscando state para canal: id={obj.id}, tipo={obj.tipo}, nome={obj.nome}")
        
        # Para WhatsApp normal - usar Evolution API
        if obj.tipo == 'whatsapp' and obj.nome:
            try:
                url = f'https://evo.niochat.com.br/instance/connectionState/{obj.nome}'
                headers = {'apikey': '78be6d7e78e8be03ba5e3cbdf1443f1c'}
                print(f"[DEBUG CanalSerializer] Fazendo request para Evolution: {url}")
                resp = requests.get(url, headers=headers, timeout=5)
                print(f"[DEBUG CanalSerializer] Status code: {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    print(f"[DEBUG CanalSerializer] Resposta Evolution: {data}")
                    return data.get('instance', {}).get('state')
                else:
                    print(f"[DEBUG CanalSerializer] Erro na Evolution: {resp.text}")
            except Exception as e:
                print(f"[DEBUG CanalSerializer] Exception Evolution: {e}")
        
        # Para WhatsApp Beta - usar Uazapi
        elif obj.tipo == 'whatsapp_beta' and obj.dados_extras:
            instance_id = obj.dados_extras.get('instance_id')
            if instance_id:
                try:
                    from .uazapi_client import UazapiClient
                    provedor = obj.provedor
                    if provedor and provedor.integracoes_externas:
                        token = provedor.integracoes_externas.get('whatsapp_token')
                        uazapi_url = provedor.integracoes_externas.get('whatsapp_url')
                        if token and uazapi_url:
                            client = UazapiClient(uazapi_url, token)
                            status_result = client.get_instance_status(instance_id)
                            return status_result.get('instance', {}).get('status')
                except Exception as e:
                    print(f"[DEBUG CanalSerializer] Exception Uazapi: {e}")
        
        return None

    def get_profile_pic(self, obj):
        print(f"[DEBUG CanalSerializer] Buscando profile_pic para canal: id={obj.id}, tipo={obj.tipo}, nome={obj.nome}")
        
        # Para WhatsApp normal - usar Evolution API
        if obj.tipo == 'whatsapp' and obj.nome:
            try:
                url = 'https://evo.niochat.com.br/instance/fetchInstances'
                headers = {'apikey': '78be6d7e78e8be03ba5e3cbdf1443f1c'}
                print(f"[DEBUG CanalSerializer] Fazendo request para Evolution profile_pic: {url}")
                resp = requests.get(url, headers=headers, timeout=5)
                print(f"[DEBUG CanalSerializer] Status code profile_pic: {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    for inst in data:
                        # O campo correto é 'name' (não 'instanceName')
                        if inst.get('name') == obj.nome:
                            profile_pic = inst.get('profilePicUrl')
                            print(f"[DEBUG CanalSerializer] Profile pic encontrado: {profile_pic}")
                            return profile_pic
                else:
                    print(f"[DEBUG CanalSerializer] Erro na Evolution profile_pic: {resp.text}")
            except Exception as e:
                print(f"[DEBUG CanalSerializer] Exception profile_pic Evolution: {e}")
        
        # Para WhatsApp Beta - usar Uazapi
        elif obj.tipo == 'whatsapp_beta' and obj.dados_extras:
            instance_id = obj.dados_extras.get('instance_id')
            if instance_id:
                try:
                    from .uazapi_client import UazapiClient
                    provedor = obj.provedor
                    if provedor and provedor.integracoes_externas:
                        token = provedor.integracoes_externas.get('whatsapp_token')
                        uazapi_url = provedor.integracoes_externas.get('whatsapp_url')
                        if token and uazapi_url:
                            client = UazapiClient(uazapi_url, token)
                            status_result = client.get_instance_status(instance_id)
                            profile_pic = status_result.get('instance', {}).get('profilePicUrl')
                            print(f"[DEBUG CanalSerializer] Profile pic Uazapi: {profile_pic}")
                            return profile_pic
                except Exception as e:
                    print(f"[DEBUG CanalSerializer] Exception profile_pic Uazapi: {e}")
        
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Adicionar status do WhatsApp Beta se for do tipo whatsapp_beta
        if instance.tipo == 'whatsapp_beta' and instance.dados_extras:
            instance_id = instance.dados_extras.get('instance_id')
            if instance_id:
                try:
                    from .uazapi_client import UazapiClient
                    provedor = instance.provedor
                    if provedor and provedor.integracoes_externas:
                        token = provedor.integracoes_externas.get('whatsapp_token')
                        uazapi_url = provedor.integracoes_externas.get('whatsapp_url')
                        if token and uazapi_url:
                            client = UazapiClient(uazapi_url, token)
                            status_result = client.get_instance_status(instance_id)
                            data['betaStatus'] = status_result
                except Exception as e:
                    print(f"Erro ao obter status do WhatsApp Beta: {e}")
                    data['betaStatus'] = None
        
        return data

class MensagemSistemaSerializer(serializers.ModelSerializer):
    provedores_detalhados = serializers.SerializerMethodField()
    visualizacoes_detalhadas = serializers.SerializerMethodField()
    
    class Meta:
        model = MensagemSistema
        fields = [
            'id', 'assunto', 'mensagem', 'tipo', 'provedores', 
            'provedores_count', 'visualizacoes', 'visualizacoes_count',
            'provedores_detalhados', 'visualizacoes_detalhadas',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'provedores_count', 'visualizacoes', 'visualizacoes_count', 'created_at', 'updated_at']
    
    def get_provedores_detalhados(self, obj):
        """Retorna lista de provedores com nomes"""
        from .models import Provedor
        provedores = []
        for provedor_id in obj.provedores:
            try:
                provedor = Provedor.objects.get(id=provedor_id)
                provedores.append({
                    'id': provedor.id,
                    'nome': provedor.nome,
                    'visualizado': str(provedor.id) in obj.visualizacoes
                })
            except Provedor.DoesNotExist:
                provedores.append({
                    'id': provedor_id,
                    'nome': f'Provedor {provedor_id} (não encontrado)',
                    'visualizado': False
                })
        return provedores
    
    def get_visualizacoes_detalhadas(self, obj):
        """Retorna detalhes das visualizações com nomes dos provedores"""
        from .models import Provedor
        visualizacoes = []
        for provedor_id, dados in obj.visualizacoes.items():
            try:
                provedor = Provedor.objects.get(id=int(provedor_id))
                
                # Verificar se dados é string (formato antigo) ou objeto (formato novo)
                if isinstance(dados, str):
                    # Formato antigo: string com timestamp
                    visualizacoes.append({
                        'provedor_id': int(provedor_id),
                        'provedor_nome': provedor.nome,
                        'user_id': None,
                        'username': 'Usuário não identificado',
                        'timestamp': dados
                    })
                else:
                    # Formato novo: objeto com detalhes
                    visualizacoes.append({
                        'provedor_id': int(provedor_id),
                        'provedor_nome': provedor.nome,
                        'user_id': dados.get('user_id'),
                        'username': dados.get('username'),
                        'timestamp': dados.get('timestamp')
                    })
            except (Provedor.DoesNotExist, ValueError):
                if isinstance(dados, str):
                    visualizacoes.append({
                        'provedor_id': provedor_id,
                        'provedor_nome': f'Provedor {provedor_id} (não encontrado)',
                        'user_id': None,
                        'username': 'Usuário não identificado',
                        'timestamp': dados
                    })
                else:
                    visualizacoes.append({
                        'provedor_id': provedor_id,
                        'provedor_nome': f'Provedor {provedor_id} (não encontrado)',
                        'user_id': dados.get('user_id'),
                        'username': dados.get('username'),
                        'timestamp': dados.get('timestamp')
                    })
        return visualizacoes
    
    def create(self, validated_data):
        # Calcula o número de provedores
        provedores = validated_data.get('provedores', [])
        validated_data['provedores_count'] = len(provedores)
        return super().create(validated_data)
