#!/bin/bash

# Script de Deploy para VPS com Docker Compose
# Este script será executado na VPS para fazer deploy

echo "🚀 Iniciando deploy na VPS..."

# Configurações
PROJECT_DIR="/var/www/niochat"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

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

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose não está instalado"
    exit 1
fi

# Verificar se o arquivo docker-compose.yml existe
if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    error "Arquivo $DOCKER_COMPOSE_FILE não encontrado"
    exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f "$ENV_FILE" ]; then
    warning "Arquivo .env não encontrado, criando a partir do template..."
    if [ -f "env.production" ]; then
        cp env.production .env
        warning "⚠️ Configure as variáveis no arquivo .env antes de continuar"
        exit 1
    else
        error "Arquivo env.production não encontrado"
        exit 1
    fi
fi

# Fazer backup do banco de dados
log "Fazendo backup do banco de dados..."
if docker-compose exec -T postgres pg_dump -U niochat_user niochat > backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null; then
    log "✅ Backup criado com sucesso"
else
    warning "⚠️ Não foi possível criar backup (banco pode não estar rodando)"
fi

# Parar serviços existentes
log "Parando serviços existentes..."
docker-compose down

# Remover imagens antigas (opcional)
log "Removendo imagens antigas..."
docker image prune -f

# Fazer pull das imagens mais recentes
log "Atualizando imagens Docker..."
docker-compose pull

# Construir e iniciar serviços
log "Construindo e iniciando serviços..."
docker-compose up -d --build

# Aguardar serviços iniciarem
log "Aguardando serviços iniciarem..."
sleep 30

# Verificar status dos serviços
log "Verificando status dos serviços..."
docker-compose ps

# Verificar logs dos serviços
log "Verificando logs dos serviços..."
for service in backend nginx redis postgres; do
    if docker-compose ps | grep -q "$service.*Up"; then
        log "✅ $service está rodando"
    else
        error "❌ $service não está rodando"
        log "Logs do $service:"
        docker-compose logs --tail=20 $service
    fi
done

# Executar migrações
log "Executando migrações..."
if docker-compose exec -T backend python manage.py migrate --noinput; then
    log "✅ Migrações executadas com sucesso"
else
    error "❌ Erro ao executar migrações"
fi

# Coletar arquivos estáticos
log "Coletando arquivos estáticos..."
if docker-compose exec -T backend python manage.py collectstatic --noinput; then
    log "✅ Arquivos estáticos coletados"
else
    error "❌ Erro ao coletar arquivos estáticos"
fi

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

log "🎉 Deploy concluído!"
log ""
log "🌐 URLs:"
log "   - Frontend: https://app.niochat.com.br"
log "   - API: https://api.niochat.com.br"
log "   - Admin: https://admin.niochat.com.br"
log ""
log "🔧 Comandos úteis:"
log "   - Status: docker-compose ps"
log "   - Logs: docker-compose logs -f [servico]"
log "   - Reiniciar: docker-compose restart [servico]"
log "   - Parar: docker-compose down"
log "   - Iniciar: docker-compose up -d"
log ""
log "📊 Monitoramento:"
log "   - Docker stats: docker stats"
log "   - Logs do sistema: journalctl -u docker -f"
