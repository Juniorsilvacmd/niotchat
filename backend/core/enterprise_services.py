"""
Enterprise Services for 1000 Providers Scale
Implements advanced rate limiting, circuit breakers, and pool management
"""
import asyncio
import time
import logging
import random
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from django.conf import settings
from django.core.cache import cache
import aioredis
import openai
from .routers import OpenAIPoolRouter, UazapiPoolRouter

logger = logging.getLogger(__name__)

@dataclass
class PoolHealth:
    """Health status of a service pool"""
    is_healthy: bool = True
    last_failure: Optional[float] = None
    failure_count: int = 0
    last_success: Optional[float] = None
    response_time: Optional[float] = None

class CircuitBreaker:
    """Circuit breaker pattern implementation"""
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        if self.state == 'OPEN':
            if time.time() - self.last_failure_time > self.timeout:
                self.state = 'HALF_OPEN'
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _on_success(self):
        """Handle successful call"""
        self.failure_count = 0
        self.state = 'CLOSED'
    
    def _on_failure(self):
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = 'OPEN'

class RateLimiter:
    """Token bucket rate limiter"""
    
    def __init__(self, rate: int, burst: int = None):
        self.rate = rate  # tokens per second
        self.burst = burst or rate
        self.tokens = self.burst
        self.last_update = time.time()
    
    def acquire(self, tokens: int = 1) -> bool:
        """Try to acquire tokens"""
        now = time.time()
        time_passed = now - self.last_update
        self.last_update = now
        
        # Add tokens based on time passed
        self.tokens = min(self.burst, self.tokens + time_passed * self.rate)
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
    
    def wait_time(self, tokens: int = 1) -> float:
        """Calculate wait time for tokens"""
        if self.tokens >= tokens:
            return 0.0
        return (tokens - self.tokens) / self.rate

class EnterpriseOpenAIService:
    """Enterprise OpenAI service with multiple API keys and advanced features"""
    
    def __init__(self):
        self.router = OpenAIPoolRouter()
        self.circuit_breakers = {}
        self.rate_limiters = {}
        self.pool_health = {}
        
        # Initialize circuit breakers and rate limiters for each pool
        for pool in self.router.pools:
            pool_name = pool['name']
            self.circuit_breakers[pool_name] = CircuitBreaker(
                failure_threshold=3,
                timeout=60
            )
            self.rate_limiters[pool_name] = RateLimiter(
                rate=pool['limit'] // 60,  # Convert per-minute to per-second
                burst=pool['limit'] // 10   # 10% burst capacity
            )
            self.pool_health[pool_name] = PoolHealth()
    
    async def generate_response(self, messages: List[Dict], provider_id: int, **kwargs) -> Dict[str, Any]:
        """Generate AI response with enterprise features"""
        max_retries = 3
        last_exception = None
        
        for attempt in range(max_retries):
            pool = self.router.get_available_pool()
            if not pool:
                raise Exception("No available OpenAI pools")
            
            pool_name = pool['name']
            
            try:
                # Check rate limit
                rate_limiter = self.rate_limiters[pool_name]
                if not rate_limiter.acquire():
                    wait_time = rate_limiter.wait_time()
                    if wait_time > 0:
                        await asyncio.sleep(min(wait_time, 1.0))  # Max 1 second wait
                        continue
                
                # Use circuit breaker
                circuit_breaker = self.circuit_breakers[pool_name]
                
                start_time = time.time()
                response = circuit_breaker.call(
                    self._make_openai_request,
                    pool['key'],
                    messages,
                    **kwargs
                )
                response_time = time.time() - start_time
                
                # Update health metrics
                self.pool_health[pool_name].is_healthy = True
                self.pool_health[pool_name].last_success = time.time()
                self.pool_health[pool_name].response_time = response_time
                
                # Cache successful response pattern for similar requests
                await self._cache_response_pattern(messages, response, provider_id)
                
                return {
                    'success': True,
                    'response': response,
                    'pool_used': pool_name,
                    'response_time': response_time,
                    'provider_id': provider_id
                }
                
            except Exception as e:
                last_exception = e
                logger.error(f"OpenAI pool {pool_name} failed: {e}")
                
                # Update health metrics
                self.pool_health[pool_name].is_healthy = False
                self.pool_health[pool_name].last_failure = time.time()
                self.pool_health[pool_name].failure_count += 1
                
                # Mark pool as failed temporarily
                self.router.mark_pool_failed(pool_name)
                
                continue
        
        return {
            'success': False,
            'error': str(last_exception),
            'provider_id': provider_id
        }
    
    def _make_openai_request(self, api_key: str, messages: List[Dict], **kwargs) -> str:
        """Make actual OpenAI API request"""
        client = openai.OpenAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model=kwargs.get('model', 'gpt-4o-mini'),
            messages=messages,
            temperature=kwargs.get('temperature', 0.7),
            max_tokens=kwargs.get('max_tokens', 1000),
            timeout=kwargs.get('timeout', 30)
        )
        
        return response.choices[0].message.content
    
    async def _cache_response_pattern(self, messages: List[Dict], response: str, provider_id: int):
        """Cache response patterns for similar requests"""
        try:
            # Create a simple hash of the last user message for caching
            if messages and messages[-1].get('role') == 'user':
                user_message = messages[-1]['content']
                cache_key = f"ai_pattern:{provider_id}:{hash(user_message) % 10000}"
                
                # Cache for 1 hour
                cache.set(cache_key, response, 3600)
        except Exception as e:
            logger.warning(f"Failed to cache AI response pattern: {e}")
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get health status of all pools"""
        return {
            'pools': {
                name: {
                    'healthy': health.is_healthy,
                    'failure_count': health.failure_count,
                    'last_failure': health.last_failure,
                    'last_success': health.last_success,
                    'response_time': health.response_time,
                    'circuit_breaker_state': self.circuit_breakers[name].state
                }
                for name, health in self.pool_health.items()
            },
            'total_pools': len(self.router.pools),
            'healthy_pools': sum(1 for h in self.pool_health.values() if h.is_healthy),
            'failed_pools': len(self.router.failed_pools)
        }

class EnterpriseUazapiService:
    """Enterprise Uazapi service with multiple accounts and load balancing"""
    
    def __init__(self):
        self.router = UazapiPoolRouter()
        self.circuit_breakers = {}
        self.rate_limiters = {}
        self.pool_health = {}
        
        # Initialize for each pool
        for i, pool in enumerate(self.router.pools):
            pool_name = f"uazapi_pool_{i}"
            self.circuit_breakers[pool_name] = CircuitBreaker(
                failure_threshold=5,
                timeout=120
            )
            self.rate_limiters[pool_name] = RateLimiter(
                rate=pool['rate_limit'] // 60,  # Convert to per-second
                burst=pool['rate_limit'] // 6   # 10-second burst
            )
            self.pool_health[pool_name] = PoolHealth()
    
    async def send_message(self, provider_id: int, phone: str, message: str, **kwargs) -> Dict[str, Any]:
        """Send message through appropriate Uazapi pool"""
        pool = self.router.get_pool_for_provider(provider_id)
        if not pool:
            return {'success': False, 'error': 'No Uazapi pool available for provider'}
        
        pool_index = self.router.pools.index(pool)
        pool_name = f"uazapi_pool_{pool_index}"
        
        try:
            # Check rate limit
            rate_limiter = self.rate_limiters[pool_name]
            if not rate_limiter.acquire():
                wait_time = rate_limiter.wait_time()
                if wait_time > 0:
                    await asyncio.sleep(min(wait_time, 5.0))  # Max 5 second wait
            
            # Use circuit breaker
            circuit_breaker = self.circuit_breakers[pool_name]
            
            start_time = time.time()
            result = circuit_breaker.call(
                self._make_uazapi_request,
                pool,
                phone,
                message,
                **kwargs
            )
            response_time = time.time() - start_time
            
            # Update health metrics
            self.pool_health[pool_name].is_healthy = True
            self.pool_health[pool_name].last_success = time.time()
            self.pool_health[pool_name].response_time = response_time
            
            return {
                'success': True,
                'result': result,
                'pool_used': pool_name,
                'response_time': response_time,
                'provider_id': provider_id
            }
            
        except Exception as e:
            logger.error(f"Uazapi pool {pool_name} failed for provider {provider_id}: {e}")
            
            # Update health metrics
            self.pool_health[pool_name].is_healthy = False
            self.pool_health[pool_name].last_failure = time.time()
            self.pool_health[pool_name].failure_count += 1
            
            return {
                'success': False,
                'error': str(e),
                'pool_used': pool_name,
                'provider_id': provider_id
            }
    
    def _make_uazapi_request(self, pool: Dict, phone: str, message: str, **kwargs):
        """Make actual Uazapi API request"""
        import requests
        
        url = f"{pool['url']}/send/text"
        headers = {
            'Authorization': f"Bearer {pool['token']}",
            'Content-Type': 'application/json'
        }
        
        payload = {
            'number': phone,
            'text': message,
            **kwargs
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        
        return response.json()
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get health status of all Uazapi pools"""
        return {
            'pools': {
                name: {
                    'healthy': health.is_healthy,
                    'failure_count': health.failure_count,
                    'last_failure': health.last_failure,
                    'last_success': health.last_success,
                    'response_time': health.response_time,
                    'circuit_breaker_state': self.circuit_breakers[name].state
                }
                for name, health in self.pool_health.items()
            },
            'total_pools': len(self.router.pools),
            'healthy_pools': sum(1 for h in self.pool_health.values() if h.is_healthy)
        }

class EnterpriseRedisService:
    """Enterprise Redis service with cluster support"""
    
    def __init__(self):
        self.cluster_nodes = [
            {'host': 'redis-node1.internal', 'port': 7000},
            {'host': 'redis-node2.internal', 'port': 7001},
            {'host': 'redis-node3.internal', 'port': 7002},
        ]
        self.connections = {}
    
    async def get_connection(self, provider_id: int):
        """Get Redis connection for provider"""
        node_index = (provider_id - 1) % len(self.cluster_nodes)
        node = self.cluster_nodes[node_index]
        node_key = f"{node['host']}:{node['port']}"
        
        if node_key not in self.connections:
            self.connections[node_key] = aioredis.Redis(
                host=node['host'],
                port=node['port'],
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                health_check_interval=30
            )
        
        return self.connections[node_key]
    
    async def set_provider_data(self, provider_id: int, key: str, value: str, ttl: int = 3600):
        """Set data for specific provider"""
        redis = await self.get_connection(provider_id)
        full_key = f"provider:{provider_id}:{key}"
        await redis.setex(full_key, ttl, value)
    
    async def get_provider_data(self, provider_id: int, key: str) -> Optional[str]:
        """Get data for specific provider"""
        redis = await self.get_connection(provider_id)
        full_key = f"provider:{provider_id}:{key}"
        return await redis.get(full_key)
    
    async def delete_provider_data(self, provider_id: int, key: str):
        """Delete data for specific provider"""
        redis = await self.get_connection(provider_id)
        full_key = f"provider:{provider_id}:{key}"
        await redis.delete(full_key)

# Global instances
enterprise_openai = EnterpriseOpenAIService()
enterprise_uazapi = EnterpriseUazapiService()
enterprise_redis = EnterpriseRedisService()