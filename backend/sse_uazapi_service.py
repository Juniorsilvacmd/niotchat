import aiohttp
import asyncio
import json
import redis.asyncio as aioredis
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from datetime import datetime

class UazapiSSEManager:
    def __init__(self):
        self.connections = {}  # token: task
        self.provedor_url_map = {}  # provedor_id: url_base
        self.redis = aioredis.from_url('redis://niochat:E0sJT3wAYFuahovmHkxgy@154.38.176.17:6379/0')
        self.channel_layer = get_channel_layer()

    async def start_sse(self, token, provedor_id):
        url_base = self.provedor_url_map[provedor_id]
        url = f'{url_base.rstrip("/")}/sse?token={token}&events=messages,contacts,chats,chat_labels,groups,presence,labels'
        async with aiohttp.ClientSession() as session:
            while True:
                try:
                    async with session.get(url) as resp:
                        async for line in resp.content:
                            if line.startswith(b'data:'):
                                data = json.loads(line[5:].decode())
                                await self.handle_event(data, provedor_id)
                except Exception as e:
                    print(f"[SSE] Erro: {e}, reconectando em 5s...")
                    await asyncio.sleep(5)

    async def handle_event(self, event, provedor_id):
        await self.redis.lpush(f"sse:{provedor_id}:{event['type']}", json.dumps(event))
        print(f"[SSE][{provedor_id}] {event['type']} - {str(event.get('data'))[:100]}")
        if event['type'] == 'messages':
            await self.update_graficos_mensagens(event, provedor_id)
            await self.update_graficos_midia(event, provedor_id)
            await self.update_graficos_autoatendimento(event, provedor_id)
        if event['type'] == 'chats':
            await self.update_graficos_atendimentos(event, provedor_id)
        if event['type'] == 'presence':
            await self.update_graficos_presenca(event, provedor_id)
        if self.channel_layer:
            await self.channel_layer.group_send(
                f"painel_{provedor_id}",
                {
                    "type": "uazapi.event",
                    "event": event
                }
            )

    async def update_graficos_mensagens(self, event, provedor_id):
        today = datetime.utcnow().strftime('%Y-%m-%d')
        key = f"graficos:{provedor_id}:mensagens:{today}"
        await self.redis.incr(key)
        total = await self.redis.get(key)
        if self.channel_layer:
            await self.channel_layer.group_send(
                f"painel_{provedor_id}",
                {
                    "type": "graficos.mensagens",
                    "total": int(total),
                    "date": today,
                }
            )

    async def update_graficos_atendimentos(self, event, provedor_id):
        # Contar chats abertos
        chats = event.get('data', [])
        if isinstance(chats, dict):
            chats = [chats]
        total_ativos = sum(1 for chat in chats if chat.get('status') == 'open')
        key = f"graficos:{provedor_id}:atendimentos_ativos"
        await self.redis.set(key, total_ativos)
        if self.channel_layer:
            await self.channel_layer.group_send(
                f"painel_{provedor_id}",
                {
                    "type": "graficos.atendimentos",
                    "total": int(total_ativos),
                }
            )

    async def update_graficos_midia(self, event, provedor_id):
        # Contar mensagens com mídia
        today = datetime.utcnow().strftime('%Y-%m-%d')
        msgs = event.get('data', [])
        if isinstance(msgs, dict):
            msgs = [msgs]
        total_midia = sum(1 for msg in msgs if msg.get('type') in ['image', 'audio', 'video', 'document'])
        key = f"graficos:{provedor_id}:midia:{today}"
        await self.redis.incrby(key, total_midia)
        total = await self.redis.get(key)
        if self.channel_layer:
            await self.channel_layer.group_send(
                f"painel_{provedor_id}",
                {
                    "type": "graficos.midia",
                    "total": int(total),
                    "date": today,
                }
            )

    async def update_graficos_autoatendimento(self, event, provedor_id):
        # Exemplo: marcar mensagens respondidas pela IA (supondo campo 'fromIA')
        today = datetime.utcnow().strftime('%Y-%m-%d')
        msgs = event.get('data', [])
        if isinstance(msgs, dict):
            msgs = [msgs]
        total_ia = sum(1 for msg in msgs if msg.get('fromIA'))
        key = f"graficos:{provedor_id}:autoatendimento:{today}"
        await self.redis.incrby(key, total_ia)
        total = await self.redis.get(key)
        if self.channel_layer:
            await self.channel_layer.group_send(
                f"painel_{provedor_id}",
                {
                    "type": "graficos.autoatendimento",
                    "total": int(total),
                    "date": today,
                }
            )

    async def update_graficos_presenca(self, event, provedor_id):
        # Atualizar status de presença (online, digitando, etc)
        status = event.get('data', {}).get('status')
        key = f"graficos:{provedor_id}:presenca"
        await self.redis.set(key, status or '')
        if self.channel_layer:
            await self.channel_layer.group_send(
                f"painel_{provedor_id}",
                {
                    "type": "graficos.presenca",
                    "status": status,
                }
            )

    def add_provedor(self, token, provedor_id, url_base):
        self.provedor_url_map[provedor_id] = url_base
        if token not in self.connections:
            task = asyncio.create_task(self.start_sse(token, provedor_id))
            self.connections[token] = task

    def remove_provedor(self, token):
        if token in self.connections:
            self.connections[token].cancel()
            del self.connections[token]

# Exemplo de uso:
# manager = UazapiSSEManager()
# manager.add_provedor('TOKEN_DO_PROVEDOR', 1, 'https://digitaltelecom.uazapi.com')
# asyncio.get_event_loop().run_forever() 