"""
FastAPI application for real-time communication and specific APIs
"""

import os
import sys
import django
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import json
import asyncio
from datetime import datetime
import os
from django.utils import timezone

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'niochat.settings')
django.setup()

# Importar modelos Django após configuração
from django.contrib.auth import get_user_model
from conversations.models import Conversation, Message
from core.models import Company, Provedor

User = get_user_model()

app = FastAPI(title="Nio Chat API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.user_connections: Dict[str, List[WebSocket]] = {}
        self.conversation_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, connection_type: str, connection_id: str):
        await websocket.accept()
        
        if connection_type == "user":
            if connection_id not in self.user_connections:
                self.user_connections[connection_id] = []
            self.user_connections[connection_id].append(websocket)
        elif connection_type == "conversation":
            if connection_id not in self.conversation_connections:
                self.conversation_connections[connection_id] = []
            self.conversation_connections[connection_id].append(websocket)

    def disconnect(self, websocket: WebSocket, connection_type: str, connection_id: str):
        if connection_type == "user" and connection_id in self.user_connections:
            self.user_connections[connection_id].remove(websocket)
            if not self.user_connections[connection_id]:
                del self.user_connections[connection_id]
        elif connection_type == "conversation" and connection_id in self.conversation_connections:
            self.conversation_connections[connection_id].remove(websocket)
            if not self.conversation_connections[connection_id]:
                del self.conversation_connections[connection_id]

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.user_connections:
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    # Remove conexão inválida
                    self.user_connections[user_id].remove(connection)

    async def send_to_conversation(self, conversation_id: str, message: dict):
        if conversation_id in self.conversation_connections:
            for connection in self.conversation_connections[conversation_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    # Remove conexão inválida
                    self.conversation_connections[conversation_id].remove(connection)

    async def broadcast_to_company(self, company_id: str, message: dict):
        # Enviar para todos os usuários da empresa
        try:
            company = Company.objects.get(id=company_id)
            user_ids = company.company_users.values_list('user_id', flat=True)
            
            for user_id in user_ids:
                await self.send_to_user(str(user_id), message)
        except Company.DoesNotExist:
            pass

manager = ConnectionManager()

@app.websocket("/ws/user/{user_id}")
async def websocket_user_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, "user", user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Handle different message types
            if message_data.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif message_data.get("type") == "status_update":
                # Atualizar status do usuário
                try:
                    user = User.objects.get(id=user_id)
                    user.is_online = message_data.get("is_online", True)
                    user.last_seen = timezone.now()
                    user.save()
                    
                    # Broadcast para todos os usuários do mesmo provedor
                    await broadcast_user_status_update(user)
                except User.DoesNotExist:
                    pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, "user", user_id)
        # Marcar usuário como offline
        try:
            user = User.objects.get(id=user_id)
            user.is_online = False
            user.save()
            # Broadcast status offline
            await broadcast_user_status_update(user)
        except User.DoesNotExist:
            pass

@app.websocket("/ws/user_status/")
async def websocket_user_status_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Manter conexão aberta para receber atualizações
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass

async def broadcast_user_status_update(user):
    """Broadcast atualização de status para todos os usuários do mesmo provedor"""
    try:
        # Buscar usuários do mesmo provedor
        if user.user_type == 'superadmin':
            users = User.objects.all()
        elif user.user_type == 'admin':
            provedores = Provedor.objects.filter(admins=user)
            if provedores.exists():
                provedor = provedores.first()
                usuarios_admins = provedor.admins.all()
                usuarios_atendentes = User.objects.filter(user_type='agent', provedores_admin=provedor)
                users = (usuarios_admins | usuarios_atendentes).distinct()
            else:
                users = User.objects.none()
        else:
            # Atendente - broadcast apenas para admins do seu provedor
            provedores = Provedor.objects.filter(admins=user)
            if provedores.exists():
                provedor = provedores.first()
                users = provedor.admins.all()
            else:
                users = User.objects.none()
        
        # Preparar dados de status
        status_data = {
            "type": "user_status_update",
            "users": [
                {
                    "id": u.id,
                    "is_online": u.is_online,
                    "last_seen": u.last_seen.isoformat() if u.last_seen else None
                }
                for u in users
            ]
        }
        
        # Enviar para todos os usuários conectados
        for u in users:
            await manager.send_to_user(str(u.id), status_data)
            
    except Exception as e:
        print(f"Erro ao broadcast status: {e}")

@app.websocket("/ws/conversation/{conversation_id}")
async def websocket_conversation_endpoint(websocket: WebSocket, conversation_id: str):
    await manager.connect(websocket, "conversation", conversation_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Handle different message types
            if message_data.get("type") == "message":
                # Salvar mensagem no banco de dados
                try:
                    conversation = Conversation.objects.get(id=conversation_id)
                    sender_id = message_data.get("sender_id")
                    sender = User.objects.get(id=sender_id) if sender_id else None
                    
                    message = Message.objects.create(
                        conversation=conversation,
                        sender=sender,
                        content=message_data.get("content", ""),
                        message_type=message_data.get("message_type", "outgoing"),
                        content_type=message_data.get("content_type", "text"),
                        attachments=message_data.get("attachments", []),
                        metadata=message_data.get("metadata", {}),
                        is_from_customer=False  # Mensagens enviadas pelo sistema/atendente
                    )
                    
                    # Broadcast para todos conectados na conversa
                    response_data = {
                        "type": "message",
                        "message_id": message.id,
                        "conversation_id": conversation_id,
                        "sender": {
                            "id": sender.id if sender else None,
                            "username": sender.username if sender else "System",
                            "name": f"{sender.first_name} {sender.last_name}".strip() if sender else "System"
                        },
                        "content": message.content,
                        "message_type": message.message_type,
                        "content_type": message.content_type,
                        "attachments": message.attachments,
                        "created_at": message.created_at.isoformat()
                    }
                    
                    await manager.send_to_conversation(conversation_id, response_data)
                    
                    # Notificar usuários relevantes
                    if conversation.assignee:
                        await manager.send_to_user(str(conversation.assignee.id), {
                            "type": "notification",
                            "notification_type": "new_message",
                            "conversation_id": conversation_id,
                            "message": response_data
                        })
                        
                except (Conversation.DoesNotExist, User.DoesNotExist) as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": str(e)
                    }))
                    
            elif message_data.get("type") == "typing":
                # Broadcast typing indicator
                typing_data = {
                    "type": "typing",
                    "user_id": message_data.get("user_id"),
                    "is_typing": message_data.get("is_typing", False),
                    "conversation_id": conversation_id
                }
                await manager.send_to_conversation(conversation_id, typing_data)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, "conversation", conversation_id)

@app.get("/")
async def root():
    return {"message": "Nio Chat FastAPI is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/notifications/send")
async def send_notification(notification_data: dict):
    """Enviar notificação para usuários específicos"""
    user_ids = notification_data.get("user_ids", [])
    message = notification_data.get("message", {})
    
    for user_id in user_ids:
        await manager.send_to_user(str(user_id), {
            "type": "notification",
            **message
        })
    
    return {"status": "notifications sent", "count": len(user_ids)}

@app.post("/api/conversations/{conversation_id}/broadcast")
async def broadcast_to_conversation(conversation_id: str, message_data: dict):
    """Broadcast mensagem para todos conectados em uma conversa"""
    await manager.send_to_conversation(conversation_id, message_data)
    return {"status": "message broadcasted"}

@app.get("/api/stats/connections")
async def get_connection_stats():
    """Estatísticas de conexões ativas"""
    return {
        "active_user_connections": len(manager.user_connections),
        "active_conversation_connections": len(manager.conversation_connections),
        "total_connections": sum(len(conns) for conns in manager.user_connections.values()) + 
                           sum(len(conns) for conns in manager.conversation_connections.values())
    }

@app.post("/api/ia/chat")
async def chat_with_ai(request_data: dict):
    """Endpoint para chat com IA usando ChatGPT"""
    try:
        # Extrair dados da requisição
        user_id = request_data.get('user_id')
        mensagem = request_data.get('mensagem')
        cpf = request_data.get('cpf')
        contexto = request_data.get('contexto', {})
        
        if not mensagem:
            return {"success": False, "erro": "Mensagem é obrigatória"}
        
        # Buscar usuário e empresa
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return {"success": False, "erro": "Usuário não encontrado"}
        
        # Buscar empresa do usuário
        empresa = None
        from core.models import CompanyUser
        cu = CompanyUser.objects.filter(user=user).first()
        if cu:
            empresa = Provedor.objects.filter(id=cu.company_id).first()
        
        if not empresa:
            return {"success": False, "erro": "Empresa não encontrada para o usuário"}
        
        # Importar serviço OpenAI
        from core.openai_service import openai_service
        
        # Integração com SGP se CPF fornecido
        dados_cliente = None
        if cpf:
            try:
                from core.sgp_client import SGPClient
                integracao = empresa.integracoes_externas or {}
                sgp = SGPClient(
                    base_url=integracao.get('url'),
                    token=integracao.get('token'),
                    app_name=integracao.get('app')
                )
                dados_cliente = sgp.consultar_cliente(cpf)
                contexto['dados_cliente'] = dados_cliente
            except Exception as e:
                contexto['dados_cliente'] = f"Erro ao consultar dados do cliente: {str(e)}"
        
        # Gerar resposta com ChatGPT
        resultado = openai_service.generate_response_sync(
            mensagem=mensagem,
            empresa=empresa,
            contexto=contexto
        )
        
        if resultado['success']:
            # Salvar mensagem no banco se conversa_id fornecida
            conversa_id = request_data.get('conversa_id')
            if conversa_id:
                try:
                    conversation = Conversation.objects.get(id=conversa_id)
                    message = Message.objects.create(
                        conversation=conversation,
                        sender=None,  # Mensagem do sistema/IA
                        content=resultado['resposta'],
                        message_type="incoming",
                        content_type="text",
                        is_from_customer=False,
                        metadata={
                            "ai_generated": True,
                            "model": resultado['model'],
                            "tokens_used": resultado['tokens_used'],
                            "empresa": resultado['empresa']
                        }
                    )
                    
                    # Broadcast para todos conectados na conversa
                    response_data = {
                        "type": "ai_message",
                        "message_id": message.id,
                        "conversation_id": conversa_id,
                        "sender": {
                            "id": None,
                            "username": resultado['agente'],
                            "name": resultado['agente']
                        },
                        "content": resultado['resposta'],
                        "message_type": "incoming",
                        "content_type": "text",
                        "metadata": message.metadata,
                        "created_at": message.created_at.isoformat()
                    }
                    
                    await manager.send_to_conversation(conversa_id, response_data)
                    
                except Conversation.DoesNotExist:
                    pass  # Continuar mesmo se conversa não existir
            
            return {
                "success": True,
                "resposta": resultado['resposta'],
                "empresa": resultado['empresa'],
                "agente": resultado['agente'],
                "model": resultado['model'],
                "tokens_used": resultado['tokens_used'],
                "dados_cliente": dados_cliente,
                "contexto_utilizado": contexto
            }
        else:
            return {
                "success": False,
                "erro": resultado['erro']
            }
            
    except Exception as e:
        return {
            "success": False,
            "erro": f"Erro interno: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8011)

