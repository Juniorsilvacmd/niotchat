#!/usr/bin/env python3
"""
Script para iniciar o sistema Nio Chat na porta 8010
"""

import subprocess
import sys
import os
import time
from multiprocessing import Process

def start_django():
    """Iniciar servidor Django na porta 8010"""
    os.chdir('backend')
    subprocess.run([sys.executable, 'manage.py', 'runserver', '0.0.0.0:8010'])

if __name__ == "__main__":
    print("🚀 Iniciando Nio Chat na porta 8010...")
    print("=========================================")
    
    # Criar processo para Django
    django_process = Process(target=start_django)
    
    try:
        # Iniciar Django
        print("Iniciando Django (porta 8010)...")
        django_process.start()
        
        print("✅ Sistema iniciado com sucesso!")
        print("")
        print("🌐 Acesse:")
        print("  Frontend: http://localhost:8010")
        print("  Admin:    http://localhost:8010/admin")
        print("  API:      http://localhost:8010/api/")
        print("  Health:   http://localhost:8010/health")
        print("")
        print("📱 Sistema completo rodando na porta 8010")
        print("   - Django Backend")
        print("   - FastAPI integrado")
        print("   - WebSocket ativo")
        print("   - Interface web")
        print("")
        print("⏹️  Pressione Ctrl+C para parar")
        
        # Aguardar processo
        django_process.join()
        
    except KeyboardInterrupt:
        print("\n🛑 Parando servidor...")
        django_process.terminate()
        django_process.join()
        print("✅ Servidor parado.")

