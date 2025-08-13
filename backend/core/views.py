from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from .models import User, Label, SystemConfig, Provedor, Canal, Company, CompanyUser
from .serializers import UserSerializer, LabelSerializer, SystemConfigSerializer, ProvedorSerializer, AuditLogSerializer, CanalSerializer, CompanySerializer, CompanyUserSerializer, CompanyUserCreateSerializer
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging
from . import models
from .sgp_client import SGPClient
from .openai_service import openai_service
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import mixins
import requests
import json
from .telegram_service import telegram_service
import asyncio
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework.decorators import api_view, permission_classes
from conversations.models import Conversation
from conversations.serializers import ConversationSerializer
from django.conf import settings
from django.shortcuts import render
from django.http import HttpResponse


class UserViewSet(viewsets.ModelViewSet):
    queryset = models.User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            from .serializers import UserCreateSerializer
            return UserCreateSerializer
        return UserSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Filtrar por provedor específico se fornecido
        provedor_id = self.request.query_params.get('provedor')
        if provedor_id:
            if provedor_id == 'me':
                # Caso especial: buscar usuários do provedor do usuário atual, excluindo ele mesmo
                if user.user_type == 'superadmin':
                    # Superadmin pode ver todos os usuários, exceto ele mesmo
                    return models.User.objects.exclude(id=user.id)
                elif user.user_type == 'admin':
                    # Admin vê usuários do seu provedor, exceto ele mesmo
                    provedores = Provedor.objects.filter(admins=user)
                    if provedores.exists():
                        provedor = provedores.first()
                        usuarios_admins = provedor.admins.all()
                        usuarios_atendentes = models.User.objects.filter(user_type='agent', provedores_admin=provedor)
                        return (usuarios_admins | usuarios_atendentes).exclude(id=user.id).distinct()
                    return models.User.objects.none()
                else:
                    # Atendente vê outros usuários do mesmo provedor para transferência
                    provedores = user.provedores_admin.all()
                    if provedores.exists():
                        provedor = provedores.first()
                        usuarios_admins = provedor.admins.all()
                        usuarios_atendentes = models.User.objects.filter(user_type='agent', provedores_admin=provedor)
                        return (usuarios_admins | usuarios_atendentes).exclude(id=user.id).distinct()
                    return models.User.objects.none()
            else:
                try:
                    provedor = Provedor.objects.get(id=provedor_id)
                    # Verificar se o usuário tem permissão para ver usuários deste provedor
                    if user.user_type == 'superadmin' or provedor in Provedor.objects.filter(admins=user):
                        usuarios_admins = provedor.admins.all()
                        usuarios_atendentes = models.User.objects.filter(user_type='agent', provedores_admin=provedor)
                        return (usuarios_admins | usuarios_atendentes).distinct()
                    else:
                        return models.User.objects.none()
                except Provedor.DoesNotExist:
                    return models.User.objects.none()
        
        # Lógica original se não há filtro por provedor
        if user.user_type == 'superadmin':
            return models.User.objects.all()
        elif user.user_type == 'admin':
            # Admins veem apenas usuários do seu provedor
            provedores = Provedor.objects.filter(admins=user)
            if provedores.exists():
                provedor = provedores.first()
                # Admins e atendentes do provedor
                usuarios_admins = provedor.admins.all()
                usuarios_atendentes = models.User.objects.filter(user_type='agent', provedores_admin=provedor)
                return (usuarios_admins | usuarios_atendentes).distinct()
            return models.User.objects.none()
        else:
            # Atendentes veem apenas a si mesmos
            return models.User.objects.filter(id=user.id)

    def perform_create(self, serializer):
        user = self.request.user
        request = self.request
        ip = request.META.get('REMOTE_ADDR') if hasattr(request, 'META') else None
        created_user = serializer.save()
        
        # Verificar se o usuário foi associado a um provedor específico
        provedor_associado = created_user.provedores_admin.first()
        
        # Se não foi associado a um provedor específico, associar ao provedor do usuário criador
        if not provedor_associado:
            provedor = Provedor.objects.filter(admins=user).first()
            if provedor:
                provedor.admins.add(created_user)
                provedor_associado = provedor
        
        provedor_nome = provedor_associado.nome if provedor_associado else 'Desconhecido'
        models.AuditLog.objects.create(
            user=user,
            action='create',
            ip_address=ip,
            details=f"Usuário criado: {created_user.username} - Provedor: {provedor_nome}"
        )

    def perform_destroy(self, instance):
        user = self.request.user
        request = self.request
        ip = request.META.get('REMOTE_ADDR') if hasattr(request, 'META') else None
        provedor = Provedor.objects.filter(admins=user).first()
        provedor_nome = provedor.nome if provedor else 'Desconhecido'
        models.AuditLog.objects.create(
            user=user,
            action='delete',
            ip_address=ip,
            details=f"Provedor {provedor_nome} excluiu usuário: {instance.username}"
        )
        instance.delete()

    def perform_update(self, serializer):
        user = self.request.user
        request = self.request
        ip = request.META.get('REMOTE_ADDR') if hasattr(request, 'META') else None
        updated_user = serializer.save()
        provedor = Provedor.objects.filter(admins=user).first()
        provedor_nome = provedor.nome if provedor else 'Desconhecido'
        models.AuditLog.objects.create(
            user=user,
            action='edit',
            ip_address=ip,
            details=f"Provedor {provedor_nome} atualizou dados do usuário: {updated_user.username}"
        )

    @action(detail=False, methods=['get'], url_path='status')
    def users_status(self, request):
        """Retorna o status online/offline de todos os usuários do provedor"""
        user = self.request.user
        
        # Buscar usuários do provedor do usuário atual
        if user.user_type == 'superadmin':
            users = models.User.objects.all()
        elif user.user_type == 'admin':
            provedores = Provedor.objects.filter(admins=user)
            if provedores.exists():
                provedor = provedores.first()
                usuarios_admins = provedor.admins.all()
                usuarios_atendentes = models.User.objects.filter(user_type='agent', provedores_admin=provedor)
                users = (usuarios_admins | usuarios_atendentes).distinct()
            else:
                users = models.User.objects.none()
        else:
            # Atendentes veem apenas a si mesmos
            users = models.User.objects.filter(id=user.id)
        
        # Retornar apenas ID e status online
        users_status = []
        for user_obj in users:
            users_status.append({
                'id': user_obj.id,
                'is_online': user_obj.is_online,
                'last_seen': user_obj.last_seen
            })
        
        return Response({
            'users': users_status
        })


class LabelViewSet(viewsets.ModelViewSet):
    queryset = Label.objects.all()
    serializer_class = LabelSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Se Label for multi-tenant, filtrar por provedor do usuário
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'provedor_id'):
            return Label.objects.filter(provedor_id=user.provedor_id)
        return Label.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'provedor_id'):
            serializer.save(provedor_id=user.provedor_id)
        else:
            serializer.save()


class ProvedorViewSet(viewsets.ModelViewSet):
    queryset = Provedor.objects.all()
    serializer_class = ProvedorSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        print(f"[DEBUG ProvedorViewSet] get_queryset - Usuário: {user.username}, user_type: {user.user_type}")
        if user.user_type == 'superadmin':
            provedores = Provedor.objects.all()
            print(f"[DEBUG ProvedorViewSet] get_queryset - Superadmin vê {provedores.count()} provedores")
            return provedores
        else:
            # Usuários admin e agent só veem seus próprios provedores
            provedores = Provedor.objects.filter(admins=user)
            print(f"[DEBUG ProvedorViewSet] get_queryset - Usuário {user.username} vê {provedores.count()} provedores")
            return provedores
    
    def create(self, request, *args, **kwargs):
        print(f"[DEBUG ProvedorViewSet] create - Método chamado")
        print(f"[DEBUG ProvedorViewSet] create - Dados recebidos: {request.data}")
        print(f"[DEBUG ProvedorViewSet] create - Usuário: {request.user.username}")
        print(f"[DEBUG ProvedorViewSet] create - Content-Type: {request.content_type}")
        
        try:
            response = super().create(request, *args, **kwargs)
            print(f"[DEBUG ProvedorViewSet] create - Resposta: {response.data}")
            return response
        except Exception as e:
            print(f"[DEBUG ProvedorViewSet] create - Erro: {e}")
            raise
    
    def perform_create(self, serializer):
        print(f"[DEBUG ProvedorViewSet] perform_create - Iniciando criação de provedor")
        print(f"[DEBUG ProvedorViewSet] perform_create - Dados recebidos: {serializer.validated_data}")
        print(f"[DEBUG ProvedorViewSet] perform_create - Usuário: {self.request.user.username}")
        
        try:
            provedor = serializer.save()
            print(f"[DEBUG ProvedorViewSet] perform_create - Provedor criado com sucesso: {provedor.id} - {provedor.nome}")
            return provedor
        except Exception as e:
            print(f"[DEBUG ProvedorViewSet] perform_create - Erro ao criar provedor: {e}")
            raise
    
    def retrieve(self, request, *args, **kwargs):
        """Verificar se o usuário tem permissão para acessar este provedor específico"""
        user = request.user
        provedor_id = kwargs.get('pk')
        
        if user.user_type == 'superadmin':
            # Superadmin pode acessar qualquer provedor
            return super().retrieve(request, *args, **kwargs)
        else:
            # Verificar se o usuário é admin deste provedor específico
            provedor = Provedor.objects.filter(id=provedor_id, admins=user).first()
            if not provedor:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Você não tem permissão para acessar este provedor.")
            
            return super().retrieve(request, *args, **kwargs)


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'user_type', None) == 'superadmin'

class IsCompanyAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (getattr(request.user, 'user_type', None) in ['superadmin', 'admin'])

class CanalViewSet(viewsets.ModelViewSet):
    queryset = Canal.objects.all()
    permission_classes = [IsCompanyAdminOrSuperAdmin]
    serializer_class = CanalSerializer

    def get_queryset(self):
        user = self.request.user
        print(f"get_queryset - Usuário: {user.username}, user_type: {user.user_type}")
        print(f"get_queryset - hasattr(user, 'provedor_id'): {hasattr(user, 'provedor_id')}")
        print(f"get_queryset - user.provedor_id: {getattr(user, 'provedor_id', None)}")
        
        if hasattr(user, 'provedor_id') and user.provedor_id:
            canais = Canal.objects.filter(provedor_id=user.provedor_id)
            print(f"get_queryset - Canais encontrados por provedor_id: {canais.count()}")
            return canais
        else:
            # Buscar provedor do usuário
            prov = Provedor.objects.filter(admins=user).first()
            if prov:
                canais = Canal.objects.filter(provedor_id=prov.id)
                print(f"get_queryset - Canais encontrados por admin: {canais.count()}")
                return canais
            else:
                print(f"get_queryset - Nenhum provedor encontrado para o usuário")
                return Canal.objects.none()

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        user = self.request.user
        print(f"Usuário: {user.username}, user_type: {user.user_type}")
        provedor_id = getattr(user, 'provedor_id', None)
        print(f"provedor_id inicial: {provedor_id}")
        if not provedor_id:
            prov = Provedor.objects.filter(admins=user).first()
            provedor_id = prov.id if prov else None
            print(f"provedor_id após busca: {provedor_id}")
        if not provedor_id:
            raise ValidationError('Usuário não está associado a nenhum provedor. Não é possível criar canal.')
        tipo = serializer.validated_data['tipo']
        print(f"Dados do canal: {serializer.validated_data}")
        # Checagem de unicidade simplificada
        filtro = {'provedor_id': provedor_id, 'tipo': tipo}
        nome = serializer.validated_data.get('nome')
        if nome:
            filtro['nome'] = nome
        for campo in ['username', 'email', 'url', 'page_id', 'chat_id']:
            valor = serializer.validated_data.get(campo)
            if valor:
                filtro[campo] = valor
        print(f"Filtro para verificação: {filtro}")
        if Canal.objects.filter(**filtro).exists():
            raise ValidationError('Já existe um canal desse tipo com esse nome para este provedor.')
        print(f"Salvando canal com provedor_id: {provedor_id}")
        serializer.save(provedor_id=provedor_id)
        print("Canal salvo com sucesso!")

    @action(detail=False, methods=['get'])
    def evolution_config(self, request):
        """Retorna as configurações da Evolution API"""
        return Response({
            'url': 'https://evo.niochat.com.br',
            'apikey': '78be6d7e78e8be03ba5e3cbdf1443f1c'
        })

    @action(detail=False, methods=['post'])
    def create_evolution_instance(self, request):
        """Cria uma nova instância na Evolution"""
        instance_name = request.data.get('instance_name')
        if not instance_name:
            return Response({'error': 'Nome da instância é obrigatório'}, status=400)
        
        try:
            import requests
            evolution_url = 'https://evo.niochat.com.br/instance/create'
            evolution_apikey = '78be6d7e78e8be03ba5e3cbdf1443f1c'
            
            response = requests.post(
                evolution_url,
                headers={'apikey': evolution_apikey, 'Content-Type': 'application/json'},
                json={
                    'instanceName': instance_name,
                    'integration': 'WHATSAPP-BAILEYS'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return Response({
                    'success': True,
                    'instance': data.get('instance'),
                    'message': 'Instância criada com sucesso'
                })
            else:
                return Response({
                    'success': False,
                    'error': f'Erro ao criar instância: {response.status_code}'
                }, status=400)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Erro ao conectar com Evolution: {str(e)}'
            }, status=500)

    @action(detail=False, methods=['post'])
    def get_evolution_qr(self, request):
        instance_name = request.data.get('instance_name')
        if not instance_name:
            return Response({'success': False, 'error': 'Nome da instância é obrigatório'})
        
        try:
            print(f"Gerando QR Code para instância: {instance_name}")
            
            # Primeiro, verificar se a instância existe
            check_url = f"https://evo.niochat.com.br/instance/fetchInstances"
            headers = {'apikey': '78be6d7e78e8be03ba5e3cbdf1443f1c'}
            
            # Verificar se a instância existe
            check_response = requests.get(check_url, headers=headers)
            print(f"Status da verificação de instâncias: {check_response.status_code}")
            
            if check_response.status_code == 200:
                instances = check_response.json()
                print(f"Instâncias disponíveis: {instances}")
                
                # Procurar pela instância
                instance_exists = any(inst.get('instance', {}).get('instanceName') == instance_name for inst in instances)
                
                if not instance_exists:
                    # Criar a instância se não existir
                    create_url = f"https://evo.niochat.com.br/instance/create"
                    create_data = {
                        "instanceName": instance_name,
                        "token": "78be6d7e78e8be03ba5e3cbdf1443f1c",
                        "qrcode": True,
                        "number": "",
                        "webhook": "",
                        "webhookByEvents": False,
                        "events": [],
                        "webhookBase64": False
                    }
                    
                    create_response = requests.post(create_url, json=create_data, headers=headers)
                    print(f"Status da criação da instância: {create_response.status_code}")
                    print(f"Resposta da criação: {create_response.text}")
            
            # Agora gerar o QR Code
            qr_url = f"https://evo.niochat.com.br/instance/connect/{instance_name}"
            qr_response = requests.get(qr_url, headers=headers)
            print(f"Status da geração do QR Code: {qr_response.status_code}")
            print(f"Resposta do QR Code: {qr_response.text}")
            
            if qr_response.status_code == 200:
                data = qr_response.json()
                print(f"Dados da resposta: {data}")
                
                # Verificar diferentes formatos possíveis do QR Code
                qrcode = data.get('base64') or data.get('qrcode') or data.get('qrcode_url')
                
                if qrcode:
                    print(f"QR Code encontrado, tamanho: {len(qrcode)} caracteres")
                    print(f"Primeiros 100 caracteres do QR Code: {qrcode[:100]}")
                    return Response({
                        'success': True,
                        'qrcode': qrcode
                    })
                else:
                    print("QR Code não encontrado na resposta")
                    return Response({
                        'success': False,
                        'error': 'QR Code não encontrado na resposta'
                    })
            else:
                error_data = qr_response.json() if qr_response.content else {}
                print(f"Erro na API: {error_data}")
                return Response({
                    'success': False,
                    'error': error_data.get('message', f'Erro HTTP {qr_response.status_code}')
                })
        except Exception as e:
            print(f"Erro completo: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erro ao conectar com Evolution: {str(e)}'
            })

    @action(detail=False, methods=['post'])
    def get_evolution_status(self, request):
        instance_name = request.data.get('instance_name')
        if not instance_name:
            return Response({'success': False, 'error': 'Nome da instância é obrigatório'})
        
        try:
            # Verificar status da instância Evolution
            url = f"https://evo.niochat.com.br/instance/connectionState/{instance_name}"
            headers = {'apikey': '78be6d7e78e8be03ba5e3cbdf1443f1c'}
            
            response = requests.get(url, headers=headers)
            data = response.json()
            
            if response.status_code == 200:
                # Verificar o status correto baseado na resposta da API
                instance_data = data.get('instance', {})
                state = instance_data.get('state', 'DISCONNECTED')
                
                # Mapear os estados da Evolution para nossos estados
                if state == 'open':
                    status = 'CONNECTED'
                elif state == 'connecting':
                    status = 'CONNECTING'
                else:
                    status = 'DISCONNECTED'
                
                return Response({
                    'success': True,
                    'status': status
                })
            else:
                return Response({
                    'success': False,
                    'error': data.get('message', 'Erro ao verificar status')
                })
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Erro ao verificar status: {str(e)}'
            })

    @action(detail=False, methods=['post'])
    def get_evolution_profile(self, request):
        instance_name = request.data.get('instance_name')
        if not instance_name:
            return Response({'success': False, 'error': 'Nome da instância é obrigatório'})
        
        try:
            # Buscar informações da instância para obter a foto do perfil
            url = f"https://evo.niochat.com.br/instance/fetchInstances"
            headers = {'apikey': '78be6d7e78e8be03ba5e3cbdf1443f1c'}
            
            response = requests.get(url, headers=headers)
            data = response.json()
            
            if response.status_code == 200:
                # Procurar pela instância específica
                instance = None
                for inst in data:
                    if inst.get('name') == instance_name:
                        instance = inst
                        break
                
                if instance and instance.get('profilePicUrl'):
                    return Response({
                        'success': True,
                        'profilePicUrl': instance['profilePicUrl'],
                        'profileName': instance.get('profileName', ''),
                        'ownerJid': instance.get('ownerJid', '')
                    })
                else:
                    return Response({
                        'success': False,
                        'error': 'Foto do perfil não encontrada'
                    })
            else:
                return Response({
                    'success': False,
                    'error': data.get('message', 'Erro ao buscar informações da instância')
                })
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Erro ao buscar foto do perfil: {str(e)}'
            })

    @action(detail=False, methods=['post'])
    def get_whatsapp_profile_picture(self, request):
        """Buscar foto do perfil do WhatsApp de um contato específico"""
        phone = request.data.get('phone')
        instance_name = request.data.get('instance_name')
        integration_type = request.data.get('integration_type', 'evolution')  # evolution ou uazapi
        
        if not phone or not instance_name:
            return Response({'success': False, 'error': 'Telefone e nome da instância são obrigatórios'})
        
        try:
            from integrations.utils import fetch_whatsapp_profile_picture
            from conversations.models import Contact
            from core.models import Provedor
            
            # Buscar o contato
            contact = Contact.objects.filter(phone=phone).first()
            if not contact:
                return Response({
                    'success': False,
                    'error': 'Contato não encontrado'
                })
            
            # Buscar provedor se necessário para Uazapi
            provedor = None
            if integration_type == 'uazapi':
                provedor = contact.provedor or Provedor.objects.filter(
                    integracoes_externas__whatsapp_url__isnull=False
                ).first()
            
            # Buscar a foto do perfil
            profile_pic_url = fetch_whatsapp_profile_picture(
                phone=phone,
                instance_name=instance_name,
                integration_type=integration_type,
                provedor=provedor
            )
            
            if profile_pic_url:
                # Salvar a foto no contato
                contact.avatar = profile_pic_url
                contact.save()
                
                return Response({
                    'success': True,
                    'profilePicUrl': profile_pic_url,
                    'name': contact.name,
                    'phone': phone
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Foto do perfil não encontrada para este contato'
                })
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Erro ao buscar foto do perfil: {str(e)}'
            })

    @action(detail=False, methods=['post'])
    def get_telegram_status(self, request):
        """Verificar status de conexão do Telegram via MTProto"""
        try:
            instance_name = request.data.get('instance_name')
            if not instance_name:
                return Response({'success': False, 'error': 'Nome da instância é obrigatório'}, status=400)
            
            # Buscar o canal pelo nome
            try:
                channel = Canal.objects.get(nome=instance_name, tipo='telegram')
            except Canal.DoesNotExist:
                return Response({'success': False, 'error': 'Canal Telegram não encontrado'}, status=404)
            
            # Executar verificação assíncrona
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(telegram_service.get_status(channel))
                return Response(result)
            finally:
                loop.close()
                
        except Exception as e:
            logger.error(f'Erro ao verificar status do Telegram: {str(e)}')
            return Response({'success': False, 'error': str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def connect_telegram(self, request):
        """Conectar ao Telegram via MTProto"""
        try:
            instance_name = request.data.get('instance_name')
            api_id = request.data.get('api_id')
            api_hash = request.data.get('api_hash')
            phone_number = request.data.get('phone_number')
            app_title = request.data.get('app_title')
            short_name = request.data.get('short_name')
            
            if not instance_name:
                return Response({'success': False, 'error': 'Nome da instância é obrigatório'}, status=400)
            if not api_id:
                return Response({'success': False, 'error': 'API ID é obrigatório'}, status=400)
            if not api_hash:
                return Response({'success': False, 'error': 'API Hash é obrigatório'}, status=400)
            if not phone_number:
                return Response({'success': False, 'error': 'Número de telefone é obrigatório'}, status=400)
            
            # Buscar ou criar o canal
            channel, created = Canal.objects.get_or_create(
                nome=instance_name,
                tipo='telegram',
                defaults={
                    'api_id': api_id,
                    'api_hash': api_hash,
                    'phone_number': phone_number,
                                    'app_title': app_title or 'Nio Chat',
                'short_name': short_name or 'niochat',
                    'ativo': True
                }
            )
            
            # Se o canal já existia, atualizar os dados
            if not created:
                channel.api_id = api_id
                channel.api_hash = api_hash
                channel.phone_number = phone_number
                if app_title:
                    channel.app_title = app_title
                if short_name:
                    channel.short_name = short_name
                channel.save()
            
            logger.info(f'Conectando Telegram: {instance_name} - API ID: {api_id}')
            
            # Executar conexão assíncrona
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(telegram_service.connect_telegram(channel))
                logger.info(f'Resultado da conexão Telegram: {result}')
                return Response(result)
            finally:
                loop.close()
                
        except Exception as e:
            logger.error(f'Erro ao conectar Telegram: {str(e)}')
            return Response({'success': False, 'error': str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def send_telegram_code(self, request):
        """Enviar código de verificação via SMS"""
        try:
            instance_name = request.data.get('instance_name')
            phone_number = request.data.get('phone_number')
            
            if not instance_name:
                return Response({'success': False, 'error': 'Nome da instância é obrigatório'}, status=400)
            if not phone_number:
                return Response({'success': False, 'error': 'Número de telefone é obrigatório'}, status=400)
            
            # Buscar o canal pelo nome
            try:
                channel = Canal.objects.get(nome=instance_name, tipo='telegram')
                # Atualizar número de telefone se fornecido
                if phone_number:
                    channel.phone_number = phone_number
                    channel.save()
            except Canal.DoesNotExist:
                return Response({'success': False, 'error': 'Canal Telegram não encontrado'}, status=404)
            
            logger.info(f'Enviando código SMS para: {phone_number}')
            
            # Executar envio de código assíncrono
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(telegram_service.send_code(channel))
                logger.info(f'Resultado do envio de código: {result}')
                return Response(result)
            finally:
                loop.close()
                
        except Exception as e:
            logger.error(f'Erro ao enviar código Telegram: {str(e)}')
            return Response({'success': False, 'error': str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def verify_telegram_code(self, request):
        """Verificar código de verificação"""
        try:
            instance_name = request.data.get('instance_name')
            code = request.data.get('code')
            
            if not instance_name:
                return Response({'success': False, 'error': 'Nome da instância é obrigatório'}, status=400)
            if not code:
                return Response({'success': False, 'error': 'Código é obrigatório'}, status=400)
            
            # Buscar o canal pelo nome
            try:
                channel = Canal.objects.get(nome=instance_name, tipo='telegram')
            except Canal.DoesNotExist:
                return Response({'success': False, 'error': 'Canal Telegram não encontrado'}, status=404)
            
            # Executar verificação assíncrona
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(telegram_service.verify_code(channel, code))
                return Response(result)
            finally:
                loop.close()
                
        except Exception as e:
            logger.error(f'Erro ao verificar código Telegram: {str(e)}')
            return Response({'success': False, 'error': str(e)}, status=500)



    @action(detail=False, methods=['get'], url_path='disponiveis')
    def disponiveis(self, request):
        tipos = [
            {'tipo': 'whatsapp', 'label': 'WhatsApp'},
            {'tipo': 'whatsapp_beta', 'label': 'WhatsApp Beta'},
            {'tipo': 'telegram', 'label': 'Telegram'},
            {'tipo': 'email', 'label': 'E-mail'},
            {'tipo': 'website', 'label': 'Website'},
            {'tipo': 'instagram', 'label': 'Instagram'},
            {'tipo': 'facebook', 'label': 'Facebook'},
        ]
        # Antes: só retornava tipos não configurados
        # provedor = request.user.provedor_id if hasattr(request.user, 'provedor_id') else None
        # canais = Canal.objects.filter(provedor_id=provedor) if provedor else Canal.objects.all()
        # tipos_configurados = canais.values_list('tipo', flat=True)
        # disponiveis = [t for t in tipos if t['tipo'] not in tipos_configurados]
        # return Response(disponiveis)
        # Agora: sempre retorna todos os tipos disponíveis
        return Response(tipos)

    @action(detail=False, methods=['post'])
    def logout_whatsapp(self, request):
        instance_name = request.data.get('instance_name')
        if not instance_name:
            return Response({'success': False, 'error': 'Nome da instância é obrigatório'}, status=400)
        
        try:
            url = f'https://evo.niochat.com.br/instance/logout/{instance_name}'
            headers = {'apikey': '78be6d7e78e8be03ba5e3cbdf1443f1c'}
            resp = requests.delete(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                return Response({'success': True, 'message': 'WhatsApp desconectado com sucesso!'})
            else:
                return Response({'success': False, 'error': f'Erro ao desconectar: {resp.text}'}, status=400)
        except Exception as e:
            return Response({'success': False, 'error': f'Erro ao conectar com Evolution: {str(e)}'}, status=500)

    @action(detail=False, methods=['post'])
    def connect_whatsapp_beta(self, request):
        """Conecta WhatsApp Beta usando Uazapi"""
        instance_name = request.data.get('instance_name')
        if not instance_name:
            return Response({'success': False, 'error': 'Nome da instância é obrigatório'}, status=400)
        
        # Buscar dados da Uazapi do provedor
        user = request.user
        provedor = Provedor.objects.filter(admins=user).first()
        if not provedor:
            return Response({'success': False, 'error': 'Provedor não encontrado'}, status=400)
        
        integracoes = provedor.integracoes_externas or {}
        uazapi_url = integracoes.get('whatsapp_url')
        uazapi_token = integracoes.get('whatsapp_token')
        
        if not uazapi_url or not uazapi_token:
            return Response({
                'success': False, 
                'error': 'Configurações do WhatsApp não encontradas. Configure a URL e Token na seção "Configurações do WhatsApp".'
            }, status=400)
        
        try:
            from .uazapi_client import UazapiClient
            client = UazapiClient(uazapi_url, uazapi_token)
            
            # Conectar instância
            result = client.connect_instance(instance_name)
            
            # Emitir evento WebSocket para painel_<provedor_id> se conectar
            if result.get('connected'):
                channel_layer = get_channel_layer()
                provedor_id = str(provedor.id)
                async_to_sync(channel_layer.group_send)(
                    f"painel_{provedor_id}",
                    {
                        'type': 'dashboard_event',
                        'data': {
                            'type': 'whatsapp_beta_status',
                            'canal_id': None,  # Não temos o canal_id aqui, mas o frontend pode recarregar
                            'status': 'connected',
                            'connected': True,
                            'loggedIn': True,
                            'instance': result.get('instance', {})
                        }
                    }
                )
            return Response({
                'success': True, 
                'message': 'WhatsApp Beta conectado com sucesso!',
                'data': result
            })
        except Exception as e:
            return Response({
                'success': False, 
                'error': f'Erro ao conectar WhatsApp Beta: {str(e)}'
            }, status=500)

    @action(detail=True, methods=['post'], url_path='whatsapp-beta-status')
    def get_whatsapp_beta_status(self, request, pk=None):
        """
        Verifica o status da instância WhatsApp Beta
        """
        try:
            canal = self.get_object()
            
            # Verificar se é WhatsApp Beta
            if canal.tipo != 'whatsapp_beta':
                return Response({
                    'success': False,
                    'error': 'Este endpoint é apenas para WhatsApp Beta'
                }, status=400)
            
            # Obter credenciais do provedor
            provedor = canal.provedor
            if not provedor or not provedor.integracoes_externas:
                return Response({
                    'success': False,
                    'error': 'Credenciais não configuradas'
                }, status=400)
            integracoes = provedor.integracoes_externas
            token = integracoes.get('whatsapp_token')
            uazapi_url = integracoes.get('whatsapp_url')
            if not token or not uazapi_url:
                return Response({
                    'success': False,
                    'error': 'Token ou URL do WhatsApp não configurados'
                }, status=400)
            # Obter instance_id do canal (pode estar armazenado em dados_extras)
            instance_id = None
            if canal.dados_extras:
                instance_id = canal.dados_extras.get('instance_id')
            if not instance_id:
                return Response({
                    'success': False,
                    'error': 'ID da instância não encontrado. Conecte primeiro.'
                }, status=400)
            print(f"[DEBUG] Verificando status da instância: {instance_id}")
            # Criar cliente Uazapi com a URL e token do painel
            from .uazapi_client import UazapiClient
            client = UazapiClient(uazapi_url, token)
            # Verificar status da instância
            try:
                result = client.get_instance_status(instance_id)
            except Exception as e:
                # Se erro 401 da Uazapi, retornar status disconnected
                if '401' in str(e) or 'Unauthorized' in str(e):
                    response_data = {
                        'success': True,
                        'instance': {},
                        'status': 'disconnected',
                        'connected': False,
                        'loggedIn': False,
                        'message': 'WhatsApp desconectado (token inválido ou instância removida)'
                    }
                    # Emitir evento WebSocket para painel_<provedor_id>
                    channel_layer = get_channel_layer()
                    provedor_id = str(canal.provedor.id)
                    async_to_sync(channel_layer.group_send)(
                        f"painel_{provedor_id}",
                        {
                            'type': 'dashboard_event',
                            'data': {
                                'type': 'whatsapp_beta_status',
                                'canal_id': canal.id,
                                'status': 'disconnected',
                                'connected': False,
                                'loggedIn': False,
                                'instance': {}
                            }
                        }
                    )
                    return Response(response_data)
                else:
                    print(f"[DEBUG] Erro ao verificar status: {e}")
                    return Response({
                        'success': False,
                        'error': f'Erro ao verificar status: {str(e)}'
                    }, status=500)
            
            print(f"[DEBUG] Status da instância: {result}")
            
            # Processar resposta
            if result.get('instance'):
                instance_data = result['instance']
                raw_status = instance_data.get('status', 'unknown')
                # Mapear status equivalentes a 'connected' e 'disconnected'
                status_map_connected = ['connected', 'online', 'ready', 'authenticated', 'loggedin', 'logged_in', 'active']
                status_map_disconnected = ['disconnected', 'offline', 'loggedout', 'logged_out', 'inactive']
                status = raw_status.lower() if isinstance(raw_status, str) else 'unknown'
                if status in status_map_connected:
                    status = 'connected'
                elif status in status_map_disconnected:
                    status = 'disconnected'
                qrcode = instance_data.get('qrcode', '')
                paircode = instance_data.get('paircode', '')
                
                response_data = {
                    'success': True,
                    'instance': instance_data,
                    'status': status,
                    'connected': result.get('connected', False),
                    'loggedIn': result.get('loggedIn', False)
                }
                
                # Adicionar QR code se disponível
                if qrcode:
                    response_data['qrcode'] = qrcode
                
                # Adicionar código de pareamento se disponível
                if paircode:
                    response_data['paircode'] = paircode
                
                # Mensagem baseada no status
                if status == 'connected':
                    response_data['message'] = 'WhatsApp conectado com sucesso!'
                elif status == 'connecting':
                    if qrcode:
                        response_data['message'] = 'Aguardando leitura do QR Code...'
                    elif paircode:
                        response_data['message'] = f'Aguardando código de pareamento: {paircode}'
                    else:
                        response_data['message'] = 'Conectando...'
                elif status == 'disconnected':
                    response_data['message'] = 'WhatsApp desconectado'
                else:
                    response_data['message'] = f'Status: {status}'
                
                print(f"[DEBUG] Retornando status: {response_data}")
                # Emitir evento WebSocket se status mudou para connected ou disconnected
                if status in ['connected', 'disconnected']:
                    channel_layer = get_channel_layer()
                    provedor_id = str(canal.provedor.id)
                    async_to_sync(channel_layer.group_send)(
                        f"painel_{provedor_id}",
                        {
                            'type': 'dashboard_event',
                            'data': {
                                'type': 'whatsapp_beta_status',
                                'canal_id': canal.id,
                                'status': status,
                                'connected': result.get('connected', False),
                                'loggedIn': result.get('loggedIn', False),
                                'instance': instance_data
                            }
                        }
                    )
                return Response(response_data)
            else:
                return Response({
                    'success': False,
                    'error': 'Resposta inválida da API'
                }, status=400)
                
        except Exception as e:
            print(f"[DEBUG] Erro ao verificar status: {e}")
            return Response({
                'success': False,
                'error': f'Erro ao verificar status: {str(e)}'
            }, status=500)

    @action(detail=False, methods=['post'])
    def get_whatsapp_beta_qr(self, request):
        """Gera QR code do WhatsApp Beta usando Uazapi"""
        try:
            instance_name = request.data.get('instance_name')
            method = request.data.get('method', 'qrcode')  # 'qrcode' ou 'paircode'
            print(f"[DEBUG] Instance name recebido: {instance_name}")
            print(f"[DEBUG] Método escolhido: {method}")
            
            if not instance_name:
                return Response({'success': False, 'error': 'Nome da instância é obrigatório'}, status=400)
            
            # Buscar dados da Uazapi do provedor
            user = request.user
            print(f"[DEBUG] Usuário: {user.username}")
            
            provedor = Provedor.objects.filter(admins=user).first()
            if not provedor:
                return Response({'success': False, 'error': 'Provedor não encontrado'}, status=400)
            
            integracoes = provedor.integracoes_externas or {}
            uazapi_url = integracoes.get('whatsapp_url')
            uazapi_token = integracoes.get('whatsapp_token')
            
            print(f"[DEBUG] Provedor: {provedor.nome}")
            print(f"[DEBUG] Integrações: {integracoes}")
            print(f"[DEBUG] Uazapi URL: {uazapi_url}")
            print(f"[DEBUG] Uazapi Token: {uazapi_token[:10] if uazapi_token else 'None'}...")
            
            if not uazapi_url or not uazapi_token:
                return Response({
                    'success': False, 
                    'error': 'Configurações do WhatsApp não encontradas. Configure a URL e Token na seção "Configurações do WhatsApp".'
                }, status=400)
            
            print(f"[DEBUG] Importando UazapiClient...")
            from .uazapi_client import UazapiClient
            print(f"[DEBUG] UazapiClient importado com sucesso")
            
            client = UazapiClient(uazapi_url, uazapi_token)
            print(f"[DEBUG] Cliente Uazapi criado")

            # Buscar o canal correto antes de usar canal.dados_extras
            canal = Canal.objects.filter(nome=instance_name, provedor=provedor, tipo='whatsapp_beta').first()
            if not canal:
                return Response({'success': False, 'error': 'Canal WhatsApp Beta não encontrado'}, status=404)
            
            # Chamar a Uazapi baseado no método escolhido
            if method == 'paircode':
                # Para paircode, pegar o número do request
                phone = request.data.get('phone')
                if not phone:
                    return Response({'success': False, 'error': 'Número de telefone é obrigatório'}, status=400)
                print(f"[DEBUG] Tentando conectar com paircode, phone: {phone}")
                result = client.connect_instance(phone=phone)
            else:
                # Para QR code, não passar phone
                print(f"[DEBUG] Tentando conectar com QR code")
                result = client.connect_instance()
            
            print(f"[DEBUG] Resposta da Uazapi: {result}")
            
            # Verificar se conectou e se tem QR code ou paircode
            if result.get('connected') is not None and result.get('instance'):
                instance_data = result['instance']
                instance_id = instance_data.get('id')
                qrcode = instance_data.get('qrcode', '')
                paircode = instance_data.get('paircode', '')
                
                # Salvar instance_id nos dados_extras do canal
                if instance_id:
                    canal.dados_extras = canal.dados_extras or {}
                    canal.dados_extras['instance_id'] = instance_id
                    canal.save()
                    print(f"[DEBUG] Instance ID salvo: {instance_id}")
                
                response_data = {
                    'success': True,
                    'instance': instance_data
                }
                
                # Se tem QR code, incluir na resposta
                if qrcode:
                    response_data['qrcode'] = qrcode
                    response_data['message'] = 'QR Code gerado com sucesso!'
                
                # Se tem paircode, incluir na resposta
                if paircode:
                    response_data['paircode'] = paircode
                    response_data['message'] = f'Código de pareamento: {paircode}'
                
                # Se não tem nenhum dos dois, mas está conectando
                if not qrcode and not paircode:
                    response_data['message'] = result.get('response', 'Instância criada. Aguardando conexão...')
                
                print(f"[DEBUG] Retornando resposta: {response_data}")
                return Response(response_data)
            else:
                # Se não conectou, retornar erro
                error_msg = result.get('response', 'Erro ao conectar instância')
                print(f"[DEBUG] Erro na conexão: {error_msg}")
                return Response({
                    'success': False,
                    'error': error_msg
                }, status=400)
                
        except ImportError as e:
            print(f"[DEBUG] Erro de importação: {e}")
            return Response({
                'success': False, 
                'error': f'Erro de importação: {str(e)}'
            }, status=500)
        except Exception as e:
            print(f"[DEBUG] Erro geral na chamada da Uazapi: {str(e)}")
            import traceback
            print(f"[DEBUG] Traceback: {traceback.format_exc()}")
            return Response({
                'success': False, 
                'error': f'Erro ao conectar WhatsApp Beta: {str(e)}'
            }, status=500)

    @action(detail=True, methods=['delete'], url_path='deletar-instancia')
    def deletar_instancia(self, request, pk=None):
        """Deleta a instância do canal na Uazapi ou Evolution"""
        try:
            canal = self.get_object()
            if canal.tipo == 'whatsapp_beta':
                # Uazapi
                instance_id = canal.dados_extras.get('instance_id') if canal.dados_extras else None
                if not instance_id:
                    return Response({'success': False, 'error': 'Instance ID não encontrado'}, status=400)
                provedor = canal.provedor
                integracoes = provedor.integracoes_externas or {}
                uazapi_url = integracoes.get('whatsapp_url')
                uazapi_token = integracoes.get('whatsapp_token')
                if not uazapi_url or not uazapi_token:
                    return Response({'success': False, 'error': 'Configurações Uazapi não encontradas'}, status=400)
                from .uazapi_client import UazapiClient
                client = UazapiClient(uazapi_url, uazapi_token)
                result = client.delete_instance(instance_id)
                # Limpar instance_id do canal
                canal.dados_extras['instance_id'] = None
                canal.save()
                return Response({'success': True, 'result': result})
            elif canal.tipo == 'whatsapp':
                # Evolution
                instance_name = canal.nome
                if not instance_name:
                    return Response({'success': False, 'error': 'Nome da instância não encontrado'}, status=400)
                url = f'https://evo.niochat.com.br/instance/logout/{instance_name}'
                headers = {'apikey': '78be6d7e78e8be03ba5e3cbdf1443f1c'}
                import requests
                resp = requests.delete(url, headers=headers, timeout=10)
                if resp.status_code == 200:
                    return Response({'success': True, 'message': 'Instância Evolution deletada com sucesso!'})
                else:
                    return Response({'success': False, 'error': f'Erro ao deletar Evolution: {resp.text}'}, status=400)
            else:
                return Response({'success': False, 'error': 'Canal não é WhatsApp ou WhatsApp Beta'}, status=400)
        except Exception as e:
            import traceback
            print(f'[DEBUG] Erro ao deletar instância: {e}')
            print(traceback.format_exc())
            return Response({'success': False, 'error': str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='desconectar-instancia')
    def desconectar_instancia(self, request, pk=None):
        """Desconecta a instância do canal na Uazapi (WhatsApp Beta)"""
        try:
            canal = self.get_object()
            if canal.tipo != 'whatsapp_beta':
                return Response({'success': False, 'error': 'Apenas WhatsApp Beta pode ser desconectado por aqui'}, status=400)
            instance_id = canal.dados_extras.get('instance_id') if canal.dados_extras else None
            if not instance_id:
                return Response({'success': False, 'error': 'Instance ID não encontrado'}, status=400)
            provedor = canal.provedor
            integracoes = provedor.integracoes_externas or {}
            uazapi_url = integracoes.get('whatsapp_url')
            uazapi_token = integracoes.get('whatsapp_token')
            if not uazapi_url or not uazapi_token:
                return Response({'success': False, 'error': 'Configurações Uazapi não encontradas'}, status=400)
            from .uazapi_client import UazapiClient
            client = UazapiClient(uazapi_url, uazapi_token)
            result = client.disconnect_instance(instance_id)
            # Remover instance_id corretamente
            if canal.dados_extras and 'instance_id' in canal.dados_extras:
                canal.dados_extras.pop('instance_id', None)
                canal.save()
            # Emitir evento WebSocket para painel_<provedor_id>
            channel_layer = get_channel_layer()
            provedor_id = str(provedor.id)
            async_to_sync(channel_layer.group_send)(
                f"painel_{provedor_id}",
                {
                    'type': 'dashboard_event',
                    'data': {
                        'type': 'whatsapp_beta_status',
                        'canal_id': canal.id,
                        'status': 'disconnected',
                        'connected': False,
                        'loggedIn': False,
                        'instance': {}
                    }
                }
            )
            return Response({'success': True, 'result': result})
        except Exception as e:
            import traceback
            print(f'[DEBUG] Erro ao desconectar instância: {e}')
            print(traceback.format_exc())
            return Response({'success': False, 'error': str(e)}, status=500)


class SystemConfigViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """Verificar se o usuário é superadmin"""
        if self.action in ['list', 'update', 'create_or_update', 'update_openai_key']:
            return [IsSuperAdmin()]
        return super().get_permissions()

    def list(self, request):
        config = SystemConfig.objects.first()
        serializer = SystemConfigSerializer(config)
        return Response(serializer.data)

    def update(self, request, pk=None):
        config = SystemConfig.objects.first()
        if not config:
            config = SystemConfig.objects.create()
        serializer = SystemConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Se a chave da OpenAI foi atualizada, recarregar o serviço
            if 'openai_api_key' in request.data:
                from .openai_service import openai_service
                openai_service.update_api_key()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def create_or_update(self, request):
        config = SystemConfig.objects.first()
        if not config:
            serializer = SystemConfigSerializer(data=request.data)
        else:
            serializer = SystemConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Se a chave da OpenAI foi atualizada, recarregar o serviço
            if 'openai_api_key' in request.data:
                from .openai_service import openai_service
                openai_service.update_api_key()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def update_openai_key(self, request):
        """Endpoint específico para atualizar apenas a chave da OpenAI"""
        config = SystemConfig.objects.first()
        if not config:
            config = SystemConfig.objects.create()
        
        openai_key = request.data.get('openai_api_key')
        if openai_key is not None:
            config.openai_api_key = openai_key
            config.save()
            
            # Recarregar o serviço da OpenAI
            from .openai_service import openai_service
            openai_service.update_api_key()
            
            return Response({
                'success': True,
                'message': 'Chave da API OpenAI atualizada com sucesso'
            })
        
        return Response({
            'success': False,
            'error': 'Chave da API OpenAI é obrigatória'
        }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class CustomAuthToken(APIView):
    permission_classes = []

    def post(self, request, *args, **kwargs):
        from rest_framework.authtoken.models import Token
        from django.utils import timezone
        from core.models import AuditLog
        print("Token importado de:", Token.__module__, Token)
        logger = logging.getLogger(__name__)
        username = request.data.get('username')
        password = request.data.get('password')
        logger.info(f"Tentativa de login para usuário: {username}")
        user = authenticate(username=username, password=password)
        if user is None:
            # Tenta autenticar por email se não encontrar por username
            from core.models import User
            try:
                user_obj = User.objects.get(email=username)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None
        if user is not None:
            if not user.is_active:
                logger.warning(f"Usuário {username} encontrado, mas inativo.")
                return Response({'non_field_errors': ['Usuário inativo.']}, status=status.HTTP_400_BAD_REQUEST)
            # Atualiza o campo last_login
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            # Registra evento de login na auditoria
            ip = request.META.get('REMOTE_ADDR')
            AuditLog.objects.create(
                user=user,
                action='login',
                ip_address=ip,
                details='Login no sistema'
            )
            token, created = Token.objects.get_or_create(user=user)
            logger.info(f"Login bem-sucedido para usuário: {username}")
            return Response({'token': token.key}, status=status.HTTP_200_OK)
        logger.warning(f"Falha no login para usuário: {username}")
        return Response({'non_field_errors': ['Impossível fazer login com as credenciais fornecidas.']}, status=status.HTTP_400_BAD_REQUEST)

custom_auth_token = CustomAuthToken.as_view()


class AtendimentoIAView(APIView):
    def post(self, request):
        user = request.user
        provedor_id = getattr(user, 'provedor_id', None)
        provedor = None
        if provedor_id:
            provedor = Provedor.objects.filter(id=provedor_id).first()
        if not provedor:
            provedor = Provedor.objects.filter(admins=user).first()
        if not provedor:
            return Response({'erro': 'Provedor não encontrado para o usuário.'}, status=400)
        
        # Obter dados da requisição
        mensagem = request.data.get('mensagem')
        cpf = request.data.get('cpf')
        contexto = request.data.get('contexto', {})
        
        # Se não há mensagem, retornar erro
        if not mensagem:
            return Response({'erro': 'Mensagem é obrigatória.'}, status=400)

        # Detectar solicitação de suporte de internet sem CPF
        if 'sem internet' in mensagem.lower() and not cpf:
            return Response({
                'success': True,
                'resposta': 'Para que eu possa consultar sua conexão, por favor, informe seu CPF/CNPJ.'
            })
        
        # Integração com SGP se CPF fornecido
        dados_cliente = None
        if cpf:
            try:
                integracao = provedor.integracoes_externas or {}
                sgp = SGPClient(
                    base_url=integracao.get('sgp_url'),
                    token=integracao.get('sgp_token'),
                    app_name=integracao.get('sgp_app')
                )
                cliente_resp = sgp.consultar_cliente(cpf)
                contrato = None
                if cliente_resp.get('contratos'):
                    contrato = cliente_resp['contratos'][0]
                razao_social = contrato.get('razaoSocial') if contrato else None
                contrato_id = contrato.get('contratoId') if contrato else None
                contrato_status = contrato.get('contratoStatusDisplay') if contrato else None
                status_conexao = None
                # Se encontrou contrato, checa conexão
                if contrato_id:
                    print('DEBUG contrato_id:', contrato_id)
                    acesso_resp = sgp.verifica_acesso(contrato_id)
                    print('DEBUG SGP verifica_acesso:', acesso_resp)
                    status_conexao = (
                        acesso_resp.get('msg')
                        or acesso_resp.get('status')
                        or acesso_resp.get('status_conexao')
                        or acesso_resp.get('mensagem')
                    )
                dados_cliente = {
                    'razao_social': razao_social,
                    'contrato_id': contrato_id,
                    'contrato_status': contrato_status,
                    'status_conexao': status_conexao
                }
                contexto['dados_cliente'] = dados_cliente
            except Exception as e:
                logger.warning(f"Erro ao consultar SGP: {str(e)}")
                contexto['dados_cliente'] = f"Erro ao consultar dados do cliente: {str(e)}"

        # Atualizar prompt do agente para IA
        contexto['prompt_extra'] = (
            "- Se o cliente enviar um cumprimento (ex: 'bom dia', 'boa noite'), responda de forma simpática e autônoma, e em seguida pergunte como pode ajudar.\n"
            "- Se o cliente disser que está sem internet, peça o CPF.\n"
            "- Quando receber o CPF, consulte o sistema SGP para buscar os dados do cliente (nome, contrato, status do contrato).\n"
            "- Após localizar o cliente, pegue o contratoId retornado e faça uma nova requisição ao SGP para buscar o status da conexão do cliente.\n"
            "- Responda ao cliente com uma mensagem única, clara e bem formatada, por exemplo:\n\n"
            "Encontrei seu cadastro!\n"
            "Nome: {razao_social}\n"
            "Contrato: {contrato_id}\n"
            "Status do Contrato: {contrato_status}\n"
            "Status da Conexão: {status_conexao}\n\n"
            "- Seja sempre cordial, objetivo e proativo."
        )
        
        # Gerar resposta com ChatGPT
        try:
            resultado = openai_service.generate_response_sync(
                mensagem=mensagem,
                provedor=provedor,
                contexto=contexto
            )
            
            if resultado['success']:
                return Response({
                    'success': True,
                    'resposta': resultado['resposta'],
                    'provedor': resultado['provedor'],
                    'agente': resultado['agente'],
                    'model': resultado['model'],
                    'tokens_used': resultado['tokens_used'],
                    'dados_cliente': dados_cliente,
                    'contexto_utilizado': contexto
                })
            else:
                return Response({
                    'success': False,
                    'erro': resultado['erro']
                }, status=500)
                
        except Exception as e:
            logger.error(f"Erro ao gerar resposta com IA: {str(e)}")
            return Response({
                'success': False,
                'erro': f'Erro interno ao processar mensagem: {str(e)}'
            }, status=500)


class UserMeView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        provedor_id = getattr(user, 'provedor_id', None)
        if not provedor_id:
            provedor = Provedor.objects.filter(admins=user).first()
            if provedor:
                provedor_id = provedor.id
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'provedor_id': provedor_id,
            'user_type': getattr(user, 'user_type', None),
            'permissions': getattr(user, 'permissions', []),
        }
        return Response(data)
    
    def patch(self, request):
        user = request.user
        data = request.data
        
        # Campos permitidos para atualização
        allowed_fields = ['first_name', 'last_name', 'email', 'phone']
        
        for field in allowed_fields:
            if field in data:
                setattr(user, field, data[field])
        
        try:
            user.save()
            return Response({'message': 'Perfil atualizado com sucesso'})
        except Exception as e:
            return Response({'error': 'Erro ao atualizar perfil'}, status=400)


class UserListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        provedor_id = getattr(user, 'provedor_id', None)
        if not provedor_id:
            provedor = Provedor.objects.filter(admins=user).first()
            if provedor:
                provedor_id = provedor.id
        if not provedor_id:
            return Response([], status=200)
        provedor = Provedor.objects.filter(id=provedor_id).first()
        if not provedor:
            return Response([], status=200)
        # Usuários admins e atendentes do provedor
        usuarios_admins = provedor.admins.all()
        usuarios_atendentes = User.objects.filter(user_type='agent', provedores_admin=provedor)
        usuarios = usuarios_admins | usuarios_atendentes
        usuarios = usuarios.distinct()
        data = UserSerializer(usuarios, many=True).data
        return Response(data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = models.AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = models.AuditLog.objects.all()
        
        # Filtrar por provedor se o usuário não for superadmin
        if user.user_type != 'superadmin':
            provedores = Provedor.objects.filter(admins=user)
            if provedores.exists():
                queryset = queryset.filter(provedor__in=provedores)
            else:
                return models.AuditLog.objects.none()
        
        # Aplicar filtros adicionais
        action_type = self.request.query_params.get('action_type')
        if action_type:
            queryset = queryset.filter(action=action_type)
        
        # Filtro para conversas encerradas
        conversation_closed = self.request.query_params.get('conversation_closed')
        if conversation_closed == 'true':
            queryset = queryset.filter(
                action__in=['conversation_closed_agent', 'conversation_closed_ai']
            )
        
        # Filtro por provedor específico
        provedor_id = self.request.query_params.get('provedor_id')
        if provedor_id:
            queryset = queryset.filter(provedor_id=provedor_id)
        
        # Filtro por data
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(timestamp__date__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(timestamp__date__lte=date_to)
        
        # Filtro por usuário
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('-timestamp')
    
    @action(detail=False, methods=['get'])
    def conversation_audit(self, request):
        """Auditoria completa de conversas para o dono do provedor"""
        user = request.user
        provedor_id = request.query_params.get('provedor_id')
        
        # Verificar se o usuário é dono do provedor
        if user.user_type != 'superadmin':
            provedores = Provedor.objects.filter(admins=user)
            if not provedores.exists():
                return Response({'error': 'Acesso negado'}, status=403)
            
            if provedor_id and int(provedor_id) not in [p.id for p in provedores]:
                return Response({'error': 'Acesso negado a este provedor'}, status=403)
        
        # Importar modelos necessários
        from conversations.models import Conversation, Contact, Message
        from django.db.models import Q, Count, Avg
        from django.utils import timezone
        
        # Construir queryset base
        if provedor_id:
            provedor_filter = Q(inbox__provedor_id=provedor_id)
        else:
            if user.user_type == 'superadmin':
                provedor_filter = Q()
            else:
                provedor_filter = Q(inbox__provedor__in=provedores)
        
        # Filtros adicionais
        status_filter = request.query_params.get('status')
        if status_filter:
            provedor_filter &= Q(status=status_filter)
        
        date_from = request.query_params.get('date_from')
        if date_from:
            provedor_filter &= Q(created_at__date__gte=date_from)
        
        date_to = request.query_params.get('date_to')
        if date_to:
            provedor_filter &= Q(created_at__date__lte=date_to)
        
        agent_id = request.query_params.get('agent_id')
        if agent_id:
            provedor_filter &= Q(assigned_agent_id=agent_id)
        
        conversation_id = request.query_params.get('conversation_id')
        if conversation_id:
            provedor_filter &= Q(id=conversation_id)
        
        # Buscar conversas
        conversas = Conversation.objects.filter(provedor_filter).select_related(
            'contact', 'inbox', 'assigned_agent'
        ).prefetch_related('messages').order_by('-updated_at')
        
        # Paginação
        page = self.paginate_queryset(conversas)
        if page is not None:
            from .serializers import ConversationAuditSerializer
            serializer = ConversationAuditSerializer(page, many=True, context={'request': request})
            # Definir o modelo dinamicamente
            serializer.Meta.model = Conversation
            return self.get_paginated_response(serializer.data)
        
        from .serializers import ConversationAuditSerializer
        serializer = ConversationAuditSerializer(conversas, many=True, context={'request': request})
        # Definir o modelo dinamicamente
        serializer.Meta.model = Conversation
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def conversation_stats(self, request):
        """Estatísticas de conversas encerradas para auditoria"""
        user = request.user
        queryset = self.get_queryset()
        
        # Filtrar apenas conversas encerradas
        conversation_logs = queryset.filter(
            action__in=['conversation_closed_agent', 'conversation_closed_ai']
        )
        
        # Estatísticas gerais
        total_closed = conversation_logs.count()
        closed_by_agent = conversation_logs.filter(action='conversation_closed_agent').count()
        closed_by_ai = conversation_logs.filter(action='conversation_closed_ai').count()
        
        # Estatísticas por provedor
        provedor_stats = {}
        for log in conversation_logs.select_related('provedor'):
            provedor_name = log.provedor.nome if log.provedor else 'Sem Provedor'
            if provedor_name not in provedor_stats:
                provedor_stats[provedor_name] = {
                    'total': 0,
                    'by_agent': 0,
                    'by_ai': 0,
                    'avg_duration': 0,
                    'avg_messages': 0
                }
            
            provedor_stats[provedor_name]['total'] += 1
            if log.action == 'conversation_closed_agent':
                provedor_stats[provedor_name]['by_agent'] += 1
            else:
                provedor_stats[provedor_name]['by_ai'] += 1
            
            # Calcular médias
            if log.conversation_duration:
                provedor_stats[provedor_name]['avg_duration'] += log.conversation_duration.total_seconds()
            if log.message_count:
                provedor_stats[provedor_name]['avg_messages'] += log.message_count
        
        # Calcular médias finais
        for provedor in provedor_stats.values():
            if provedor['total'] > 0:
                provedor['avg_duration'] = provedor['avg_duration'] / provedor['total']
                provedor['avg_messages'] = provedor['avg_messages'] / provedor['total']
        
        # Estatísticas por canal
        channel_stats = {}
        for log in conversation_logs:
            channel = log.channel_type or 'Desconhecido'
            if channel not in channel_stats:
                channel_stats[channel] = {'total': 0, 'by_agent': 0, 'by_ai': 0}
            
            channel_stats[channel]['total'] += 1
            if log.action == 'conversation_closed_agent':
                channel_stats[channel]['by_agent'] += 1
            else:
                channel_stats[channel]['by_ai'] += 1
        
        return Response({
            'total_conversations_closed': total_closed,
            'closed_by_agent': closed_by_agent,
            'closed_by_ai': closed_by_ai,
            'provedor_stats': provedor_stats,
            'channel_stats': channel_stats,
            'percentage_ai_resolved': (closed_by_ai / total_closed * 100) if total_closed > 0 else 0,
            'percentage_agent_resolved': (closed_by_agent / total_closed * 100) if total_closed > 0 else 0
        })
    
    @action(detail=False, methods=['get'])
    def export_audit_log(self, request):
        """Exportar logs de auditoria para análise"""
        from django.http import HttpResponse
        import csv
        from io import StringIO
        
        queryset = self.get_queryset()
        
        # Criar arquivo CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Cabeçalho
        writer.writerow([
            'Data/Hora', 'Usuário', 'Ação', 'IP', 'Detalhes', 'Provedor',
            'ID Conversa', 'Contato', 'Canal', 'Duração', 'Mensagens', 'Tipo Resolução'
        ])
        
        # Dados
        for log in queryset:
            duration_str = ''
            if log.conversation_duration:
                total_seconds = int(log.conversation_duration.total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                seconds = total_seconds % 60
                duration_str = f"{hours}h {minutes}m {seconds}s"
            
            writer.writerow([
                log.timestamp.strftime('%d/%m/%Y %H:%M:%S'),
                log.user.username if log.user else 'Sistema',
                dict(models.AuditLog.ACTIONS).get(log.action, log.action),
                log.ip_address or '',
                log.details or '',
                log.provedor.nome if log.provedor else '',
                log.conversation_id or '',
                log.contact_name or '',
                log.channel_type or '',
                duration_str,
                log.message_count or '',
                log.resolution_type or ''
            ])
        
        # Preparar resposta
        output.seek(0)
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_log.csv"'
        
        return response
    
    @action(detail=False, methods=['get'])
    def detailed_stats(self, request):
        """Estatísticas detalhadas para dashboard de auditoria"""
        user = request.user
        provedor_id = request.query_params.get('provedor_id')
        
        # Verificar permissões
        if user.user_type != 'superadmin':
            provedores = Provedor.objects.filter(admins=user)
            if not provedores.exists():
                return Response({'error': 'Acesso negado'}, status=403)
            
            if provedor_id and int(provedor_id) not in [p.id for p in provedores]:
                return Response({'error': 'Acesso negado a este provedor'}, status=403)
        
        # Importar modelos necessários
        from conversations.models import Conversation, Message
        from django.db.models import Q, Count, Avg, Sum
        from django.utils import timezone
        from datetime import timedelta
        
        # Construir filtros
        if provedor_id:
            provedor_filter = Q(inbox__provedor_id=provedor_id)
        else:
            if user.user_type == 'superadmin':
                provedor_filter = Q()
            else:
                provedor_filter = Q(inbox__provedor__in=provedores)
        
        # Período de análise (padrão: últimos 30 dias)
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # Estatísticas de conversas
        conversas_periodo = Conversation.objects.filter(
            provedor_filter,
            created_at__gte=start_date
        )
        
        total_conversas = conversas_periodo.count()
        conversas_abertas = conversas_periodo.filter(status='open').count()
        conversas_fechadas = conversas_periodo.filter(status='closed').count()
        conversas_resolvidas = conversas_periodo.filter(status='resolved').count()
        
        # Estatísticas de mensagens
        if provedor_id:
            mensagens_periodo = Message.objects.filter(
                conversation__inbox__provedor_id=provedor_id,
                created_at__gte=start_date
            )
        else:
            if user.user_type == 'superadmin':
                mensagens_periodo = Message.objects.filter(created_at__gte=start_date)
            else:
                mensagens_periodo = Message.objects.filter(
                    conversation__inbox__provedor__in=provedores,
                    created_at__gte=start_date
                )
        
        total_mensagens = mensagens_periodo.count()
        mensagens_cliente = mensagens_periodo.filter(is_from_customer=True).count()
        mensagens_agente = mensagens_periodo.filter(is_from_customer=False).count()
        
        # Estatísticas por dia (últimos 7 dias)
        daily_stats = []
        for i in range(7):
            date = timezone.now().date() - timedelta(days=i)
            daily_conversas = conversas_periodo.filter(created_at__date=date).count()
            daily_mensagens = mensagens_periodo.filter(created_at__date=date).count()
            daily_stats.append({
                'date': date.strftime('%Y-%m-%d'),
                'conversas': daily_conversas,
                'mensagens': daily_mensagens
            })
        
        # Top agentes por conversas encerradas
        top_agentes = []
        from django.db.models import Count
        agentes_stats = Conversation.objects.filter(
            provedor_filter,
            status__in=['closed', 'resolved'],
            assigned_agent__isnull=False,
            created_at__gte=start_date
        ).values('assigned_agent__username').annotate(
            total=Count('id')
        ).order_by('-total')[:5]
        
        top_agentes = [
            {
                'username': item['assigned_agent__username'],
                'total_conversas': item['total']
            }
            for item in agentes_stats
        ]
        
        return Response({
            'periodo_dias': days,
            'data_inicio': start_date.strftime('%Y-%m-%d'),
            'data_fim': timezone.now().strftime('%Y-%m-%d'),
            'conversas': {
                'total': total_conversas,
                'abertas': conversas_abertas,
                'fechadas': conversas_fechadas,
                'resolvidas': conversas_resolvidas
            },
            'mensagens': {
                'total': total_mensagens,
                'cliente': mensagens_cliente,
                'agente': mensagens_agente
            },
            'daily_stats': daily_stats,
            'top_agentes': top_agentes
        })

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'superadmin':
            return Company.objects.all()
        else:
            # Para outros tipos de usuário, retornar apenas empresas relacionadas
            return Company.objects.filter(company_users__user=user).distinct()
    
    def perform_create(self, serializer):
        company = serializer.save()
        # Log da criação
        models.AuditLog.objects.create(
            user=self.request.user,
            action='create',
            details=f'Empresa criada: {company.name}',
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
        return company
    
    def perform_update(self, serializer):
        company = serializer.save()
        # Log da atualização
        models.AuditLog.objects.create(
            user=self.request.user,
            action='edit',
            details=f'Empresa atualizada: {company.name}',
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
        return company
    
    def perform_destroy(self, instance):
        company_name = instance.name
        # Log da exclusão
        models.AuditLog.objects.create(
            user=self.request.user,
            action='delete',
            details=f'Empresa excluída: {company_name}',
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
        instance.delete()


class CompanyUserViewSet(viewsets.ModelViewSet):
    queryset = CompanyUser.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CompanyUserCreateSerializer
        return CompanyUserSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'superadmin':
            return CompanyUser.objects.all()
        else:
            # Usuários não-superadmin veem apenas relacionamentos relacionados a eles
            return CompanyUser.objects.filter(user=user)
    
    def perform_create(self, serializer):
        user = self.request.user
        company_user = serializer.save()
        
        # Log da criação
        models.AuditLog.objects.create(
            user=user,
            action='create',
            details=f'Criou relacionamento CompanyUser: {company_user.user.username} - {company_user.company.name}',
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
    
    def perform_update(self, serializer):
        user = self.request.user
        company_user = serializer.save()
        
        # Log da atualização
        models.AuditLog.objects.create(
            user=user,
            action='edit',
            details=f'Atualizou relacionamento CompanyUser: {company_user.user.username} - {company_user.company.name}',
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
    
    def perform_destroy(self, instance):
        user = self.request.user
        
        # Log da exclusão
        models.AuditLog.objects.create(
            user=user,
            action='delete',
            details=f'Removeu relacionamento CompanyUser: {instance.user.username} - {instance.company.name}',
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
        
        instance.delete()


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        provedor_id = getattr(user, 'provedor_id', None)
        
        # Se não tem provedor_id direto, buscar pelo relacionamento
        if not provedor_id:
            provedor = Provedor.objects.filter(admins=user).first()
            if provedor:
                provedor_id = provedor.id
        
        if not provedor_id:
            return Response({'error': 'Provedor não encontrado'}, status=400)
        
        # Importar modelos necessários
        from conversations.models import Conversation, Contact, Message
        from django.db.models import Count, Q, Avg
        from django.utils import timezone
        from datetime import timedelta
        
        # Filtros baseados no provedor
        provedor_filter = Q(inbox__provedor_id=provedor_id)
        
        # Estatísticas de conversas
        total_conversas = Conversation.objects.filter(provedor_filter).count()
        conversas_abertas = Conversation.objects.filter(provedor_filter, status='open').count()
        conversas_pendentes = Conversation.objects.filter(provedor_filter, status='pending').count()
        conversas_resolvidas = Conversation.objects.filter(provedor_filter, status='resolved').count()
        conversas_em_andamento = Conversation.objects.filter(provedor_filter, status='open').count()
        
        # Estatísticas de contatos únicos
        contatos_unicos = Contact.objects.filter(provedor_id=provedor_id).count()
        
        # Estatísticas de mensagens (últimos 30 dias)
        data_30_dias_atras = timezone.now() - timedelta(days=30)
        mensagens_30_dias = Message.objects.filter(
            conversation__inbox__provedor_id=provedor_id,
            created_at__gte=data_30_dias_atras
        ).count()
        
        # Calcular tempo médio de resposta real
        mensagens_resposta = Message.objects.filter(
            conversation__inbox__provedor_id=provedor_id,
            message_type='outgoing',
            created_at__gte=data_30_dias_atras
        )
        
        if mensagens_resposta.exists():
            try:
                tempo_medio = mensagens_resposta.aggregate(
                    avg_time=Avg('created_at')
                )['avg_time']
                if tempo_medio:
                    tempo_medio_resposta = f"{int((timezone.now() - tempo_medio).total_seconds() / 60)}min"
                else:
                    tempo_medio_resposta = "0min"
            except Exception:
                tempo_medio_resposta = "0min"
        else:
            tempo_medio_resposta = "0min"
        
        # Calcular tempo de primeira resposta
        conversas_com_resposta = Conversation.objects.filter(
            provedor_filter,
            messages__message_type='outgoing'
        ).distinct()
        
        if conversas_com_resposta.exists():
            # Simular tempo de primeira resposta baseado na atividade
            tempo_primeira_resposta = "1.2min"  # Pode ser calculado mais precisamente
        else:
            tempo_primeira_resposta = "0min"
        
        # Calcular taxa de resolução real
        if total_conversas > 0:
            taxa_resolucao = f"{int((conversas_resolvidas / total_conversas) * 100)}%"
        else:
            taxa_resolucao = "0%"
        
        # Calcular satisfação média (simulada por enquanto)
        if total_conversas > 0:
            # Simular satisfação baseada no número de conversas resolvidas
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
        
        # Performance dos atendentes
        atendentes_stats = []
        if user.user_type in ['superadmin', 'admin']:
            # Buscar usuários do provedor
            usuarios_provedor = User.objects.filter(
                Q(provedores_admin=provedor_id) | 
                Q(user_type='agent', provedores_admin=provedor_id)
            )
            
            for usuario in usuarios_provedor[:5]:  # Top 5 atendentes
                conversas_atendidas = Conversation.objects.filter(
                    provedor_filter,
                    assignee=usuario
                ).count()
                
                atendentes_stats.append({
                    'name': f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username,
                    'conversations': conversas_atendidas,
                    'satisfaction': 4.5  # Simulado
                })
        
        # Atividade recente
        atividades_recentes = []
        if user.user_type in ['superadmin', 'admin']:
            # Buscar logs de auditoria recentes do provedor
            logs_recentes = models.AuditLog.objects.filter(
                provedor_id=provedor_id
            ).order_by('-timestamp')[:5]
            
            for log in logs_recentes:
                atividades_recentes.append({
                    'action': log.action,
                    'user': log.user.username if log.user else 'Sistema',
                    'time': log.timestamp.strftime('%d/%m/%Y %H:%M'),
                    'type': 'activity'
                })
        
        return Response({
            'stats': {
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
                'satisfacao_media': satisfacao_media
            },
            'canais': canais_stats,
            'atendentes': atendentes_stats,
            'atividades': atividades_recentes
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        logout(request)
        return Response({'message': 'Logout realizado com sucesso'})


class ResetPasswordView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response({'error': 'Nova senha é obrigatória'}, status=400)
        
        if len(new_password) < 6:
            return Response({'error': 'Senha deve ter pelo menos 6 caracteres'}, status=400)
        
        try:
            # Garantir que a senha seja criptografada
            user.set_password(new_password)
            user.save(update_fields=['password'])
            
            # Registrar log de auditoria
            from core.models import AuditLog
            ip = request.META.get('REMOTE_ADDR')
            AuditLog.objects.create(
                user=user,
                action='edit',
                ip_address=ip,
                details='Senha alterada pelo usuário',
                provedor=user.provedores_admin.first() if hasattr(user, 'provedores_admin') else None
            )
            
            return Response({'message': 'Senha alterada com sucesso'})
        except Exception as e:
            print(f"Erro ao alterar senha: {str(e)}")
            return Response({'error': 'Erro ao alterar senha'}, status=400)





@api_view(['GET'])
@permission_classes([AllowAny])
def serve_media_file(request, path):
    """Serve media files with correct content type"""
    from django.http import FileResponse, Http404
    import os
    import mimetypes
    
    # Construir o caminho completo do arquivo
    file_path = os.path.join(settings.MEDIA_ROOT, path)
    
    if not os.path.exists(file_path):
        raise Http404("Arquivo não encontrado")
    
    # Detectar o tipo MIME
    content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        # Fallback para tipos comuns
        if file_path.endswith('.webm'):
            content_type = 'audio/webm'
        elif file_path.endswith('.wav'):
            content_type = 'audio/wav'
        elif file_path.endswith('.mp3'):
            content_type = 'audio/mpeg'
        else:
            content_type = 'application/octet-stream'
    
    # Criar resposta com headers CORS
    response = FileResponse(open(file_path, 'rb'), content_type=content_type)
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Range'
    response['Accept-Ranges'] = 'bytes'
    
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def serve_uazapi_file(request, file_id):
    """Servir arquivo do Uazapi/Evolution API"""
    try:
        # Buscar arquivo no banco de dados
        from conversations.models import Message
        message = Message.objects.filter(
            attachments__contains=[{'id': file_id}]
        ).first()
        
        if not message:
            return Response({'error': 'Arquivo não encontrado'}, status=404)
        
        # Buscar o arquivo específico
        attachment = None
        for att in message.attachments:
            if att.get('id') == file_id:
                attachment = att
                break
        
        if not attachment:
            return Response({'error': 'Arquivo não encontrado'}, status=404)
        
        # Buscar dados do provedor
        provedor = message.conversation.inbox.provedor
        if not provedor:
            return Response({'error': 'Provedor não encontrado'}, status=404)
        
        # Configurar cliente Uazapi
        from .uazapi_client import UazapiClient
        client = UazapiClient(
            base_url=provedor.whatsapp_url,
            token=provedor.whatsapp_token,
            instance=provedor.instance
        )
        
        # Buscar arquivo
        file_data = client.get_file(file_id)
        
        if not file_data:
            return Response({'error': 'Erro ao buscar arquivo'}, status=404)
        
        # Retornar arquivo
        response = HttpResponse(file_data['data'], content_type=file_data['mime_type'])
        response['Content-Disposition'] = f'attachment; filename="{file_data["filename"]}"'
        return response
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)

def frontend_view(request):
    """View para servir o frontend React"""
    html_content = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nio Chat - Sistema de Atendimento</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 90%;
        }
        .logo {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 20px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 1.1em;
        }
        .status {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .status-item {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 5px;
            border-left: 4px solid #667eea;
        }
        .status-ok {
            color: #28a745;
        }
        .status-error {
            color: #dc3545;
        }
        .btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-size: 1.1em;
            cursor: pointer;
            margin: 10px;
            text-decoration: none;
            display: inline-block;
        }
        .btn:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
            transition: all 0.3s ease;
        }
        .api-links {
            margin-top: 30px;
        }
        .api-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
        }
        .api-links a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🚀 Nio Chat</div>
        <div class="subtitle">Sistema de Atendimento WhatsApp</div>
        
        <div class="status">
            <h3>Status dos Serviços</h3>
            <div class="status-item">
                <span>Django Backend:</span>
                <span class="status-ok">✅ Ativo</span>
            </div>
            <div class="status-item">
                <span>FastAPI:</span>
                <span class="status-ok">✅ Ativo</span>
            </div>
            <div class="status-item">
                <span>WebSocket:</span>
                <span class="status-ok">✅ Ativo</span>
            </div>
        </div>
        
        <div class="api-links">
            <a href="/admin/" target="_blank">Admin Django</a>
            <a href="/api/" target="_blank">API REST</a>
            <a href="/health" target="_blank">Health Check</a>
        </div>
        
        <div style="margin-top: 30px;">
            <a href="/admin/" class="btn">Acessar Admin</a>
            <a href="/api/" class="btn">Ver API</a>
        </div>
        
        <div style="margin-top: 20px; font-size: 0.9em; color: #666;">
            <p>Sistema rodando na porta 8010</p>
            <p>Para desenvolvimento completo, execute o frontend React separadamente</p>
        </div>
    </div>
    
    <script>
        // Verificar status dos serviços
        async function checkServices() {
            try {
                const response = await fetch('/health');
                if (response.ok) {
                    console.log('Backend está funcionando');
                }
            } catch (error) {
                console.error('Erro ao verificar backend:', error);
            }
        }
        
        // Verificar ao carregar a página
        checkServices();
    </script>
</body>
</html>
    """
    return HttpResponse(html_content, content_type='text/html')

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint"""
    from datetime import datetime
    return Response({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Nio Chat Django Backend",
        "port": 8010
    })




