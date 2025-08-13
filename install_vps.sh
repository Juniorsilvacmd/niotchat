#!/bin/bash

# Script de Instalação Inicial para VPS
# Execute este script uma vez na VPS para configurar tudo

echo "🚀 Instalação inicial do NioChat na VPS..."

# Configurações
PROJECT_DIR="/var/www/niochat"
GITHUB_REPO="https://github.com/Juniorsilvacmd/niochat.git"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    error "Execute este script como root (sudo)"
    exit 1
fi

log "Atualizando sistema..."
apt update && apt upgrade -y

log "Instalando dependências..."
apt install -y git curl wget nginx python3 python3-pip python3-venv nodejs npm redis-server

# Instalar Node.js 18+ se necessário
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    log "Instalando Node.js 18+..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
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

# Criar ambiente virtual
log "Criando ambiente virtual..."
sudo -u www-data python3 -m venv venv
source venv/bin/activate

# Instalar dependências do backend
log "Instalando dependências do backend..."
cd backend
pip install -r requirements.txt

# Configurar banco de dados
log "Configurando banco de dados..."
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Criar superusuário se não existir
if ! python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(is_superuser=True).exists()" 2>/dev/null | grep -q "True"; then
    log "Criando superusuário..."
    echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@niochat.com.br', 'admin123') if not User.objects.filter(is_superuser=True).exists() else None" | python manage.py shell
fi

cd ..

# Instalar dependências do frontend
log "Instalando dependências do frontend..."
cd frontend/frontend
npm install
npm run build
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
cp systemd/*.service /etc/systemd/system/

# Recarregar systemd
systemctl daemon-reload

# Habilitar e iniciar serviços
systemctl enable niochat-backend
systemctl enable niochat-frontend
systemctl enable nginx
systemctl enable redis

# Iniciar serviços
systemctl start redis
systemctl start niochat-backend
systemctl start niochat-frontend
systemctl start nginx

# Configurar webhook de deploy
log "Configurando webhook de deploy..."
cp webhook/deploy_webhook.py /usr/local/bin/
chmod +x /usr/local/bin/deploy_webhook.py
chmod +x deploy_automated.sh

# Criar serviço para webhook
cat > /etc/systemd/system/niochat-webhook.service << EOF
[Unit]
Description=NioChat Deploy Webhook
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/deploy_webhook.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable niochat-webhook
systemctl start niochat-webhook

# Configurar firewall
log "Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp  # Webhook
ufw --force enable

# Configurar SSL com Let's Encrypt
log "Configurando SSL..."
apt install -y certbot python3-certbot-nginx

# Verificar se os domínios estão configurados
log "Verificando domínios..."
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
log "   - Deploy manual: bash deploy_automated.sh"
log ""
log "📝 Próximos passos:"
log "   1. Configure os domínios no DNS"
log "   2. Configure o webhook no GitHub"
log "   3. Teste o sistema"
log ""
log "🔗 Webhook GitHub:"
log "   URL: http://194.238.25.164:8080"
log "   Secret: niochat_deploy_secret_2024" 