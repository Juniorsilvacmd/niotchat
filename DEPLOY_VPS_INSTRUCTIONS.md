# 🚀 Guia de Deploy do NioChat na VPS

Este guia explica como fazer deploy do NioChat na VPS usando serviços nativos (sem Docker) e configurar o GitHub Actions para deploy automático.

## 📋 Pré-requisitos

- VPS Ubuntu 20.04+ com IP: `194.238.25.164`
- Domínios configurados e apontando para a VPS:
  - `webhook.niochat.com.br` ✅ (já configurado)
  - `app.niochat.com.br` ✅ (já configurado)
  - `api.niochat.com.br` (a ser criado)
  - `admin.niochat.com.br` (a ser criado)
- Acesso root à VPS
- Repositório GitHub configurado

## 🔧 Passo a Passo

### 1. Configurar Domínios

Crie os domínios que ainda não existem e aponte todos para `194.238.25.164`:

```bash
# No seu provedor de DNS, crie:
api.niochat.com.br -> 194.238.25.164
admin.niochat.com.br -> 194.238.25.164
```

### 2. Instalação Inicial na VPS

Conecte-se à VPS como root e execute:

```bash
# Baixar o script de instalação
wget https://raw.githubusercontent.com/Juniorsilvacmd/niochat/main/install_vps_native.sh

# Dar permissão de execução
chmod +x install_vps_native.sh

# Executar instalação
./install_vps_native.sh
```

O script irá:
- Instalar todas as dependências (Python, Node.js, PostgreSQL, Redis, Nginx)
- Configurar o banco de dados
- Criar ambiente virtual Python
- Configurar serviços systemd
- Configurar Nginx e SSL
- Configurar firewall
- Criar usuário admin

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

# Redis
REDIS_URL=redis://localhost:6379

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=seu-email@gmail.com
EMAIL_HOST_PASSWORD=sua-senha-de-app

# Webhook Secret
WEBHOOK_SECRET=niochat_deploy_secret_2024

# Outras configurações conforme necessário...
```

### 4. Configurar GitHub Actions

#### 4.1 Gerar Chave SSH para VPS

Na VPS, gere uma chave SSH:

```bash
ssh-keygen -t rsa -b 4096 -C "github-actions@niochat.com.br"
```

Adicione a chave pública ao arquivo `~/.ssh/authorized_keys`:

```bash
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```

#### 4.2 Configurar Secret no GitHub

No seu repositório GitHub:

1. Vá para `Settings` > `Secrets and variables` > `Actions`
2. Clique em `New repository secret`
3. Nome: `VPS_SSH_KEY`
4. Valor: Conteúdo da chave privada (`~/.ssh/id_rsa`)

```bash
# Na VPS, copie a chave privada
cat ~/.ssh/id_rsa
```

### 5. Configurar Webhook no GitHub

1. Vá para `Settings` > `Webhooks`
2. Clique em `Add webhook`
3. Configure:
   - **Payload URL**: `http://194.238.25.164:8080`
   - **Content type**: `application/json`
   - **Secret**: `niochat_deploy_secret_2024`
   - **Events**: Selecione `Just the push event`

### 6. Testar o Sistema

Após a instalação, teste os serviços:

```bash
# Verificar status dos serviços
systemctl status niochat-*

# Verificar logs
journalctl -u niochat-backend -f

# Testar conectividade
curl http://localhost:8010
curl http://localhost:80
```

## 🔄 Deploy Automático

### Como Funciona

1. **Push no GitHub**: Quando você fizer push para a branch `main`
2. **GitHub Actions**: Executa testes e, se passarem, conecta na VPS
3. **Deploy na VPS**: Atualiza o código e reinicia os serviços
4. **Webhook Local**: Também pode ser acionado diretamente

### Deploy Manual

Para fazer deploy manual:

```bash
cd /var/www/niochat
bash deploy_vps_native.sh
```

### Verificar Deploy

```bash
# Status dos serviços
systemctl status niochat-*

# Logs em tempo real
journalctl -u niochat-backend -f

# Últimos logs
journalctl -u niochat-backend --since "10 minutes ago"
```

## 📊 Monitoramento

### Comandos Úteis

```bash
# Status geral
systemctl list-units --type=service --state=running | grep niochat

# Logs de todos os serviços
journalctl -u niochat-* -f

# Verificar portas
netstat -tlnp | grep -E ':(80|443|8010|8080)'

# Verificar processos
ps aux | grep -E '(daphne|celery|nginx)'
```

### Logs Importantes

- **Backend**: `journalctl -u niochat-backend -f`
- **Celery**: `journalctl -u niochat-celery -f`
- **Nginx**: `tail -f /var/log/nginx/access.log`
- **Sistema**: `journalctl -u niochat-* -f`

## 🚨 Solução de Problemas

### Serviço não inicia

```bash
# Verificar logs
journalctl -u niochat-backend --no-pager -n 50

# Verificar dependências
systemctl status postgresql
systemctl status redis-server

# Reiniciar serviço
systemctl restart niochat-backend
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
- Porta 8080 (Webhook)

### Usuários

- **www-data**: Executa os serviços
- **postgres**: Gerencia o banco de dados
- **root**: Apenas para administração

## 📈 Escalabilidade

### Para aumentar performance:

1. **Ajustar workers do Daphne**:
   ```bash
   # Editar o serviço
   nano /etc/systemd/system/niochat-backend.service
   
   # Adicionar mais workers
   ExecStart=/var/www/niochat/venv/bin/daphne -b 0.0.0.0 -p 8010 -w 4 niochat.asgi:application
   ```

2. **Ajustar workers do Celery**:
   ```bash
   # Editar o serviço
   nano /etc/systemd/system/niochat-celery.service
   
   # Adicionar mais workers
   ExecStart=/var/www/niochat/venv/bin/celery -A niochat worker -l info --concurrency=4
   ```

## 🎯 Próximos Passos

1. ✅ Configurar domínios
2. ✅ Executar instalação na VPS
3. ✅ Configurar variáveis de ambiente
4. ✅ Configurar GitHub Actions
5. ✅ Configurar webhook
6. ✅ Testar deploy automático
7. 🔄 Monitorar e ajustar conforme necessário

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `journalctl -u niochat-* -f`
2. Verifique o status: `systemctl status niochat-*`
3. Teste conectividade: `curl http://localhost:8010`
4. Verifique configurações: `nginx -t`

---

**🎉 Parabéns! Seu sistema NioChat está configurado para deploy automático!**
