# 🔄 PLANO DE MIGRAÇÃO: Redis Standalone → Redis Cluster

## 📊 COMPARATIVO DETALHADO

### **❌ REDIS ATUAL (STANDALONE)**
```yaml
Tipo: Single Instance
RAM: 512MB
Localização: VPS Externa (154.38.176.17)
Failover: Manual
Backup: Manual
Sharding: Não
Replicação: Não
Capacidade: ~100 provedores máximo
```

### **✅ REDIS CLUSTER (RECOMENDADO)**
```yaml
Tipo: Cluster (6 nodes: 3 master + 3 slave)
RAM: 192GB total (32GB por node)
Localização: Interna (baixa latência)
Failover: Automático
Backup: Automático
Sharding: Automático
Replicação: Automática
Capacidade: 1000+ provedores
```

## 🎯 CENÁRIOS DE USO

### **CENÁRIO 1: 1-10 Provedores** *(ATUAL - OK)*
```
Redis Standalone: ✅ SUFICIENTE
- RAM: ~50MB usados
- Conexões: ~100
- Performance: Adequada
```

### **CENÁRIO 2: 10-100 Provedores** *(LIMITE ATUAL)*
```
Redis Standalone: ⚠️ PRÓXIMO DO LIMITE
- RAM: ~200MB usados
- Conexões: ~500
- Performance: Degradando
```

### **CENÁRIO 3: 100-1000 Provedores** *(IMPOSSÍVEL ATUAL)*
```
Redis Standalone: ❌ INSUFICIENTE
- RAM: ~2GB necessários (temos 512MB)
- Conexões: ~5000 (limite do servidor)
- Performance: Inaceitável
```

## 📈 PLANO DE MIGRAÇÃO GRADUAL

### **FASE 1: PREPARAÇÃO (Imediata)**
```bash
# 1. Backup do Redis atual
redis-cli -h 154.38.176.17 -p 6379 --rdb backup_current.rdb

# 2. Documentar configurações atuais
redis-cli -h 154.38.176.17 -p 6379 CONFIG GET "*" > current_config.txt

# 3. Listar todas as chaves por provedor
redis-cli -h 154.38.176.17 -p 6379 KEYS "provider:*" > provider_keys.txt
```

### **FASE 2: UPGRADE INCREMENTAL (1-2 semanas)**

#### **Opção A: Upgrade do Redis Atual (RECOMENDADO IMEDIATO)**
```bash
# Aumentar RAM do Redis atual de 512MB para 4GB
# Configurar replicação master-slave
# Implementar backup automático

# Configuração temporária melhorada:
redis-server --maxmemory 4gb \
             --maxmemory-policy allkeys-lru \
             --save 900 1 \
             --appendonly yes \
             --appendfsync everysec
```

#### **Opção B: Redis Cluster Local (IDEAL)**
```bash
# Setup cluster local com Docker
docker run -d --name redis-node-1 -p 7000:7000 \
  redis:7-alpine redis-server --port 7000 \
  --cluster-enabled yes \
  --cluster-config-file nodes.conf \
  --cluster-node-timeout 5000 \
  --appendonly yes \
  --maxmemory 2gb

docker run -d --name redis-node-2 -p 7001:7001 \
  redis:7-alpine redis-server --port 7001 \
  --cluster-enabled yes \
  --cluster-config-file nodes.conf \
  --cluster-node-timeout 5000 \
  --appendonly yes \
  --maxmemory 2gb

docker run -d --name redis-node-3 -p 7002:7002 \
  redis:7-alpine redis-server --port 7002 \
  --cluster-enabled yes \
  --cluster-config-file nodes.conf \
  --cluster-node-timeout 5000 \
  --appendonly yes \
  --maxmemory 2gb

# Criar cluster
redis-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  --cluster-replicas 0 --cluster-yes
```

### **FASE 3: MIGRAÇÃO DE DADOS**
```python
# Script de migração Python
import redis
import json

# Conexões
redis_old = redis.Redis(host='154.38.176.17', port=6379, db=0)
redis_new = redis.RedisCluster(startup_nodes=[
    {"host": "127.0.0.1", "port": "7000"},
    {"host": "127.0.0.1", "port": "7001"},
    {"host": "127.0.0.1", "port": "7002"}
])

# Migrar dados por provedor
def migrate_provider_data(provider_id):
    pattern = f"provider:{provider_id}:*"
    keys = redis_old.keys(pattern)
    
    for key in keys:
        value = redis_old.get(key)
        ttl = redis_old.ttl(key)
        
        if ttl > 0:
            redis_new.setex(key, ttl, value)
        else:
            redis_new.set(key, value)
    
    print(f"✅ Provedor {provider_id}: {len(keys)} chaves migradas")

# Executar migração
for provider_id in range(1, 11):  # Começar com 10 provedores
    migrate_provider_data(provider_id)
```

### **FASE 4: CONFIGURAÇÃO DJANGO**
```python
# settings.py - Configuração híbrida
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': [
            'redis://127.0.0.1:7000/0',
            'redis://127.0.0.1:7001/0',
            'redis://127.0.0.1:7002/0',
        ],
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.RedisClusterClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 1000,
                'retry_on_timeout': True,
            }
        }
    },
    'fallback': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://154.38.176.17:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Channels Layer
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [
                ('127.0.0.1', 7000),
                ('127.0.0.1', 7001),
                ('127.0.0.1', 7002),
            ],
        },
    },
}
```

## 🔄 ESTRATÉGIAS DE MIGRAÇÃO

### **ESTRATÉGIA 1: BIG BANG** *(RISCO ALTO)*
- Parar sistema
- Migrar todos os dados
- Ligar com novo Redis
- **Downtime**: 2-4 horas

### **ESTRATÉGIA 2: BLUE-GREEN** *(RECOMENDADO)*
- Setup cluster paralelo
- Migração gradual por provedor
- Switch DNS/config
- **Downtime**: < 5 minutos

### **ESTRATÉGIA 3: CANARY** *(MAIS SEGURO)*
- Novos provedores → Cluster
- Provedores existentes → Standalone
- Migração gradual
- **Downtime**: Zero

## 📊 BENEFÍCIOS IMEDIATOS

### **PERFORMANCE:**
- **Latência**: 50% menor (local vs VPS)
- **Throughput**: 10x maior
- **Conexões**: 10x mais conexões

### **CONFIABILIDADE:**
- **Uptime**: 99.9% → 99.99%
- **Recovery**: Automático
- **Backup**: Contínuo

### **ESCALABILIDADE:**
- **Capacidade**: 100x maior
- **Provedores**: 10 → 1000+
- **RAM**: 512MB → 192GB

## 💰 CUSTOS

### **OPÇÃO A: Upgrade VPS Atual**
```
Custo: $50/mês → $200/mês
Benefício: 8x mais RAM
Capacidade: 10 → 80 provedores
```

### **OPÇÃO B: Cluster Local**
```
Custo: $0 (usa servidor atual)
Benefício: 400x mais capacidade
Capacidade: 10 → 1000+ provedores
```

## 🚨 PLANO DE ROLLBACK

```bash
# Em caso de problemas
1. Parar aplicação
2. Restaurar configuração antiga
3. Importar backup Redis
4. Reiniciar aplicação
5. Verificar funcionamento

# Tempo de rollback: < 10 minutos
```

## ✅ RECOMENDAÇÃO FINAL

### **IMEDIATO (Esta semana):**
1. **Setup Redis Cluster local** (3 nodes)
2. **Migrar 2-3 provedores** como teste
3. **Monitorar performance**

### **CURTO PRAZO (2 semanas):**
1. **Migrar todos os provedores**
2. **Desativar Redis VPS**
3. **Configurar backup automático**

### **MÉDIO PRAZO (1 mês):**
1. **Expandir para 6 nodes** (HA completa)
2. **Implementar monitoring**
3. **Otimizar configurações**

---

**🎯 CONCLUSÃO: Redis Cluster é ESSENCIAL para 1000 provedores. O atual só suporta ~10-20 provedores máximo.**