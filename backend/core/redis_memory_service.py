"""
Serviço de memória Redis para conversas e provedores
"""

import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import redis
import redis.asyncio as aioredis
from django.conf import settings

logger = logging.getLogger(__name__)

class RedisMemoryService:
    def __init__(self):
        self.redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
        self.redis = None
        self.default_ttl = 24 * 60 * 60  # 24 horas em segundos
        
    async def get_redis_connection(self):
        """Obtém conexão Redis assíncrona"""
        if not self.redis:
            try:
                self.redis = aioredis.from_url(self.redis_url)
                await self.redis.ping()
                logger.info("Conexão Redis estabelecida com sucesso")
            except Exception as e:
                logger.error(f"Erro ao conectar com Redis: {e}")
                return None
        return self.redis
    
    def get_redis_sync(self):
        """Obtém conexão Redis síncrona para uso em funções não-assíncronas"""
        try:
            return redis.from_url(self.redis_url)
        except Exception as e:
            logger.error(f"Erro ao conectar com Redis síncrono: {e}")
            return None
    
    async def set_conversation_memory(self, provedor_id: int, conversation_id: int, data: Dict[str, Any], ttl: int = None) -> bool:
        """Define memória para uma conversa específica"""
        try:
            redis_conn = await self.get_redis_connection()
            if not redis_conn:
                return False
                
            key = f"conversation:{provedor_id}:{conversation_id}"
            ttl = ttl or self.default_ttl
            
            # Adicionar timestamp de atualização
            data['last_updated'] = datetime.now().isoformat()
            
            await redis_conn.setex(key, ttl, json.dumps(data, ensure_ascii=False))
            logger.info(f"Memória da conversa {conversation_id} salva no Redis")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao salvar memória da conversa: {e}")
            return False
    
    async def get_conversation_memory(self, provedor_id: int, conversation_id: int) -> Optional[Dict[str, Any]]:
        """Obtém memória de uma conversa específica"""
        try:
            redis_conn = await self.get_redis_connection()
            if not redis_conn:
                return None
                
            key = f"conversation:{provedor_id}:{conversation_id}"
            data = await redis_conn.get(key)
            
            if data:
                memory_data = json.loads(data)
                logger.info(f"Memória da conversa {conversation_id} recuperada do Redis")
                return memory_data
            return None
            
        except Exception as e:
            logger.error(f"Erro ao recuperar memória da conversa: {e}")
            return None
    
    async def update_conversation_memory(self, provedor_id: int, conversation_id: int, updates: Dict[str, Any]) -> bool:
        """Atualiza memória de uma conversa existente"""
        try:
            # Recuperar memória atual
            current_memory = await self.get_conversation_memory(provedor_id, conversation_id) or {}
            
            # Mesclar atualizações
            current_memory.update(updates)
            
            # Salvar memória atualizada
            return await self.set_conversation_memory(provedor_id, conversation_id, current_memory)
            
        except Exception as e:
            logger.error(f"Erro ao atualizar memória da conversa: {e}")
            return False
    
    async def set_provedor_memory(self, provedor_id: int, data: Dict[str, Any], ttl: int = None) -> bool:
        """Define memória para um provedor específico"""
        try:
            redis_conn = await self.get_redis_connection()
            if not redis_conn:
                return False
                
            key = f"provedor:{provedor_id}"
            ttl = ttl or self.default_ttl
            
            # Adicionar timestamp de atualização
            data['last_updated'] = datetime.now().isoformat()
            
            await redis_conn.setex(key, ttl, json.dumps(data, ensure_ascii=False))
            logger.info(f"Memória do provedor {provedor_id} salva no Redis")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao salvar memória do provedor: {e}")
            return False
    
    async def get_provedor_memory(self, provedor_id: int) -> Optional[Dict[str, Any]]:
        """Obtém memória de um provedor específico"""
        try:
            redis_conn = await self.get_redis_connection()
            if not redis_conn:
                return None
                
            key = f"provedor:{provedor_id}"
            data = await redis_conn.get(key)
            
            if data:
                memory_data = json.loads(data)
                logger.info(f"Memória do provedor {provedor_id} recuperada do Redis")
                return memory_data
            return None
            
        except Exception as e:
            logger.error(f"Erro ao recuperar memória do provedor: {e}")
            return None
    
    async def add_conversation_context(self, provedor_id: int, conversation_id: int, context_type: str, context_data: Any) -> bool:
        """Adiciona contexto específico à memória da conversa"""
        try:
            key = f"context:{context_type}"
            updates = {key: context_data}
            return await self.update_conversation_memory(provedor_id, conversation_id, updates)
            
        except Exception as e:
            logger.error(f"Erro ao adicionar contexto à conversa: {e}")
            return False
    
    async def get_conversation_context(self, provedor_id: int, conversation_id: int, context_type: str) -> Optional[Any]:
        """Obtém contexto específico da memória da conversa"""
        try:
            memory = await self.get_conversation_memory(provedor_id, conversation_id)
            if memory:
                return memory.get(f"context:{context_type}")
            return None
            
        except Exception as e:
            logger.error(f"Erro ao recuperar contexto da conversa: {e}")
            return None
    
    async def clear_conversation_memory(self, provedor_id: int, conversation_id: int) -> bool:
        """Limpa memória de uma conversa específica"""
        try:
            redis_conn = await self.get_redis_connection()
            if not redis_conn:
                return False
                
            key = f"conversation:{provedor_id}:{conversation_id}"
            await redis_conn.delete(key)
            logger.info(f"Memória da conversa {conversation_id} limpa do Redis")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao limpar memória da conversa: {e}")
            return False
    
    async def get_all_conversations_for_provedor(self, provedor_id: int) -> List[int]:
        """Obtém todas as conversas ativas de um provedor"""
        try:
            redis_conn = await self.get_redis_connection()
            if not redis_conn:
                return []
                
            pattern = f"conversation:{provedor_id}:*"
            keys = await redis_conn.keys(pattern)
            
            # Extrair IDs das conversas
            conversation_ids = []
            for key in keys:
                try:
                    conv_id = int(key.split(':')[-1])
                    conversation_ids.append(conv_id)
                except (ValueError, IndexError):
                    continue
                    
            return conversation_ids
            
        except Exception as e:
            logger.error(f"Erro ao obter conversas do provedor: {e}")
            return []
    
    def set_conversation_memory_sync(self, provedor_id: int, conversation_id: int, data: Dict[str, Any], ttl: int = None) -> bool:
        """Versão síncrona para definir memória da conversa"""
        try:
            redis_conn = self.get_redis_sync()
            if not redis_conn:
                return False
                
            key = f"conversation:{provedor_id}:{conversation_id}"
            ttl = ttl or self.default_ttl
            
            # Adicionar timestamp de atualização
            data['last_updated'] = datetime.now().isoformat()
            
            redis_conn.setex(key, ttl, json.dumps(data, ensure_ascii=False))
            logger.info(f"Memória da conversa {conversation_id} salva no Redis (síncrono)")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao salvar memória da conversa (síncrono): {e}")
            return False
    
    def get_conversation_memory_sync(self, provedor_id: int, conversation_id: int) -> Optional[Dict[str, Any]]:
        """Versão síncrona para obter memória da conversa"""
        try:
            redis_conn = self.get_redis_sync()
            if not redis_conn:
                return None
                
            key = f"conversation:{provedor_id}:{conversation_id}"
            data = redis_conn.get(key)
            
            if data:
                memory_data = json.loads(data)
                logger.info(f"Memória da conversa {conversation_id} recuperada do Redis (síncrono)")
                return memory_data
            return None
            
        except Exception as e:
            logger.error(f"Erro ao recuperar memória da conversa (síncrono): {e}")
            return None

# Instância global do serviço
redis_memory_service = RedisMemoryService()
