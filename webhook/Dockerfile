FROM python:3.11-slim

# Definir variáveis de ambiente
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        bash \
    && rm -rf /var/lib/apt/lists/*

# Copiar código do webhook
COPY deploy_webhook.py .

# Expor porta
EXPOSE 8080

# Comando padrão
CMD ["python", "deploy_webhook.py"]
