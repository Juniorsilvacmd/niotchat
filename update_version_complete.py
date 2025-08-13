#!/usr/bin/env python3
"""
Script completo para atualizar versão e recompilar frontend
"""

import subprocess
import sys
from pathlib import Path

def run_command(command, cwd=None):
    """Executa um comando e retorna o resultado"""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            cwd=cwd, 
            capture_output=True, 
            text=True,
            encoding='utf-8'
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def update_version_and_build():
    """Atualiza a versão e recompila o frontend"""
    print("🚀 Atualizando versão completa do NioChat...")
    print("=" * 50)
    
    # 1. Verificar versão atual
    print("📋 Verificando versão atual...")
    success, output, error = run_command("python version_manager.py show")
    if success:
        print(f"✅ {output.strip()}")
    else:
        print(f"❌ Erro ao verificar versão: {error}")
        return False
    
    # 2. Atualizar versão (patch por padrão)
    print("\n🔄 Atualizando versão...")
    success, output, error = run_command("python version_manager.py patch")
    if success:
        print("✅ Versão atualizada com sucesso!")
        print(output)
    else:
        print(f"❌ Erro ao atualizar versão: {error}")
        return False
    
    # 3. Recompilar frontend
    print("\n🔨 Recompilando frontend...")
    frontend_dir = Path("frontend/frontend")
    if not frontend_dir.exists():
        print("❌ Diretório frontend não encontrado")
        return False
    
    success, output, error = run_command("npm run build", cwd=frontend_dir)
    if success:
        print("✅ Frontend recompilado com sucesso!")
        print(output)
    else:
        print(f"❌ Erro ao recompilar frontend: {error}")
        return False
    
    # 4. Verificar versão final
    print("\n📋 Verificando versão final...")
    success, output, error = run_command("python version_manager.py show")
    if success:
        print(f"✅ {output.strip()}")
    else:
        print(f"❌ Erro ao verificar versão final: {error}")
    
    print("\n🎉 Atualização de versão concluída com sucesso!")
    print("\n📝 Próximos passos:")
    print("1. Execute 'git add .' para adicionar as mudanças")
    print("2. Execute 'git commit -m \"v[NOVA_VERSÃO]\"' para fazer commit")
    print("3. Execute 'git push origin master' para enviar para o GitHub")
    print("4. Reinicie o servidor frontend (se estiver rodando)")
    print("5. Recarregue a página no navegador")
    
    return True

def main():
    """Função principal"""
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "patch":
            print("🔄 Atualizando versão PATCH...")
            run_command("python version_manager.py patch")
        elif command == "minor":
            print("🔄 Atualizando versão MINOR...")
            run_command("python version_manager.py minor")
        elif command == "major":
            print("🔄 Atualizando versão MAJOR...")
            run_command("python version_manager.py major")
        elif command == "build":
            print("🔨 Apenas recompilando frontend...")
            frontend_dir = Path("frontend/frontend")
            if frontend_dir.exists():
                success, output, error = run_command("npm run build", cwd=frontend_dir)
                if success:
                    print("✅ Frontend recompilado com sucesso!")
                else:
                    print(f"❌ Erro: {error}")
            else:
                print("❌ Diretório frontend não encontrado")
        elif command == "show":
            print("📋 Mostrando versão atual...")
            run_command("python version_manager.py show")
        else:
            print(f"❌ Comando inválido: {command}")
            print("Comandos válidos: patch, minor, major, build, show, complete")
    else:
        # Execução padrão: atualização completa
        update_version_and_build()

if __name__ == "__main__":
    main()
