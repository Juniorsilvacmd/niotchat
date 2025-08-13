# 🚀 Deploy Automatizado - NioChat

Este documento explica como configurar o deploy automatizado do NioChat na VPS.

## 📋 Pré-requisitos

- VPS Ubuntu 20.04+ (IP: 194.238.25.164)
- Domínios configurados:
  - `app.niochat.com.br`
  - `api.niochat.com.br`
  - `admin.niochat.com.br`
- Acesso root na VPS

## 🔧 Instalação Inicial

### 1. Conectar na VPS
```bash
ssh root@194.238.25.164
```

### 2. Executar script de instalação
```bash
# Baixar o script
wget https://raw.githubusercontent.com/Juniorsilvacmd/niochat/main/install_vps.sh
chmod +x install_vps.sh

# Executar instalação
./install_vps.sh
```

### 3. Configurar domínios no DNS
Configure os seguintes registros A no seu provedor de DNS:
```
app.niochat.com.br     A    194.238.25.164
api.niochat.com.br     A    194.238.25.164
admin.niochat.com.br   A    194.238.25.164
```

## 🔄 Deploy Automatizado

### 1. Configurar Webhook no GitHub

1. Acesse: https://github.com/Juniorsilvacmd/niochat/settings/hooks
2. Clique em "Add webhook"
3. Configure:
   - **Payload URL**: `http://194.238.25.164:8080`
   - **Content type**: `application/json`
   - **Secret**: `niochat_deploy_secret_2024`
   - **Events**: Selecione "Just the push event"
4. Clique em "Add webhook"

### 2. Testar Deploy Automatizado

Faça uma alteração no código e faça push:
```bash
git add .
git commit -m "Teste deploy automatizado"
git push origin main
```

O sistema deve atualizar automaticamente em 1-2 minutos.

## 🛠️ Comandos Úteis

### Verificar Status dos Serviços
```bash
# Status geral
systemctl status niochat-*

# Status individual
systemctl status niochat-backend
systemctl status niochat-frontend
systemctl status niochat-webhook
systemctl status nginx
```

### Ver Logs
```bash
# Logs do backend
journalctl -u niochat-backend -f

# Logs do frontend
journalctl -u niochat-frontend -f

# Logs do webhook
journalctl -u niochat-webhook -f

# Logs do Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Deploy Manual
```bash
cd /var/www/niochat
bash deploy_automated.sh
```

### Reiniciar Serviços
```bash
# Reiniciar tudo
systemctl restart niochat-backend niochat-frontend niochat-webhook nginx

# Reiniciar individual
systemctl restart niochat-backend
systemctl restart niochat-frontend
```

## 🌐 URLs do Sistema

- **Frontend**: https://app.niochat.com.br
- **API**: https://api.niochat.com.br
- **Admin**: https://admin.niochat.com.br
- **Webhook**: http://194.238.25.164:8080

## 🔐 Credenciais Padrão

- **Admin Django**: 
  - Usuário: `admin`
  - Senha: `admin123`
  - Email: `admin@niochat.com.br`

## 📁 Estrutura de Arquivos

```
/var/www/niochat/
├── backend/                 # Django backend
├── frontend/               # React frontend
├── nginx/                  # Configurações Nginx
├── systemd/                # Serviços systemd
├── webhook/                # Webhook de deploy
├── deploy_automated.sh     # Script de deploy
├── install_vps.sh          # Script de instalação
└── venv/                   # Ambiente virtual Python
```

## 🔧 Configurações

### Portas Utilizadas
- **8010**: Backend (Daphne)
- **8012**: Frontend (Vite)
- **8080**: Webhook de deploy
- **80/443**: Nginx (HTTP/HTTPS)

### Serviços Systemd
- `niochat-backend`: Backend Django/Daphne
- `niochat-frontend`: Frontend React/Vite
- `niochat-webhook`: Webhook de deploy
- `nginx`: Servidor web
- `redis`: Cache e sessões

## 🚨 Troubleshooting

### Problema: Deploy não funciona
```bash
# Verificar se o webhook está rodando
systemctl status niochat-webhook

# Verificar logs do webhook
journalctl -u niochat-webhook -f

# Testar webhook manualmente
curl -X POST http://194.238.25.164:8080
```

### Problema: Serviços não iniciam
```bash
# Verificar dependências
systemctl status niochat-backend
systemctl status niochat-frontend

# Verificar logs
journalctl -u niochat-backend -f
journalctl -u niochat-frontend -f
```

### Problema: SSL não funciona
```bash
# Verificar certificados
certbot certificates

# Renovar certificados
certbot renew

# Verificar Nginx
nginx -t
systemctl status nginx
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs: `journalctl -u niochat-* -f`
2. Teste o webhook: `curl http://194.238.25.164:8080`
3. Verifique status: `systemctl status niochat-*`

## 🔄 Atualizações

O sistema se atualiza automaticamente quando você faz push para o branch `main` no GitHub. Não é necessário fazer nada manualmente.

Para forçar uma atualização:
```bash
cd /var/www/niochat
bash deploy_automated.sh
``` 