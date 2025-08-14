# Nio Chat - Sistema de Atendimento WhatsApp

Sistema completo de atendimento via WhatsApp com interface moderna, integração com Uazapi/Evolution API e recursos avançados de chat em tempo real.

## Funcionalidades Principais

### Chat Avançado
- Mensagens em tempo real via WebSocket
- Envio de mídia (imagens, vídeos, áudios, documentos)
- Reações a mensagens (emojis)
- Exclusão de mensagens para todos os participantes
- Fotos de perfil automáticas dos contatos
- Interface responsiva e moderna
- Gravação e envio de áudio
- Conversão automática de formatos de mídia

### Integração WhatsApp
- Uazapi/Evolution API integrado
- Webhooks para mensagens recebidas
- Envio de mídia com conversão automática
- Status de mensagens em tempo real
- Múltiplos provedores suportados
- Extração automática de external_id para exclusão
- Verificação de números via /chat/check

### Gestão de Equipe
- Múltiplos usuários e permissões
- Atribuição de conversas a agentes
- Transferência de conversas entre agentes
- Dashboard com métricas
- Logs de auditoria completos
- Status online/offline dos agentes

### Interface Moderna
- Design responsivo (mobile/desktop)
- Tema escuro/claro automático
- Componentes UI modernos
- Animações suaves e feedback visual
- Acessibilidade completa

### Painel de Administração
- Interface Django Admin customizada
- Gestão de usuários com permissões granulares
- Configuração de provedores e integrações
- Logs de auditoria detalhados
- Configurações do sistema
- Monitoramento de status online

## Arquitetura do Sistema

### Backend (Django)
- Django 5.2 - Framework web principal
- Django REST Framework - API REST
- Channels - WebSocket para comunicação em tempo real
- PostgreSQL/SQLite - Banco de dados
- Redis - Cache e sessões
- FFmpeg - Conversão de áudio
- Celery - Processamento assíncrono

### Frontend (React)
- React 18 - Interface de usuário
- Vite - Build tool e servidor de desenvolvimento
- Tailwind CSS - Estilização
- Shadcn/ui - Componentes UI
- Axios - Cliente HTTP
- WebSocket - Comunicação em tempo real
- React Hook Form - Gerenciamento de formulários

## Estrutura do Projeto

```
niochat/
├── backend/                 # Backend Django
│   ├── core/               # App principal (usuários, provedores)
│   ├── conversations/      # App de conversas e mensagens
│   ├── integrations/       # App de integrações (webhooks)
│   ├── niochat/          # Configurações Django
│   ├── media/             # Arquivos de mídia
│   └── static/            # Arquivos estáticos
├── frontend/              # Frontend React
│   └── frontend/          # Aplicação React
│       ├── src/           # Código fonte
│       ├── public/        # Arquivos públicos
│       └── package.json   # Dependências
├── docs/                  # Documentação
├── logs/                  # Logs do sistema
└── venv/                  # Ambiente virtual Python
```

## Instalação e Configuração

### Pré-requisitos
- Python 3.12+
- Node.js 18+
- PostgreSQL (opcional, SQLite por padrão)
- Redis
- FFmpeg

### 1. Clone o repositório
```bash
git clone https://github.com/Juniorsilvacmd/niochat.git
cd niochat
```

### 2. Configure o ambiente Python
```bash
# Crie um ambiente virtual
python -m venv venv

# Ative o ambiente
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Instale as dependências
pip install -r requirements.txt
```

### 3. Configure o banco de dados
```bash
# Para SQLite (padrão)
# Nenhuma configuração adicional necessária

# Para PostgreSQL (opcional)
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres psql
CREATE DATABASE niochat;
CREATE USER niochat_user WITH PASSWORD 'niochat_password';
GRANT ALL PRIVILEGES ON DATABASE niochat TO niochat_user;
\q
```

### 4. Configure as variáveis de ambiente
```bash
# Crie um arquivo .env
cp env.example .env

# Edite o arquivo .env com suas configurações
nano .env
```

### 5. Execute as migrações
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### 6. Configure o Frontend
```bash
cd frontend/frontend
npm install
# ou
pnpm install
```

### 7. Inicie os servidores

**IMPORTANTE**: Execute os comandos em terminais separados para desenvolvimento local e acesso na rede.

#### Para Desenvolvimento Local:
```bash
# Terminal 1 - Backend
cd backend
python manage.py runserver 0.0.0.0:8010

# Terminal 2 - Frontend
cd frontend/frontend
npm run dev
```

#### Para Acesso na Rede:
```bash
# Terminal 1 - Backend (acessível na rede)
cd backend
python manage.py runserver 0.0.0.0:8010

# Terminal 2 - Frontend (acessível na rede)
cd frontend/frontend
npm run dev -- --host 0.0.0.0
```

### 8. Acesse o sistema
- **Frontend**: http://localhost:5173 (desenvolvimento) ou http://seu_ip:5173 (rede)
- **Backend**: http://localhost:8010 (desenvolvimento) ou http://seu_ip:8010 (rede)
- **Admin**: http://localhost:8010/admin

### 9. Crie um superusuário (primeira vez)
```bash
cd backend
python manage.py createsuperuser
```

## Deploy em Produção

### Domínios Configurados
- **app.niochat.com.br** - Frontend React (aplicação principal)
- **api.niochat.com.br** - Backend Django (API REST)
- **admin.niochat.com.br** - Painel de administração Django

### Pré-requisitos para Produção
- Python 3.8+ instalado
- Node.js 16+ instalado
- Redis instalado e configurado
- PostgreSQL instalado e configurado

### 1. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp production.env .env

# Edite as variáveis necessárias
nano .env
```

**Variáveis importantes a configurar:**
- `SECRET_KEY` - Chave secreta do Django
- `POSTGRES_PASSWORD` - Senha do PostgreSQL
- `EMAIL_HOST_USER` e `EMAIL_HOST_PASSWORD` - Configurações de email

### 2. Execute o deploy
```bash
# Torne o script executável
chmod +x deploy.sh

# Execute o deploy
./deploy.sh
```

### 3. Verifique os serviços
```bash
# Status dos serviços
systemctl status niochat-backend
systemctl status niochat-frontend

# Logs dos serviços
journalctl -u niochat-backend -f
journalctl -u niochat-frontend -f
```

### 4. Acesse a aplicação
- **Frontend**: https://app.niochat.com.br
- **API**: https://api.niochat.com.br
- **Admin**: https://admin.niochat.com.br

### 5. Comandos úteis para produção
```bash
# Parar todos os serviços
sudo systemctl stop niochat-backend niochat-frontend

# Reiniciar serviços
sudo systemctl restart niochat-backend niochat-frontend

# Atualizar código (após git pull)
cd /c/app_niochat
git pull origin main
sudo systemctl restart niochat-backend niochat-frontend

# Executar migrações
cd backend
python manage.py migrate

# Criar superusuário
python manage.py createsuperuser

# Coletar arquivos estáticos
python manage.py collectstatic --noinput

# Backup do banco de dados
pg_dump -U niochat_user niochat > backup.sql

# Restaurar backup
psql -U niochat_user niochat < backup.sql
```

### 6. SSL Certificates
Para produção, substitua os certificados auto-assinados por certificados válidos:

```bash
# Certificados Let's Encrypt (recomendado)
certbot certonly --webroot -w /var/www/html -d app.niochat.com.br
certbot certonly --webroot -w /var/www/html -d api.niochat.com.br
certbot certonly --webroot -w /var/www/html -d admin.niochat.com.br

# Copie os certificados para nginx/ssl/
cp /etc/letsencrypt/live/app.niochat.com.br/fullchain.pem nginx/ssl/app.niochat.com.br.crt
cp /etc/letsencrypt/live/app.niochat.com.br/privkey.pem nginx/ssl/app.niochat.com.br.key
# Repita para api.niochat.com.br e admin.niochat.com.br
```

### 7. Monitoramento
```bash
# Verificar uso de recursos
htop
ps aux | grep niochat

# Verificar logs em tempo real
journalctl -u niochat-backend -f --tail=100
journalctl -u niochat-frontend -f --tail=100

# Verificar conectividade
curl -I https://app.niochat.com.br
curl -I https://api.niochat.com.br
curl -I https://admin.niochat.com.br
```

## Configuração de Produção

### Variáveis de Ambiente
```bash
# .env
SECRET_KEY=sua_chave_secreta_aqui
DEBUG=False
DATABASE_URL=postgresql://user:password@localhost/niochat
REDIS_URL=redis://localhost:6379
ALLOWED_HOSTS=seu_dominio.com
```

### Configuração do Uazapi
1. Configure o provedor no admin Django
2. Adicione as credenciais do Uazapi:
   - whatsapp_token
   - whatsapp_url
   - instance

### Configuração de Webhooks
Configure o webhook no Uazapi para apontar para:
```
https://seu_dominio.com/api/webhooks/evolution-uazapi/
```

## Integrações Suportadas

### WhatsApp (Uazapi/Evolution)
- Webhook: /api/webhooks/evolution-uazapi/
- Envio de mensagens de texto
- Envio de mídia (imagens, vídeos, áudios, documentos)
- Reações a mensagens
- Exclusão de mensagens
- Verificação de números via /chat/check
- Status de entrega

### Telegram
- Integração via API oficial
- Envio e recebimento de mensagens
- Suporte a mídia
- Configuração via admin Django

### Email
- Suporte a múltiplos provedores (Gmail, Outlook, Yahoo)
- Configuração IMAP/SMTP
- Monitoramento de caixa de entrada
- Envio de respostas automáticas

### Webchat
- Widget personalizável
- Formulário pré-chat configurável
- Horário de funcionamento
- Integração com sistema de conversas

## Sistema de Usuários e Permissões

### Tipos de Usuário
- Superadmin: Acesso total ao sistema
- Admin: Administrador de provedor específico
- Agente: Atendente com permissões limitadas

### Permissões Granulares
- Ver atendimentos com IA
- Ver apenas atendimentos atribuídos
- Ver atendimentos não atribuídos da equipe
- Gerenciar contatos
- Gerenciar relatórios
- Gerenciar base de conhecimento

### Painel de Administração
- Interface Django Admin customizada
- Gestão de usuários com permissões
- Configuração de provedores
- Logs de auditoria
- Configurações do sistema
- Monitoramento de status

## Funcionalidades Específicas

### Sistema de Mensagens
- Envio: Mensagens de texto, mídia e áudio
- Recepção: Webhooks do WhatsApp via Uazapi
- Reações: Emojis em mensagens
- Exclusão: Deletar mensagens para todos
- Status: Confirmação de entrega
- External ID: Extração automática para exclusão

### Sistema de Conversas
- Atribuição: Conversas para agentes específicos
- Transferência: Entre agentes
- Status: Aberta, fechada, pendente
- Histórico: Mensagens com timestamp
- Equipes: Organização por equipes

### Sistema de Provedores
- Multi-tenant: Cada provedor tem seus dados
- Configurações personalizadas
- Integrações específicas
- Administradores dedicados
- Informações de negócio

### Sistema de Auditoria
- Logs de login/logout
- Ações de usuários
- Timestamps e IPs
- Detalhes das operações
- Filtros por provedor

## API Endpoints

### Autenticação
- POST /api/auth/login/ - Login
- POST /api/auth/logout/ - Logout

### Conversas
- GET /api/conversations/ - Listar conversas
- POST /api/conversations/ - Criar conversa
- GET /api/conversations/{id}/ - Detalhes da conversa
- PUT /api/conversations/{id}/ - Atualizar conversa

### Mensagens
- GET /api/messages/ - Listar mensagens
- POST /api/messages/send_text/ - Enviar texto
- POST /api/messages/send_media/ - Enviar mídia
- POST /api/messages/react/ - Reagir a mensagem
- POST /api/messages/delete_message/ - Deletar mensagem

### Webhooks
- POST /api/webhooks/evolution-uazapi/ - Webhook Uazapi/Evolution
- POST /api/webhooks/evolution/ - Webhook Evolution (legado)

### Integrações
- GET /api/integrations/telegram/ - Integração Telegram
- GET /api/integrations/email/ - Integração Email
- GET /api/integrations/whatsapp/ - Integração WhatsApp
- GET /api/integrations/webchat/ - Integração Webchat

## WebSocket Events

### Eventos de Chat
- chat_message - Nova mensagem
- message_reaction - Reação a mensagem
- message_deleted - Mensagem deletada
- user_status - Status do usuário

## Modelos de Dados

### Core (Sistema Principal)
- User: Usuários do sistema
- Company: Empresas (multi-tenant)
- CompanyUser: Relacionamento usuário-empresa
- Provedor: Provedores de serviços
- Canal: Canais de comunicação
- Label: Rótulos/etiquetas
- AuditLog: Logs de auditoria
- SystemConfig: Configurações do sistema

### Conversations (Conversas)
- Inbox: Caixas de entrada
- Contact: Contatos dos clientes
- Conversation: Conversas
- Message: Mensagens
- Team: Equipes
- TeamMember: Membros das equipes

### Integrations (Integrações)
- TelegramIntegration: Integração Telegram
- EmailIntegration: Integração Email
- WhatsAppIntegration: Integração WhatsApp
- WebchatIntegration: Integração Webchat

## Desenvolvimento

### Scripts Úteis
```bash
# Iniciar desenvolvimento
./start_dev.sh

# Limpar banco de dados
python manage.py flush

# Criar superusuário
python manage.py createsuperuser

# Coletar arquivos estáticos
python manage.py collectstatic
```

### Estrutura de Dados

#### Relacionamentos Principais
- Provedor -> Inbox (1:N)
- Inbox -> Conversation (1:N)
- Contact -> Conversation (1:N)
- Conversation -> Message (1:N)
- User -> TeamMember (1:N)
- Team -> TeamMember (1:N)
- Provedor -> Integrations (1:1)

#### Configurações de Provedor
- Dados de negócio (planos, horários, etc.)
- Integrações externas (SGP, URA)
- Configurações de IA (personalidade, estilo)
- Informações de contato
- Configurações técnicas

## Troubleshooting

### Problemas Comuns

#### WebSocket não conecta
- Verifique se o Redis está rodando
- Confirme as configurações do Channels
- Verifique os logs do Django

#### Mensagens não aparecem
- Verifique os webhooks do Uazapi
- Confirme as credenciais do provedor
- Verifique os logs de integração

#### Mídia não carrega
- Verifique as permissões da pasta media/
- Confirme a configuração do MEDIA_URL
- Verifique se o FFmpeg está instalado

#### Frontend não carrega
- Verifique se o Vite está rodando na porta correta
- Confirme as configurações de proxy
- Verifique os logs do navegador

#### Integrações não funcionam
- Verifique as credenciais no admin Django
- Confirme as configurações de webhook
- Verifique os logs de integração

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## Suporte

Para suporte técnico ou dúvidas, abra uma issue no GitHub ou entre em contato através do email de suporte.

### 🤖 Inteligência Artificial Avançada
- **IA ChatGPT Integrada**: Atendimento automatizado inteligente
- **Consulta SGP Automática**: IA consulta dados reais do cliente automaticamente
- **Function Calls**: IA executa funções do SGP em tempo real
- **Detecção Inteligente**: Reconhece demandas específicas (fatura, suporte, etc.)
- **Fluxo Adaptativo**: Não faz perguntas desnecessárias quando o cliente já especificou o que quer
- **Saudações Dinâmicas**: Baseadas no horário atual (Bom dia, Boa tarde, Boa noite)
- **Personalidade Customizável**: Provedores podem configurar estilo, emojis e personalidade da IA
- **Personalidade Avançada**: Vícios de linguagem, características, princípios e humor personalizáveis

### 🏦 Integração SGP (Sistema de Gestão de Provedores)
- **Consulta Automática de Clientes**: Por CPF/CNPJ com dados reais
- **Verificação de Conexão**: Status online/offline automático
- **Geração de Faturas**: Boleto + PIX + QR Code automático
- **Dados Reais**: Nunca inventa informações, sempre consulta o SGP
- **Function Calls SGP**: `consultar_cliente_sgp()`, `verificar_acesso_sgp()`, `gerar_fatura_completa()`

### ⚡ Fluxo de Atendimento Inteligente
- **Detecção de Demanda**: IA identifica automaticamente o que o cliente quer
- **Execução Direta**: Quando cliente diz "fatura" → pede CPF → consulta SGP → gera fatura automaticamente
- **Sem Perguntas Desnecessárias**: Não pergunta "como posso ajudar?" se o cliente já disse
- **Resposta Completa**: Dados do cliente + solução em uma única mensagem

### 🎯 Personalização por Provedor
- **Configuração Individual**: Cada provedor configura sua própria IA
- **SGP Personalizado**: URLs e tokens específicos por provedor
- **Personalidade Única**: Cada empresa tem sua identidade na IA
- **Emojis Configuráveis**: Sempre, ocasionalmente ou nunca

## API Endpoints - IA e SGP

### IA ChatGPT
- POST /api/core/atendimento-ia/ - Processar mensagem com IA
- Integração automática com SGP via Function Calls
- Resposta com dados reais do sistema

### SGP Function Calls (Executadas pela IA)
- `consultar_cliente_sgp(cpf_cnpj)` - Busca dados do cliente
- `verificar_acesso_sgp(contrato)` - Status da conexão
- `gerar_fatura_completa(contrato)` - Boleto + PIX + QR Code
- `gerar_pix_qrcode(fatura_id)` - PIX específico

## Configuração da IA

### 1. Configurar OpenAI
```bash
# No painel de superadmin, configure a chave da API OpenAI
# Configurações do Sistema -> Chave API OpenAI
```

### 2. Configurar SGP por Provedor
```bash
# Para cada provedor, configure:
# - SGP URL: https://sgp.provedor.com
# - SGP Token: token_de_acesso
# - SGP App: nome_da_aplicacao
```

### 3. Personalizar IA por Provedor
```bash
# Dados do Provedor:
# - Nome do Agente IA
# - Estilo de Personalidade
# - Uso de Emojis (sempre/ocasionalmente/nunca)
# - Personalidade Avançada (opcional):
#   * Vícios de linguagem
#   * Características
#   * Princípios
#   * Humor
```

## Exemplos de Uso da IA

### Consulta de Fatura Automática
```
Cliente: "Quero pagar minha fatura"
IA: "Para gerar sua fatura, preciso do seu CPF."
Cliente: "123.456.789-00"
IA: "Encontrei seu cadastro!
     👤 Nome: João Silva
     📋 Contrato: 12345
     ✅ Status: Ativo

     🧾 **Sua Fatura**
     💵 Valor: R$ 89,90
     📅 Vencimento: 15/08/2024
     💳 PIX: abc123def
     📱 QR Code: [link]
     📄 PDF: [link]"
```

### Suporte Técnico Automático
```
Cliente: "Minha internet não funciona"
IA: "Para verificar sua conexão, preciso do seu CPF."
Cliente: "123.456.789-00"
IA: "Encontrei seu cadastro!
     👤 Nome: João Silva
     📋 Contrato: 12345
     
     🔍 **Status da Conexão**
     🌐 Status: Offline
     ⚠️ Problema detectado na sua região
     
     Já acionei nossa equipe técnica!"
```

## Changelog

### v2.0.0 (Dezembro 2024) - IA Inteligente + SGP
- 🤖 **Integração ChatGPT**: IA conversacional avançada
- 🏦 **SGP Automático**: Consulta dados reais do cliente
- ⚡ **Function Calls**: IA executa funções SGP em tempo real
- 🎯 **Fluxo Inteligente**: Detecção automática de demandas
- 🎭 **Personalidade Avançada**: Customização completa da IA
- 📱 **Geração Automática**: Faturas com PIX e QR Code
- 🚀 **Atendimento 3x mais rápido**: Sem perguntas desnecessárias

### v1.0.0
- Sistema base completo
- Integração com Uazapi/Evolution
- Interface React moderna
- WebSocket em tempo real
- Sistema de reações e exclusão
- Gestão de equipes
- Upload e conversão de mídia
- Painel de administração customizado
- Sistema multi-tenant
- Logs de auditoria
- Integrações múltiplas (WhatsApp, Telegram, Email, Webchat)
- Sistema de permissões granulares
- Configurações de provedores
- Webhooks configuráveis

# Teste deploy automático
