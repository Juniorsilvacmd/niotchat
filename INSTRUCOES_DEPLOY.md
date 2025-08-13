# 🚀 Instruções Completas para Deploy Automático do NioChat

Este guia explica como configurar todo o sistema para deploy automático na VPS usando GitHub Actions, **com foco especial no Redis para IA e memória de conversas**.

## 📋 Pré-requisitos

- ✅ VPS Ubuntu 20.04+ com IP: `194.238.25.164`
- ✅ Domínios configurados e apontando para a VPS:
  - `webhook.niochat.com.br` ✅ (já configurado)
  - `app.niochat.com.br` ✅ (já configurado)
  - `api.niochat.com.br` (a ser criado)
  - `admin.niochat.com.br` (a ser criado)
- ✅ Acesso root à VPS
- ✅ Repositório GitHub configurado

## 🔧 Passo a Passo

### 1. Configurar Domínios

Crie os domínios que ainda não existem e aponte todos para `194.238.25.164`:

```bash
# No seu provedor de DNS, crie:
api.niochat.com.br -> 194.238.25.164
admin.niochat.com.br -> 194.238.25.164
```

### 2. Configuração na VPS

Conecte-se à VPS como root e execute:

```bash
# Baixar os arquivos de configuração
wget https://raw.githubusercontent.com/Juniorsilvacmd/niochat/main/setup_vps.sh
wget https://raw.githubusercontent.com/Juniorsilvacmd/niochat/main/deploy.sh
wget https://raw.githubusercontent.com/Juniorsilvacmd/niochat/main/niochat.service
wget https://raw.githubusercontent.com/Juniorsilvacmd/niochat/main/nginx-niochat.conf
wget https://raw.githubusercontent.com/Juniorsilvacmd/niochat/main/redis-ai.conf

# Dar permissão de execução
chmod +x setup_vps.sh

# Executar configuração
./setup_vps.sh
```

O script irá:
- ✅ Instalar todas as dependências (Python, Node.js, PostgreSQL, **Redis otimizado para IA**, Nginx)
- ✅ Configurar o banco de dados
- ✅ **Configurar Redis com 3 bancos específicos para IA**
- ✅ Criar ambiente virtual Python
- ✅ Configurar serviço systemd
- ✅ Configurar Nginx e SSL
- ✅ Configurar firewall
- ✅ Criar usuário admin

### 3. Configurar Variáveis de Ambiente

Durante a instalação, você será solicitado a configurar o arquivo `.env`:

```bash
nano .env
```

Configure as seguintes variáveis:

```env
# Django Settings
SECRET_KEY=sua-chave-secreta-muito-segura-aqui
DEBUG=False
ALLOWED_HOSTS=api.niochat.com.br,admin.niochat.com.br,app.niochat.com.br,194.238.25.164

# Database
POSTGRES_PASSWORD=sua-senha-postgres-segura
DATABASE_URL=postgresql://niochat_user:sua-senha-postgres-segura@localhost:5432/niochat

# Redis - ESSENCIAL para memória de conversas e IA
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Redis para IA e memória de conversas
REDIS_AI_DB=1
REDIS_CONVERSATION_DB=2
REDIS_CACHE_DB=3

# Celery Settings (usando Redis)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=seu-email@gmail.com
EMAIL_HOST_PASSWORD=sua-senha-de-app

# OpenAI (ESSENCIAL para IA)
OPENAI_API_KEY=sua-chave-openai-aqui
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7

# Configurações de IA e Memória
AI_MEMORY_TTL=86400  # 24 horas em segundos
AI_CONVERSATION_HISTORY_LIMIT=50  # Número máximo de mensagens para manter no contexto
AI_SYSTEM_PROMPT=Você é um assistente virtual inteligente e prestativo do NioChat. Mantenha o contexto da conversa e seja útil ao usuário.

# Webhook Secret
WEBHOOK_SECRET=niochat_deploy_secret_2024

# Outras configurações conforme necessário...
```

### 4. Configurar GitHub Actions

#### 4.1 Gerar Chave SSH no PC Local

No seu computador local, gere uma chave SSH:

```bash
ssh-keygen -t ed25519 -C "deploy@niochat"
# Pressione Enter para aceitar o local padrão
# Deixe a senha em branco (pressione Enter duas vezes)
```

#### 4.2 Adicionar Chave Pública na VPS

```bash
# No seu PC local, copie a chave pública
cat ~/.ssh/id_ed25519.pub

# Na VPS, adicione a chave ao authorized_keys
echo "SUA_CHAVE_PUBLICA_AQUI" >> ~/.ssh/authorized_keys
```

#### 4.3 Configurar Secrets no GitHub

No seu repositório GitHub:

1. Vá para `Settings` > `Secrets and variables` > `Actions`
2. Clique em `New repository secret`
3. Adicione os seguintes secrets:

**SSH_PRIVATE_KEY:**
```bash
# No seu PC local, copie a chave privada
cat ~/.ssh/id_ed25519
```

**SSH_HOST:**
```
194.238.25.164
```

### 5. Testar o Sistema

Após a instalação, teste os serviços:

```bash
# Verificar status dos serviços
systemctl status niochat
systemctl status nginx
systemctl status postgresql
systemctl status redis-server

# Verificar logs
journalctl -u niochat -f

# Testar conectividade
curl http://localhost:8000
curl http://localhost:80

# Testar Redis para IA
redis-cli ping
redis-cli -n 1 ping
redis-cli -n 2 ping
redis-cli -n 3 ping
```

## 🔄 Deploy Automático

### Como Funciona

1. **Push no GitHub**: Quando você fizer `git push origin main`
2. **GitHub Actions**: Executa testes e, se passarem, conecta na VPS
3. **Deploy na VPS**: Executa o script `deploy.sh` que:
   - Atualiza o código do GitHub
   - Instala dependências
   - Executa migrações
   - Coleta arquivos estáticos
   - **Verifica e configura Redis para IA**
   - Reinicia o serviço

### Deploy Manual

Para fazer deploy manual na VPS:

```bash
cd /var/www/app_niochat
bash deploy.sh
```

### Verificar Deploy

```bash
# Status dos serviços
systemctl status niochat

# Logs em tempo real
journalctl -u niochat -f

# Últimos logs
journalctl -u niochat --since "10 minutes ago"

# Verificar Redis para IA
redis-cli -n 1 ping
redis-cli -n 2 ping
redis-cli -n 3 ping
```

## 🧠 Redis para IA e Memória de Conversas

### Por que o Redis é essencial?

- **Memória de Conversas**: Mantém o contexto de cada conversa
- **Histórico de IA**: Armazena respostas e contexto para continuidade
- **Cache Inteligente**: Acelera respostas da IA
- **Persistência**: Dados não se perdem entre reinicializações

### Bancos Redis configurados:

1. **Banco 0**: Cache geral e Celery
2. **Banco 1**: Dados de IA e modelos
3. **Banco 2**: Histórico de conversas
4. **Banco 3**: Cache de respostas da IA

### Comandos Redis úteis:

```bash
# Verificar status
redis-cli ping

# Verificar bancos específicos
redis-cli -n 1 ping
redis-cli -n 2 ping
redis-cli -n 3 ping

# Ver estatísticas
redis-cli info

# Monitorar comandos em tempo real
redis-cli monitor

# Verificar uso de memória
redis-cli info memory
```

## 📊 Monitoramento

### Comandos Úteis

```bash
# Status geral
systemctl list-units --type=service --state=running | grep niochat

# Logs de todos os serviços
journalctl -u niochat -f

# Verificar portas
netstat -tlnp | grep -E ':(80|443|8000|6379)'

# Verificar processos
ps aux | grep -E '(daphne|nginx|redis)'

# Monitorar Redis
redis-cli info
redis-cli info memory
redis-cli info stats
```

### Logs Importantes

- **Backend**: `journalctl -u niochat -f`
- **Nginx**: `tail -f /var/log/nginx/access.log`
- **Redis**: `tail -f /var/log/redis/redis-server.log`
- **Sistema**: `journalctl -u niochat -f`

## 🚨 Solução de Problemas

### Serviço não inicia

```bash
# Verificar logs
journalctl -u niochat --no-pager -n 50

# Verificar dependências
systemctl status postgresql
systemctl status redis-server

# Reiniciar serviço
systemctl restart niochat
```

### Problemas com Redis

```bash
# Verificar status
systemctl status redis-server

# Verificar logs
tail -f /var/log/redis/redis-server.log

# Testar conexão
redis-cli ping

# Reiniciar Redis
systemctl restart redis-server

# Verificar configuração
redis-cli config get maxmemory
redis-cli config get databases
```

### Problemas de SSL

```bash
# Renovar certificados
certbot renew

# Verificar certificados
certbot certificates

# Recarregar Nginx
systemctl reload nginx
```

### Problemas de Banco

```bash
# Verificar conexão
sudo -u postgres psql -d niochat

# Verificar logs
tail -f /var/log/postgresql/postgresql-*.log
```

## 🔒 Segurança

### Firewall

O script configura automaticamente:
- Porta 22 (SSH)
- Porta 80 (HTTP)
- Porta 443 (HTTPS)
- **Porta 6379 (Redis) - apenas localhost**

### Usuários

- **www-data**: Executa os serviços
- **postgres**: Gerencia o banco de dados
- **redis**: Gerencia o Redis (configurado para apenas localhost)
- **root**: Apenas para administração

## 📈 Escalabilidade

### Para aumentar performance:

1. **Ajustar workers do Daphne**:
   ```bash
   # Editar o serviço
   nano /etc/systemd/system/niochat.service
   
   # Adicionar mais workers
   ExecStart=/var/www/app_niochat/venv/bin/daphne -b 0.0.0.0 -p 8000 -w 4 niochat.asgi:application
   ```

2. **Ajustar Redis para IA**:
   ```bash
   # Editar configuração
   nano /etc/redis/redis.conf
   
   # Aumentar memória
   maxmemory 1gb
   
   # Reiniciar Redis
   systemctl restart redis-server
   ```

3. **Reiniciar o serviço**:
   ```bash
   systemctl daemon-reload
   systemctl restart niochat
   ```

## 🎯 Próximos Passos

1. ✅ Configurar domínios
2. ✅ Executar configuração na VPS
3. ✅ Configurar variáveis de ambiente
4. ✅ Configurar GitHub Actions
5. ✅ Testar deploy automático
6. 🔄 Monitorar e ajustar conforme necessário

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `journalctl -u niochat -f`
2. Verifique o status: `systemctl status niochat`
3. Teste conectividade: `curl http://localhost:8000`
4. Verifique configurações: `nginx -t`
5. **Verifique Redis**: `redis-cli ping`

## 🧪 Teste Final

Para testar o deploy automático:

1. Faça uma pequena alteração no código
2. Commit e push:
   ```bash
   git add .
   git commit -m "Teste deploy automático"
   git push origin main
   ```
3. Verifique o GitHub Actions em `Actions`
4. Confirme que o deploy foi executado na VPS
5. Teste se a alteração está funcionando
6. **Verifique se o Redis está funcionando para IA**

---

**🎉 Parabéns! Seu sistema NioChat está configurado para deploy automático com Redis para IA!**

Agora, sempre que você fizer `git push origin main`, o sistema em produção será atualizado automaticamente, **mantendo a memória das conversas e o contexto da IA**! 🚀🧠
