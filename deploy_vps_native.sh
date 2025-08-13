#!/bin/bash

# Script de Deploy para VPS sem Docker
# Este script será executado na VPS para fazer deploy

echo "🚀 Iniciando deploy na VPS (sem Docker)..."

# Configurações
PROJECT_DIR="/var/www/niochat"
VENV_DIR="/var/www/niochat/venv"
BACKEND_DIR="/var/www/niochat/backend"
FRONTEND_DIR="/var/www/niochat/frontend/frontend"
BACKUP_DIR="/var/www/niochat/backups"

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

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

# Fazer backup do banco de dados
log "Fazendo backup do banco de dados..."
if command -v pg_dump &> /dev/null; then
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump -U niochat_user -h localhost niochat > "$BACKUP_DIR/$BACKUP_FILE"
    log "✅ Backup criado: $BACKUP_FILE"
else
    warning "⚠️ pg_dump não encontrado, pulando backup"
fi

# Fazer backup dos arquivos de mídia
log "Fazendo backup dos arquivos de mídia..."
if [ -d "backend/media" ]; then
    MEDIA_BACKUP="media_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "$BACKUP_DIR/$MEDIA_BACKUP" -C backend media/
    log "✅ Backup de mídia criado: $MEDIA_BACKUP"
fi

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

# Limpar backups antigos (manter apenas os últimos 10)
log "Limpando backups antigos..."
cd "$BACKUP_DIR"
ls -t | tail -n +11 | xargs -r rm -f
cd "$PROJECT_DIR"

# Reiniciar serviços
log "Reiniciando serviços..."

# Reiniciar backend (Daphne)
if systemctl is-active --quiet niochat-backend; then
    systemctl restart niochat-backend
    log "✅ Backend reiniciado"
else
    warning "⚠️ Serviço backend não encontrado, iniciando..."
    systemctl start niochat-backend
fi

# Reiniciar Celery
if systemctl is-active --quiet niochat-celery; then
    systemctl restart niochat-celery
    log "✅ Celery reiniciado"
else
    warning "⚠️ Serviço Celery não encontrado, iniciando..."
    systemctl start niochat-celery
fi

# Reiniciar Celery Beat
if systemctl is-active --quiet niochat-celerybeat; then
    systemctl restart niochat-celerybeat
    log "✅ Celery Beat reiniciado"
else
    warning "⚠️ Serviço Celery Beat não encontrado, iniciando..."
    systemctl start niochat-celerybeat
fi

# Verificar status dos serviços
log "Verificando status dos serviços..."
sleep 5

# Verificar se os serviços estão rodando
SERVICES=("niochat-backend" "niochat-celery" "niochat-celerybeat")
ALL_RUNNING=true

for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service"; then
        log "✅ $service está rodando"
    else
        error "❌ $service não está rodando"
        ALL_RUNNING=false
    fi
done

# Verificar conectividade
log "Testando conectividade..."
if curl -s http://localhost:8010/admin/ > /dev/null; then
    log "✅ Backend respondendo na porta 8010"
else
    error "❌ Backend não está respondendo na porta 8010"
    ALL_RUNNING=false
fi

# Verificar Nginx
if systemctl is-active --quiet nginx; then
    log "✅ Nginx está rodando"
else
    error "❌ Nginx não está rodando"
    ALL_RUNNING=false
fi

# Verificar banco de dados
if sudo -u postgres psql -d niochat -c "SELECT 1;" > /dev/null 2>&1; then
    log "✅ Banco de dados PostgreSQL acessível"
else
    error "❌ Banco de dados PostgreSQL não está acessível"
    ALL_RUNNING=false
fi

# Verificar Redis
if redis-cli ping > /dev/null 2>&1; then
    log "✅ Redis está respondendo"
else
    error "❌ Redis não está respondendo"
    ALL_RUNNING=false
fi

# Resultado final
if [ "$ALL_RUNNING" = true ]; then
    log "🎉 Deploy concluído com sucesso!"
    log "🌐 URLs disponíveis:"
    log "   - App: https://app.niochat.com.br"
    log "   - API: https://api.niochat.com.br"
    log "   - Admin: https://admin.niochat.com.br"
    log ""
    log "📊 Status dos serviços:"
    systemctl list-units --type=service --state=running | grep niochat
    log ""
    log "📝 Logs recentes:"
    journalctl -u niochat-backend --since "5 minutes ago" --no-pager | tail -10
else
    error "❌ Deploy concluído com problemas!"
    error "Verifique os logs dos serviços:"
    error "   - Backend: journalctl -u niochat-backend -f"
    error "   - Celery: journalctl -u niochat-celery -f"
    error "   - Nginx: journalctl -u nginx -f"
    exit 1
fi

# Limpar variáveis de ambiente
deactivate

log "✅ Deploy finalizado!"
