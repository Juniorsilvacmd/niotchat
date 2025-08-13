#!/bin/bash

# Script de Instalação Inicial para VPS sem Docker
# Execute este script uma vez na VPS para configurar tudo

echo "🚀 Instalação inicial do NioChat na VPS (sem Docker)..."

# Configurações
PROJECT_DIR="/var/www/niochat"
GITHUB_REPO="https://github.com/Juniorsilvacmd/niochat.git"
DOMAIN_APP="app.niochat.com.br"
DOMAIN_API="api.niochat.com.br"
DOMAIN_ADMIN="admin.niochat.com.br"

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
apt install -y git curl wget nginx python3 python3-pip python3-venv nodejs npm redis-server postgresql postgresql-contrib certbot python3-certbot-nginx ufw ffmpeg

# Instalar Node.js 18+ se necessário
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    log "Instalando Node.js 18+..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Instalar pnpm globalmente
log "Instalando pnpm..."
npm install -g pnpm

# Configurar PostgreSQL
log "Configurando PostgreSQL..."
sudo -u postgres createuser --interactive --pwprompt niochat_user
sudo -u postgres createdb -O niochat_user niochat

# Configurar Redis
log "Configurando Redis..."
systemctl enable redis-server
systemctl start redis-server

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

# Executar migrações iniciais
log "Executando migrações iniciais..."
sudo -u www-data ../venv/bin/python manage.py migrate --noinput

# Criar superusuário
log "Criando superusuário..."
echo "from core.models import User; User.objects.create_superuser('admin', 'admin@niochat.com.br', 'admin123') if not User.objects.filter(username='admin').exists() else None" | sudo -u www-data ../venv/bin/python manage.py shell

# Coletar arquivos estáticos
log "Coletando arquivos estáticos..."
sudo -u www-data ../venv/bin/python manage.py collectstatic --noinput

cd $PROJECT_DIR

# Instalar dependências do frontend
log "Instalando dependências do frontend..."
cd frontend/frontend
sudo -u www-data pnpm install

# Build do frontend
log "Fazendo build do frontend..."
sudo -u www-data pnpm run build

cd $PROJECT_DIR

# Configurar serviços systemd
log "Configurando serviços systemd..."

# Serviço do backend
cat > /etc/systemd/system/niochat-backend.service << EOF
[Unit]
Description=NioChat Backend (Daphne)
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_DIR/backend
Environment=PATH=$PROJECT_DIR/venv/bin
ExecStart=$PROJECT_DIR/venv/bin/daphne -b 0.0.0.0 -p 8010 -w 2 niochat.asgi:application
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Serviço do Celery
cat > /etc/systemd/system/niochat-celery.service << EOF
[Unit]
Description=NioChat Celery Worker
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_DIR/backend
Environment=PATH=$PROJECT_DIR/venv/bin
ExecStart=$PROJECT_DIR/venv/bin/celery -A niochat worker -l info --concurrency=2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Serviço do Celery Beat
cat > /etc/systemd/system/niochat-celerybeat.service << EOF
[Unit]
Description=NioChat Celery Beat
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_DIR/backend
Environment=PATH=$PROJECT_DIR/venv/bin
ExecStart=$PROJECT_DIR/venv/bin/celery -A niochat beat -l info
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Recarregar systemd
systemctl daemon-reload

# Habilitar e iniciar serviços
log "Iniciando serviços..."
systemctl enable niochat-backend niochat-celery niochat-celerybeat
systemctl start niochat-backend niochat-celery niochat-celerybeat

# Configurar Nginx
log "Configurando Nginx..."

cat > /etc/nginx/sites-available/niochat << EOF
# Configuração do NioChat
server {
    listen 80;
    server_name $DOMAIN_APP $DOMAIN_API $DOMAIN_ADMIN 194.238.25.164;

    # Frontend (app)
    location / {
        root $PROJECT_DIR/frontend/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Headers de segurança
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8010;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Admin Django
    location /admin/ {
        proxy_pass http://127.0.0.1:8010;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://127.0.0.1:8010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Media files
    location /media/ {
        alias $PROJECT_DIR/backend/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Static files
    location /static/ {
        alias $PROJECT_DIR/backend/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Habilitar site
ln -sf /etc/nginx/sites-available/niochat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
nginx -t

# Recarregar Nginx
systemctl reload nginx

# Configurar firewall
log "Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configurar SSL com Let's Encrypt
log "Configurando SSL..."
certbot --nginx -d $DOMAIN_APP -d $DOMAIN_API -d $DOMAIN_ADMIN --non-interactive --agree-tos --email admin@niochat.com.br

# Configurar renovação automática do SSL
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# Configurar permissões
log "Configurando permissões..."
chown -R www-data:www-data $PROJECT_DIR
chmod -R 755 $PROJECT_DIR

# Criar script de deploy
log "Criando script de deploy..."
chmod +x deploy_vps_native.sh

log "✅ Instalação concluída com sucesso!"
log "🌐 URLs configuradas:"
log "   - App: https://$DOMAIN_APP"
log "   - API: https://$DOMAIN_API"
log "   - Admin: https://$DOMAIN_ADMIN"
log ""
log "🔑 Credenciais de acesso:"
log "   - Usuário: admin"
log "   - Senha: admin123"
log "   - URL: https://$DOMAIN_ADMIN/admin/"
log ""
log "📋 Próximos passos:"
log "   1. Acesse o admin e altere a senha do usuário admin"
log "   2. Configure as variáveis de ambiente no arquivo .env"
log "   3. Configure o GitHub Actions com os secrets:"
log "      - VPS_HOST: 194.238.25.164"
log "      - VPS_SSH_KEY: sua-chave-ssh-privada"
log ""
log "🚀 Para fazer deploy automático, faça push para a branch main!"
