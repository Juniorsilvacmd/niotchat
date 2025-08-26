"""
Database Router for Enterprise Scale - 1000 Providers
Implements read/write splitting and provider-based sharding
"""
import random
from django.conf import settings

class ProviderDatabaseRouter:
    """
    Database router for provider-based sharding and read/write splitting
    """
    
    def __init__(self):
        self.read_replicas = ['read_replica_1', 'read_replica_2', 'read_replica_3', 'read_replica_4']
    
    def db_for_read(self, model, **hints):
        """
        Suggest the database to read from for objects of type model.
        Distributes read operations across read replicas based on provider_id
        """
        if model._meta.app_label in ['conversations', 'core', 'integrations']:
            # Get provider_id from hints
            provider_id = self._get_provider_id_from_hints(hints)
            
            if provider_id:
                # Distribute providers across read replicas
                replica_index = (provider_id - 1) % len(self.read_replicas)
                replica_db = self.read_replicas[replica_index]
                
                # Check if replica is available (basic health check)
                if self._is_database_available(replica_db):
                    return replica_db
                
                # Fallback to random replica if preferred is unavailable
                available_replicas = [db for db in self.read_replicas if self._is_database_available(db)]
                if available_replicas:
                    return random.choice(available_replicas)
            
            # Fallback to random read replica
            available_replicas = [db for db in self.read_replicas if self._is_database_available(db)]
            if available_replicas:
                return random.choice(available_replicas)
        
        # Default to master for other apps or if no replicas available
        return 'default'
    
    def db_for_write(self, model, **hints):
        """
        Suggest the database to write to for objects of type model.
        Always write to master database
        """
        if model._meta.app_label in ['conversations', 'core', 'integrations']:
            return 'default'  # Always write to master
        return None
    
    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if models are in the same app or both are provider-isolated
        """
        db_set = {'default'}
        db_set.update(self.read_replicas)
        
        if obj1._state.db in db_set and obj2._state.db in db_set:
            return True
        return None
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Ensure that certain apps' models get created on the right database.
        Only allow migrations on the master database
        """
        if db == 'default':
            return True
        elif db in self.read_replicas:
            return False  # Don't run migrations on read replicas
        return None
    
    def _get_provider_id_from_hints(self, hints):
        """
        Extract provider_id from hints
        """
        instance = hints.get('instance')
        if instance:
            # Try different ways to get provider_id
            if hasattr(instance, 'provedor_id'):
                return instance.provedor_id
            elif hasattr(instance, 'provedor') and hasattr(instance.provedor, 'id'):
                return instance.provedor.id
            elif hasattr(instance, 'contact') and hasattr(instance.contact, 'provedor_id'):
                return instance.contact.provedor_id
            elif hasattr(instance, 'conversation') and hasattr(instance.conversation.contact, 'provedor_id'):
                return instance.conversation.contact.provedor_id
        
        return None
    
    def _is_database_available(self, db_alias):
        """
        Basic health check for database availability
        """
        try:
            from django.db import connections
            connection = connections[db_alias]
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return True
        except Exception:
            return False

class CacheRouter:
    """
    Router for distributing cache operations across Redis cluster nodes
    """
    
    def __init__(self):
        self.cache_nodes = {
            'providers_1_333': 'redis-node1:7000',
            'providers_334_666': 'redis-node2:7001', 
            'providers_667_1000': 'redis-node3:7002',
        }
    
    def get_cache_node(self, provider_id):
        """
        Get appropriate cache node for provider
        """
        if provider_id <= 333:
            return 'providers_1_333'
        elif provider_id <= 666:
            return 'providers_334_666'
        else:
            return 'providers_667_1000'

class OpenAIPoolRouter:
    """
    Router for distributing OpenAI API calls across multiple API keys
    """
    
    def __init__(self):
        self.pools = getattr(settings, 'OPENAI_ENTERPRISE_POOLS', [])
        self.current_pool_index = 0
        self.failed_pools = set()
    
    def get_available_pool(self):
        """
        Get next available OpenAI pool with circuit breaker pattern
        """
        available_pools = [
            pool for i, pool in enumerate(self.pools) 
            if i not in self.failed_pools
        ]
        
        if not available_pools:
            # Reset failed pools if all are failed
            self.failed_pools.clear()
            available_pools = self.pools
        
        if available_pools:
            # Round-robin selection
            pool = available_pools[self.current_pool_index % len(available_pools)]
            self.current_pool_index += 1
            return pool
        
        return None
    
    def mark_pool_failed(self, pool_name):
        """
        Mark a pool as failed
        """
        for i, pool in enumerate(self.pools):
            if pool.get('name') == pool_name:
                self.failed_pools.add(i)
                break
    
    def mark_pool_healthy(self, pool_name):
        """
        Mark a pool as healthy again
        """
        for i, pool in enumerate(self.pools):
            if pool.get('name') == pool_name:
                self.failed_pools.discard(i)
                break

class UazapiPoolRouter:
    """
    Router for distributing Uazapi calls across multiple accounts
    """
    
    def __init__(self):
        self.pools = getattr(settings, 'UAZAPI_ENTERPRISE_POOLS', [])
    
    def get_pool_for_provider(self, provider_id):
        """
        Get appropriate Uazapi pool for provider based on ID range
        """
        for pool in self.pools:
            start, end = pool['providers_range']
            if start <= provider_id <= end:
                return pool
        
        # Fallback to first pool if no range matches
        return self.pools[0] if self.pools else None
    
    def get_all_pools(self):
        """
        Get all available Uazapi pools
        """
        return self.pools