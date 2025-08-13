#!/usr/bin/env python3
"""
Arquivo principal para deploy do Nio Chat
Este arquivo serve como ponte para o projeto Django
"""

import os
import sys
import subprocess
from pathlib import Path

# Adicionar o diretório do projeto ao Python path
project_root = Path(__file__).parent.parent
backend_dir = project_root / "backend"
sys.path.insert(0, str(backend_dir))

# Configurar variáveis de ambiente
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'niochat.settings')

# Importar Django
import django
from django.core.wsgi import get_wsgi_application

# Configurar Django
django.setup()

# Criar aplicação WSGI
application = get_wsgi_application()

if __name__ == "__main__":
    # Executar migrações
    subprocess.run([
        sys.executable, "manage.py", "migrate", "--noinput"
    ], cwd=backend_dir)
    
    # Coletar arquivos estáticos
    subprocess.run([
        sys.executable, "manage.py", "collectstatic", "--noinput"
    ], cwd=backend_dir)
    
    # Criar superusuário se não existir
    subprocess.run([
        sys.executable, "manage.py", "shell", "-c",
        """
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@niochat.com', 'admin123')
    print('Superusuário criado: admin/admin123')
else:
    print('Superusuário já existe')
        """
    ], cwd=backend_dir)
    
    print("🚀 Nio Chat configurado com sucesso!")
    print("🌐 Sistema pronto para produção")
    print("🔧 Admin: /admin (admin/admin123)")

