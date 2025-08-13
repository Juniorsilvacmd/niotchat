#!/bin/bash

echo "🚀 Deploying NioChat to Production..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy production.env to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Create SSL certificates directory if it doesn't exist
mkdir -p nginx/ssl

# Generate SSL certificates (self-signed for development)
echo "🔐 Generating SSL certificates..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/app.niochat.com.br.key \
    -out nginx/ssl/app.niochat.com.br.crt \
    -subj "/C=BR/ST=SP/L=Sao Paulo/O=NioChat/CN=app.niochat.com.br"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/api.niochat.com.br.key \
    -out nginx/ssl/api.niochat.com.br.crt \
    -subj "/C=BR/ST=SP/L=Sao Paulo/O=NioChat/CN=api.niochat.com.br"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/admin.niochat.com.br.key \
    -out nginx/ssl/admin.niochat.com.br.crt \
    -subj "/C=BR/ST=SP/L=Sao Paulo/O=NioChat/CN=admin.niochat.com.br"

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
cd backend
pip install -r ../requirements.txt

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd ../frontend/frontend
npm install

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Start services
echo "🚀 Starting services..."
cd ../..
sudo systemctl start niochat-backend
sudo systemctl start niochat-frontend

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
cd backend
python manage.py migrate

# Create superuser if it doesn't exist
echo "👤 Creating superuser..."
python manage.py createsuperuser --noinput || true

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo "✅ Deployment completed!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: https://app.niochat.com.br"
echo "   API: https://api.niochat.com.br"
echo "   Admin: https://admin.niochat.com.br"
echo ""
echo "📊 Check service status:"
echo "   sudo systemctl status niochat-backend niochat-frontend"
echo ""
echo "📝 View logs:"
echo "   journalctl -u niochat-backend -f"
echo "   journalctl -u niochat-frontend -f" 