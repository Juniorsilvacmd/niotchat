#!/bin/bash

# Script de Deploy para VPS sem Docker
# Este script será executado na VPS para fazer deploy

echo "🚀 Iniciando deploy na VPS (sem Docker)..."

# Configurações
PROJECT_DIR="/var/www/niochat"
VENV_DIR="/var/www/niochat/venv"
BACKEND_DIR="/var/www/niochat/backend"
FRONTEND_DIR="/var/www/niochat/frontend/frontend"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERRO] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[AVISO] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar se o diretório existe
if [ ! -d "$PROJECT_DIR" ]; then
    error "Diretório do projeto não encontrado: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# Verificar se o ambiente virtual existe
if [ ! -d "$VENV_DIR" ]; then
    log "Criando ambiente virtual..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    log "✅ Ambiente virtual criado"
else
    log "Ativando ambiente virtual..."
    source venv/bin/activate
fi

# Instalar/atualizar dependências do backend
log "Instalando dependências do backend..."
cd "$BACKEND_DIR"
pip install -r requirements.txt

# Executar migrações
log "Executando migrações..."
python manage.py migrate --noinput

# Coletar arquivos estáticos
log "Coletando arquivos estáticos..."
python manage.py collectstatic --noinput

cd "$PROJECT_DIR"

# Instalar dependências do frontend
log "Instalando dependências do frontend..."
cd "$FRONTEND_DIR"
npm install --production

# Build do frontend
log "Fazendo build do frontend..."
npm run build

cd "$PROJECT_DIR"

# Fazer backup do banco de dados
log "Fazendo backup do banco de dados..."
if command -v pg_dump &> /dev/null; then
    pg_dump -U niochat_user -h localhost niochat > backup_$(date +%Y%m%d_%H%M%S).sql
    log "✅ Backup criado com sucesso"
else
    warning "⚠️ pg_dump não encontrado, pulando backup"
fi

# Reiniciar serviços
log "Reiniciando serviços..."

# Reiniciar backend (Daphne)
if systemctl is-active --quiet niochat-backend; then
    systemctl restart niochat-backend
    log "✅ Backend reiniciado"
else
    warning "Serviço backend não encontrado, iniciando..."
    systemctl start niochat-backend
fi

# Reiniciar Celery worker
if systemctl is-active --quiet niochat-celery; then
    systemctl restart niochat-celery
    log "✅ Celery worker reiniciado"
else
    warning "Serviço Celery não encontrado"
fi

# Reiniciar Celery beat
if systemctl is-active --quiet niochat-celery-beat; then
    systemctl restart niochat-celery-beat
    log "✅ Celery beat reiniciado"
else
    warning "Serviço Celery beat não encontrado"
fi

# Reiniciar Nginx
systemctl reload nginx
log "✅ Nginx recarregado"

# Aguardar serviços iniciarem
log "Aguardando serviços iniciarem..."
sleep 10

# Verificar status dos serviços
log "Verificando status dos serviços..."
services=("niochat-backend" "nginx" "redis-server" "postgresql")

for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        log "✅ $service está rodando"
    else
        error "❌ $service não está rodando"
        log "Logs do $service:"
        journalctl -u "$service" --no-pager -n 10
    fi
done

# Verificar conectividade
log "Verificando conectividade..."
if curl -s http://localhost:80 > /dev/null; then
    log "✅ Nginx respondendo na porta 80"
else
    error "❌ Nginx não está respondendo na porta 80"
fi

if curl -s http://localhost:8010 > /dev/null; then
    log "✅ Backend respondendo na porta 8010"
else
    error "❌ Backend não está respondendo na porta 8010"
fi

# Verificar domínios
log "Verificando domínios..."
domains=("app.niochat.com.br" "api.niochat.com.br" "admin.niochat.com.br")

for domain in "${domains[@]}"; do
    if nslookup $domain | grep -q "194.238.25.164"; then
        log "✅ Domínio $domain configurado"
    else
        warning "⚠️ Domínio $domain não está apontando para 194.238.25.164"
    fi
done

# Configurar SSL se necessário
log "Verificando certificados SSL..."
for domain in "${domains[@]}"; do
    if [ ! -d "/etc/letsencrypt/live/$domain" ]; then
        warning "⚠️ Certificado SSL não encontrado para $domain"
        info "Execute: certbot --nginx -d $domain"
    else
        log "✅ Certificado SSL encontrado para $domain"
    fi
done

# Verificar logs de erro
log "Verificando logs de erro..."
if journalctl -u niochat-backend --since "5 minutes ago" | grep -i error; then
    warning "⚠️ Encontrados erros nos logs do backend"
else
    log "✅ Nenhum erro encontrado nos logs do backend"
fi

log "🎉 Deploy concluído!"
log ""
log "🌐 URLs:"
log "   - Frontend: https://app.niochat.com.br"
log "   - API: https://api.niochat.com.br"
log "   - Admin: https://admin.niochat.com.br"
log ""
log "🔧 Comandos úteis:"
log "   - Status: systemctl status niochat-*"
log "   - Logs: journalctl -u niochat-backend -f"
log "   - Reiniciar: systemctl restart niochat-backend"
log "   - Parar: systemctl stop niochat-backend"
log "   - Iniciar: systemctl start niochat-backend"
log ""
log "📊 Monitoramento:"
log "   - Logs do sistema: journalctl -u niochat-* -f"
log "   - Status dos serviços: systemctl list-units --type=service --state=running | grep niochat"
