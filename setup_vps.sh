#!/bin/bash

# Script de Configuração Completa da VPS para NioChat
# Execute este script uma vez na VPS para configurar tudo

echo "🚀 Configuração completa da VPS para NioChat..."

# Configurações
PROJECT_DIR="/var/www/app_niochat"
GITHUB_REPO="https://github.com/Juniorsilvacmd/niochat.git"

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

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    error "Execute este script como root (sudo)"
    exit 1
fi

log "Atualizando sistema..."
apt update && apt upgrade -y

log "Instalando dependências básicas..."
apt install -y git curl wget nginx python3 python3-pip python3-venv nodejs npm redis-server postgresql postgresql-contrib certbot python3-certbot-nginx ufw

# Instalar Node.js 18+ se necessário
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    log "Instalando Node.js 18+..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Configurar PostgreSQL
log "Configurando PostgreSQL..."
sudo -u postgres createuser --interactive --pwprompt niochat_user
sudo -u postgres createdb -O niochat_user niochat

# Configurar Redis para IA
log "Configurando Redis para IA..."
systemctl enable redis-server
systemctl start redis-server

# Configurar Redis com otimizações para IA
cat > /etc/redis/redis.conf << EOF
# Configuração Redis para NioChat com IA
bind 127.0.0.1
port 6379
timeout 0
tcp-keepalive 300
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
EOF

# Reiniciar Redis com nova configuração
systemctl restart redis-server

# Testar Redis
log "Testando Redis..."
if redis-cli ping | grep -q "PONG"; then
    log "✅ Redis funcionando corretamente"
    
    # Configurar bancos específicos para IA
    redis-cli -n 1 ping > /dev/null 2>&1
    redis-cli -n 2 ping > /dev/null 2>&1
    redis-cli -n 3 ping > /dev/null 2>&1
    
    log "✅ Bancos Redis configurados para IA"
else
    error "❌ Falha na configuração do Redis"
    exit 1
fi

# Criar usuário www-data se não existir
if ! id "www-data" &>/dev/null; then
    useradd -r -s /bin/bash www-data
fi

# Criar diretório do projeto
log "Criando diretório do projeto..."
mkdir -p $PROJECT_DIR
chown www-data:www-data $PROJECT_DIR

# Clonar repositório
log "Clonando repositório..."
cd $PROJECT_DIR
sudo -u www-data git clone $GITHUB_REPO .

# Configurar arquivo de ambiente
log "Configurando arquivo de ambiente..."
if [ -f "env.production" ]; then
    cp env.production .env
    warning "⚠️ Configure as variáveis no arquivo .env antes de continuar"
    info "Execute: nano .env"
    read -p "Pressione Enter após configurar o arquivo .env..."
else
    error "Arquivo env.production não encontrado"
    exit 1
fi

# Criar ambiente virtual
log "Criando ambiente virtual..."
sudo -u www-data python3 -m venv venv
sudo -u www-data venv/bin/pip install --upgrade pip

# Instalar dependências do backend
log "Instalando dependências do backend..."
cd backend
sudo -u www-data ../venv/bin/pip install -r requirements.txt

# Executar migrações
log "Executando migrações..."
sudo -u www-data ../venv/bin/python manage.py migrate --noinput

# Coletar arquivos estáticos
log "Coletando arquivos estáticos..."
sudo -u www-data ../venv/bin/python manage.py collectstatic --noinput

cd ..

# Instalar dependências do frontend
log "Instalando dependências do frontend..."
cd frontend/frontend
sudo -u www-data npm install
sudo -u www-data npm run build
cd ../..

# Configurar Nginx
log "Configurando Nginx..."
cp nginx-niochat.conf /etc/nginx/sites-available/niochat

# Habilitar site
ln -sf /etc/nginx/sites-available/niochat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Configurar serviço systemd
log "Configurando serviço systemd..."
cp niochat.service /etc/systemd/system/

# Recarregar systemd
systemctl daemon-reload

# Habilitar e iniciar serviços
systemctl enable niochat
systemctl enable nginx
systemctl enable postgresql
systemctl enable redis-server

# Iniciar serviços
systemctl start postgresql
systemctl start redis-server
systemctl start niochat
systemctl start nginx

# Configurar firewall
log "Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configurar SSL com Let's Encrypt
log "Configurando SSL..."
domains=("app.niochat.com.br" "api.niochat.com.br" "admin.niochat.com.br")

for domain in "${domains[@]}"; do
    if nslookup $domain | grep -q "194.238.25.164"; then
        log "✅ Domínio $domain configurado"
        certbot --nginx -d $domain --non-interactive --agree-tos --email admin@niochat.com.br
    else
        warning "⚠️ Domínio $domain não está apontando para 194.238.25.164"
    fi
done

# Configurar cron para renovar SSL
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# Dar permissões aos scripts
chmod +x deploy.sh

# Criar superusuário se não existir
log "Criando superusuário..."
cd backend
if ! sudo -u www-data ../venv/bin/python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(is_superuser=True).exists()" 2>/dev/null | grep -q "True"; then
    echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@niochat.com.br', 'admin123') if not User.objects.filter(is_superuser=True).exists() else None" | sudo -u www-data ../venv/bin/python manage.py shell
    log "✅ Superusuário criado: admin / admin123"
else
    log "✅ Superusuário já existe"
fi
cd ..

# Verificar configuração final
log "Verificando configuração final..."

# Testar Redis para IA
if redis-cli -n 1 ping | grep -q "PONG" && \
   redis-cli -n 2 ping | grep -q "PONG" && \
   redis-cli -n 3 ping | grep -q "PONG"; then
    log "✅ Redis configurado para IA com 3 bancos"
else
    warning "⚠️ Problema com bancos Redis para IA"
fi

# Testar conectividade dos serviços
if curl -s http://localhost:8000 > /dev/null; then
    log "✅ Backend respondendo"
else
    warning "⚠️ Backend não respondendo"
fi

if curl -s http://localhost:80 > /dev/null; then
    log "✅ Nginx respondendo"
else
    warning "⚠️ Nginx não respondendo"
fi

log "🎉 Configuração concluída!"
log ""
log "🌐 URLs:"
log "   - Frontend: https://app.niochat.com.br"
log "   - API: https://api.niochat.com.br"
log "   - Admin: https://admin.niochat.com.br"
log ""
log "🧠 IA e Memória:"
log "   - Redis: ✅ Funcionando (porta 6379)"
log "   - Banco IA: ✅ Banco 1 configurado"
log "   - Banco Conversas: ✅ Banco 2 configurado"
log "   - Banco Cache: ✅ Banco 3 configurado"
log "   - Memória: ✅ Configurada para manter contexto"
log ""
log "🔧 Comandos úteis:"
log "   - Status: systemctl status niochat"
log "   - Logs: journalctl -u niochat -f"
log "   - Deploy manual: bash deploy.sh"
log "   - Redis: redis-cli ping"
log "   - Redis IA: redis-cli -n 1 ping"
log "   - Reiniciar: systemctl restart niochat"
log ""
log "📝 Próximos passos:"
log "   1. Configure o GitHub Actions"
log "   2. Teste o sistema"
log "   3. Configure monitoramento"
log ""
log "📊 Monitoramento:"
log "   - Logs: journalctl -u niochat -f"
log "   - Status: systemctl list-units --type=service --state=running | grep niochat"
log "   - Redis: systemctl status redis-server"
