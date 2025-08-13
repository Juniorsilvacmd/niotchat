#!/bin/bash

# Script de Instalação Inicial para VPS com Docker
# Execute este script uma vez na VPS para configurar tudo

echo "🚀 Instalação inicial do NioChat na VPS com Docker..."

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
apt install -y git curl wget nginx certbot python3-certbot-nginx ufw

# Instalar Docker
log "Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    log "✅ Docker instalado"
else
    log "✅ Docker já está instalado"
fi

# Instalar Docker Compose
log "Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    log "✅ Docker Compose instalado"
else
    log "✅ Docker Compose já está instalado"
fi

# Criar usuário www-data se não existir
if ! id "www-data" &>/dev/null; then
    useradd -r -s /bin/bash www-data
fi

# Adicionar www-data ao grupo docker
usermod -aG docker www-data

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

# Configurar firewall
log "Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp  # Webhook
ufw --force enable

# Configurar Nginx para redirecionar para Docker
log "Configurando Nginx..."
cat > /etc/nginx/sites-available/niochat << EOF
server {
    listen 80;
    server_name app.niochat.com.br api.niochat.com.br admin.niochat.com.br;
    
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/niochat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

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

# Configurar serviço systemd para o webhook
log "Configurando serviço webhook..."
cat > /etc/systemd/system/niochat-webhook.service << EOF
[Unit]
Description=NioChat Deploy Webhook
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/docker-compose up -d webhook
ExecStop=/usr/bin/docker-compose stop webhook
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable niochat-webhook

# Configurar serviço para deploy automático
log "Configurando serviço de deploy..."
cat > /etc/systemd/system/niochat-deploy.service << EOF
[Unit]
Description=NioChat Deploy Service
After=network.target

[Service]
Type=oneshot
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=/bin/bash deploy_vps.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# Configurar cron para verificar atualizações
log "Configurando cron para verificar atualizações..."
echo "*/5 * * * * cd $PROJECT_DIR && git fetch origin && git diff --quiet origin/main HEAD || systemctl start niochat-deploy" | crontab -

# Dar permissões aos scripts
chmod +x deploy_vps.sh
chmod +x deploy_automated.sh

# Fazer deploy inicial
log "Fazendo deploy inicial..."
if [ -f ".env" ]; then
    bash deploy_vps.sh
else
    warning "⚠️ Arquivo .env não configurado, configure-o e execute: bash deploy_vps.sh"
fi

log "🎉 Instalação concluída!"
log ""
log "🌐 URLs:"
log "   - Frontend: https://app.niochat.com.br"
log "   - API: https://api.niochat.com.br"
log "   - Admin: https://admin.niochat.com.br"
log "   - Webhook: http://194.238.25.164:8080"
log ""
log "🔧 Comandos úteis:"
log "   - Status: docker-compose ps"
log "   - Logs: docker-compose logs -f [servico]"
log "   - Deploy manual: bash deploy_vps.sh"
log "   - Reiniciar webhook: systemctl restart niochat-webhook"
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
log "   - Docker: docker stats"
log "   - Logs: journalctl -u niochat-* -f"
