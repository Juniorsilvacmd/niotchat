#!/bin/bash

# Script de Deploy Automatizado para VPS
# Este script será executado automaticamente quando houver push no GitHub

echo "🚀 Iniciando deploy automatizado..."

# Configurações
PROJECT_DIR="/var/www/niochat"
GITHUB_REPO="https://github.com/Juniorsilvacmd/niochat.git"
BRANCH="main"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERRO] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[AVISO] $1${NC}"
}

# Verificar se o diretório existe
if [ ! -d "$PROJECT_DIR" ]; then
    log "Criando diretório do projeto..."
    mkdir -p $PROJECT_DIR
    cd $PROJECT_DIR
    git clone $GITHUB_REPO .
else
    log "Atualizando código do GitHub..."
    cd $PROJECT_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
fi

# Verificar se o clone/update foi bem-sucedido
if [ $? -ne 0 ]; then
    error "Falha ao atualizar código do GitHub"
    exit 1
fi

log "✅ Código atualizado com sucesso"

# Ativar ambiente virtual se existir
if [ -d "venv" ]; then
    log "Ativando ambiente virtual..."
    source venv/bin/activate
else
    log "Criando ambiente virtual..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
fi

# Instalar dependências do backend
log "Instalando dependências do backend..."
cd backend
pip install -r requirements.txt

# Executar migrações
log "Executando migrações..."
python manage.py migrate --noinput

# Coletar arquivos estáticos
log "Coletando arquivos estáticos..."
python manage.py collectstatic --noinput

cd ..

# Instalar dependências do frontend
log "Instalando dependências do frontend..."
cd frontend/frontend
npm install --production

# Build do frontend
log "Fazendo build do frontend..."
npm run build

cd ../..

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

# Reiniciar frontend (se estiver como serviço)
if systemctl is-active --quiet niochat-frontend; then
    systemctl restart niochat-frontend
    log "✅ Frontend reiniciado"
else
    warning "Serviço frontend não encontrado"
fi

# Reiniciar Nginx
systemctl reload nginx
log "✅ Nginx recarregado"

# Verificar status dos serviços
log "Verificando status dos serviços..."
if systemctl is-active --quiet niochat-backend; then
    log "✅ Backend está rodando"
else
    error "❌ Backend não está rodando"
fi

if systemctl is-active --quiet nginx; then
    log "✅ Nginx está rodando"
else
    error "❌ Nginx não está rodando"
fi

log "🎉 Deploy automatizado concluído com sucesso!"
log "🌐 URLs:"
log "   - Frontend: https://app.niochat.com.br"
log "   - API: https://api.niochat.com.br"
log "   - Admin: https://admin.niochat.com.br" 