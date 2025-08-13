# 🚀 **GUIA COMPLETO DE DEPLOY EM PRODUÇÃO - NIOCHAT**

## 📋 **VISÃO GERAL**

Este guia explica como colocar o NioChat em produção na sua VPS usando GitHub Actions para deploy automático, **SEM DOCKER**.

### **🎯 O que será configurado:**
- ✅ **VPS Ubuntu** com todos os serviços necessários
- ✅ **GitHub Actions** para deploy automático
- ✅ **SSL automático** com Let's Encrypt
- ✅ **Backup automático** do banco e arquivos
- ✅ **Monitoramento** e logs estruturados
- ✅ **Segurança** com firewall e headers

---

## 🖥️ **PASSO 1: PREPARAÇÃO DA VPS**

### **1.1 Conectar na VPS**
```bash
ssh root@194.238.25.164
```

### **1.2 Atualizar o sistema**
```bash
apt update && apt upgrade -y
```

### **1.3 Baixar e executar o script de instalação**
```bash
cd /tmp
wget https://raw.githubusercontent.com/Juniorsilvacmd/niochat/main/install_vps_native.sh
chmod +x install_vps_native.sh
./install_vps_native.sh
```

### **1.4 Configurar variáveis de ambiente**
```bash
cd /var/www/niochat
nano .env
```

**Configure as seguintes variáveis:**
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

# OpenAI (ESSENCIAL para IA)
OPENAI_API_KEY=sua-chave-openai-aqui

# Webhook Secret
WEBHOOK_SECRET=niochat_deploy_secret_2024
```

---

## 🔑 **PASSO 2: CONFIGURAÇÃO DO GITHUB ACTIONS**

### **2.1 Gerar chave SSH na VPS**
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions@niochat.com.br"
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```

### **2.2 Copiar a chave privada**
```bash
cat ~/.ssh/id_rsa
```

### **2.2 Configurar secrets no GitHub**

No seu repositório GitHub:
1. Vá para `Settings` > `Secrets and variables` > `Actions`
2. Clique em `New repository secret`
3. Adicione os seguintes secrets:

| **Nome** | **Valor** | **Descrição** |
|----------|-----------|---------------|
| `VPS_HOST` | `194.238.25.164` | IP da VPS |
| `VPS_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Chave SSH privada da VPS |

---

## 🌐 **PASSO 3: CONFIGURAÇÃO DOS DOMÍNIOS**

### **3.1 Configurar DNS**
No seu provedor de DNS, aponte os domínios para `194.238.25.164`:

- `app.niochat.com.br` → `194.238.25.164`
- `api.niochat.com.br` → `194.238.25.164`
- `admin.niochat.com.br` → `194.238.25.164`

### **3.2 Verificar propagação**
```bash
nslookup app.niochat.com.br
nslookup api.niochat.com.br
nslookup admin.niochat.com.br
```

---

## 🚀 **PASSO 4: PRIMEIRO DEPLOY**

### **4.1 Fazer push para o GitHub**
```bash
git add .
git commit -m "🚀 Primeiro deploy em produção"
git push origin main
```

### **4.2 Verificar o GitHub Actions**
1. Vá para a aba `Actions` no GitHub
2. Aguarde o workflow `Deploy to VPS` executar
3. Verifique se não há erros

### **4.3 Verificar na VPS**
```bash
# Status dos serviços
systemctl status niochat-*

# Logs em tempo real
journalctl -u niochat-backend -f

# Verificar URLs
curl -I https://app.niochat.com.br
curl -I https://api.niochat.com.br
curl -I https://admin.niochat.com.br
```

---

## 🔧 **PASSO 5: CONFIGURAÇÃO INICIAL**

### **5.1 Acessar o admin**
- URL: `https://admin.niochat.com.br/admin/`
- Usuário: `admin`
- Senha: `admin123`

### **5.2 Alterar senha do admin**
1. Acesse o admin
2. Vá em `Usuários`
3. Clique no usuário `admin`
4. Altere a senha para algo seguro

### **5.3 Configurar provedor**
1. Vá em `Provedores`
2. Crie um novo provedor ou edite o existente
3. Configure as informações necessárias

---

## 📊 **PASSO 6: MONITORAMENTO E MANUTENÇÃO**

### **6.1 Comandos úteis**
```bash
# Status dos serviços
systemctl status niochat-*

# Logs em tempo real
journalctl -u niochat-backend -f
journalctl -u niochat-celery -f
journalctl -u niochat-celerybeat -f

# Verificar portas
netstat -tlnp | grep -E ':(80|443|8010)'

# Verificar processos
ps aux | grep -E '(daphne|celery|nginx)'
```

### **6.2 Logs importantes**
- **Django**: `/var/log/niochat/django.log`
- **Nginx**: `/var/log/nginx/access.log`
- **Sistema**: `journalctl -u niochat-* -f`

### **6.3 Backup automático**
Os backups são feitos automaticamente a cada deploy:
- Banco de dados: `/var/www/niochat/backups/`
- Arquivos de mídia: `/var/www/niochat/backups/`

---

## 🔄 **PASSO 7: DEPLOY AUTOMÁTICO**

### **7.1 Como funciona**
1. **Push no GitHub**: Faça push para a branch `main`
2. **GitHub Actions**: Executa testes automaticamente
3. **Deploy na VPS**: Se os testes passarem, conecta na VPS
4. **Atualização**: Atualiza o código e reinicia os serviços
5. **Verificação**: Testa se tudo está funcionando

### **7.2 Deploy manual**
```bash
cd /var/www/niochat
bash deploy_vps_native.sh
```

### **7.3 Verificar deploy**
```bash
# Status dos serviços
systemctl status niochat-*

# Logs recentes
journalctl -u niochat-backend --since "10 minutes ago"

# Testar conectividade
curl -I https://app.niochat.com.br
```

---

## 🚨 **SOLUÇÃO DE PROBLEMAS**

### **Problema: Serviço não inicia**
```bash
# Verificar logs
journalctl -u niochat-backend --no-pager -n 50

# Verificar dependências
systemctl status postgresql
systemctl status redis-server

# Reiniciar serviço
systemctl restart niochat-backend
```

### **Problema: SSL não funciona**
```bash
# Renovar certificados
certbot renew

# Verificar certificados
certbot certificates

# Recarregar Nginx
systemctl reload nginx
```

### **Problema: Banco não conecta**
```bash
# Verificar conexão
sudo -u postgres psql -d niochat

# Verificar logs
tail -f /var/log/postgresql/postgresql-*.log
```

---

## 🔒 **SEGURANÇA**

### **Firewall configurado**
- ✅ Porta 22 (SSH)
- ✅ Porta 80 (HTTP)
- ✅ Porta 443 (HTTPS)
- ❌ Todas as outras portas bloqueadas

### **Headers de segurança**
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ X-XSS-Protection
- ✅ HSTS

### **Usuários seguros**
- ✅ `www-data`: Executa os serviços
- ✅ `postgres`: Gerencia o banco
- ✅ `root`: Apenas para administração

---

## 📈 **ESCALABILIDADE**

### **Para aumentar performance:**
```bash
# Ajustar workers do Daphne
nano /etc/systemd/system/niochat-backend.service
# ExecStart=/var/www/niochat/venv/bin/daphne -b 0.0.0.0 -p 8010 -w 4 niochat.asgi:application

# Ajustar workers do Celery
nano /etc/systemd/system/niochat-celery.service
# ExecStart=/var/www/niochat/venv/bin/celery -A niochat worker -l info --concurrency=4
```

---

## 🎯 **PRÓXIMOS PASSOS**

1. ✅ **Configurar domínios** no DNS
2. ✅ **Executar instalação** na VPS
3. ✅ **Configurar variáveis** de ambiente
4. ✅ **Configurar GitHub Actions** com secrets
5. ✅ **Fazer primeiro deploy** para produção
6. ✅ **Configurar sistema** inicial
7. 🔄 **Monitorar** e ajustar conforme necessário

---

## 📞 **SUPORTE**

Se encontrar problemas:

1. **Verifique os logs**: `journalctl -u niochat-* -f`
2. **Verifique o status**: `systemctl status niochat-*`
3. **Teste conectividade**: `curl https://app.niochat.com.br`
4. **Verifique configurações**: `nginx -t`

---

## 🎉 **PARABÉNS!**

Seu sistema NioChat está configurado para:
- ✅ **Deploy automático** via GitHub Actions
- ✅ **Produção segura** com SSL e firewall
- ✅ **Monitoramento** e logs estruturados
- ✅ **Backup automático** do banco e arquivos
- ✅ **Escalabilidade** para crescimento futuro

**🚀 Agora é só fazer push para a branch main e o sistema será atualizado automaticamente na VPS!** 