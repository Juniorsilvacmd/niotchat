#!/bin/bash

# Script de Instalação Inicial para VPS sem Docker
# Execute este script uma vez na VPS para configurar tudo

echo "🚀 Instalação inicial do NioChat na VPS (sem Docker)..."

# Configurações
PROJECT_DIR="/var/www/niochat"
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
cp nginx/sites/*.conf /etc/nginx/sites-available/

# Habilitar sites
ln -sf /etc/nginx/sites-available/app.niochat.com.br.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/api.niochat.com.br.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/admin.niochat.com.br.conf /etc/nginx/sites-enabled/

# Remover site padrão
rm -f /etc/nginx/sites-enabled/default

# Configurar systemd services
log "Configurando serviços systemd..."

# Serviço do Backend (Daphne)
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
ExecStart=$PROJECT_DIR/venv/bin/daphne -b 0.0.0.0 -p 8010 niochat.asgi:application
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Serviço do Celery Worker
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
ExecStart=$PROJECT_DIR/venv/bin/celery -A niochat worker -l info
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Serviço do Celery Beat
cat > /etc/systemd/system/niochat-celery-beat.service << EOF
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
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Serviço do Webhook
cat > /etc/systemd/system/niochat-webhook.service << EOF
[Unit]
Description=NioChat Deploy Webhook
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_DIR
ExecStart=$PROJECT_DIR/venv/bin/python webhook/deploy_webhook.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Recarregar systemd
systemctl daemon-reload

# Habilitar e iniciar serviços
systemctl enable niochat-backend
systemctl enable niochat-celery
systemctl enable niochat-celery-beat
systemctl enable niochat-webhook
systemctl enable nginx
systemctl enable postgresql
systemctl enable redis-server

# Iniciar serviços
systemctl start postgresql
systemctl start redis-server
systemctl start niochat-backend
systemctl start niochat-celery
systemctl start niochat-celery-beat
systemctl start niochat-webhook
systemctl start nginx

# Configurar firewall
log "Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp  # Webhook
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

# Configurar cron para verificar atualizações
log "Configurando cron para verificar atualizações..."
echo "*/5 * * * * cd $PROJECT_DIR && git fetch origin && git diff --quiet origin/main HEAD || systemctl start niochat-deploy" | crontab -

# Dar permissões aos scripts
chmod +x deploy_vps_native.sh
chmod +x deploy_automated.sh

# Configurar serviço para deploy automático
cat > /etc/systemd/system/niochat-deploy.service << EOF
[Unit]
Description=NioChat Deploy Service
After=network.target

[Service]
Type=oneshot
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=/bin/bash deploy_vps_native.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

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

log "🎉 Instalação concluída!"
log ""
log "🌐 URLs:"
log "   - Frontend: https://app.niochat.com.br"
log "   - API: https://api.niochat.com.br"
log "   - Admin: https://admin.niochat.com.br"
log "   - Webhook: http://194.238.25.164:8080"
log ""
log "🔧 Comandos úteis:"
log "   - Status: systemctl status niochat-*"
log "   - Logs: journalctl -u niochat-backend -f"
log "   - Deploy manual: bash deploy_vps_native.sh"
log "   - Reiniciar: systemctl restart niochat-backend"
log ""
log "📝 Próximos passos:"
log "   1. Configure o webhook no GitHub"
log "   2. Teste o sistema"
log "   3. Configure monitoramento"
log ""
log "🔗 Webhook GitHub:"
log "   URL: http://194.238.25.164:8080"
log "   Secret: niochat_deploy_secret_2024"
log ""
log "📊 Monitoramento:"
log "   - Logs: journalctl -u niochat-* -f"
log "   - Status: systemctl list-units --type=service --state=running | grep niochat"
