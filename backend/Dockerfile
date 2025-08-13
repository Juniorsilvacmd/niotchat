FROM python:3.11-slim

# Definir variáveis de ambiente
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código do projeto
COPY . .

# Criar diretórios necessários
RUN mkdir -p /app/media /app/staticfiles

# Coletar arquivos estáticos
RUN python manage.py collectstatic --noinput

# Expor porta
EXPOSE 8010

# Comando padrão
CMD ["daphne", "-b", "0.0.0.0", "-p", "8010", "niochat.asgi:application"]
