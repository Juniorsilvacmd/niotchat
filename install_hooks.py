#!/usr/bin/env python3
"""
Script para instalar hooks de versionamento automático
"""

import os
import shutil
from pathlib import Path

def install_hooks():
    """Instala os hooks de versionamento"""
    print("🚀 Instalando hooks de versionamento automático para NioChat...")
    
    # Caminho para os hooks do Git
    hooks_dir = Path(".git/hooks")
    pre_commit_hook = hooks_dir / "pre-commit"
    
    if not hooks_dir.exists():
        print("❌ Diretório .git/hooks não encontrado. Execute este script na raiz do repositório Git.")
        return False
    
    # Fazer backup do hook existente se houver
    if pre_commit_hook.exists():
        backup_path = hooks_dir / "pre-commit.bak"
        shutil.copy2(pre_commit_hook, backup_path)
        print(f"✅ Backup do hook existente criado: {backup_path}")
    
    # Copiar o hook pre-commit
    source_hook = Path("pre-commit")
    if source_hook.exists():
        shutil.copy2(source_hook, pre_commit_hook)
        print("✅ Hook pre-commit instalado com sucesso!")
        
        # Tornar executável (funciona no Windows também)
        try:
            os.chmod(pre_commit_hook, 0o755)
            print("✅ Hook pre-commit configurado como executável")
        except Exception as e:
            print(f"⚠️  Aviso: Não foi possível configurar permissões: {e}")
            print("   No Windows, isso é normal e não afeta o funcionamento")
    else:
        print("❌ Arquivo pre-commit não encontrado")
        return False
    
    print("\n📝 Para usar o sistema de versionamento automático:")
    print("\n1. Atualizar versão manualmente:")
    print("   python version_manager.py [major|minor|patch]")
    print("\n2. Ver versão atual:")
    print("   python version_manager.py show")
    print("\n3. O hook pre-commit atualizará automaticamente a versão")
    print("   em todos os arquivos antes de cada commit")
    print("\n🎯 Tipos de versão:")
    print("   - major: 1.0.0 → 2.0.0 (mudanças incompatíveis)")
    print("   - minor: 1.0.0 → 1.1.0 (novas funcionalidades)")
    print("   - patch: 1.0.0 → 1.0.1 (correções e melhorias)")
    print("\n🎉 Sistema de versionamento configurado com sucesso!")
    
    return True

def test_version_manager():
    """Testa o gerenciador de versões"""
    print("\n🧪 Testando gerenciador de versões...")
    
    try:
        from version_manager import VersionManager
        manager = VersionManager()
        manager.show_current_version()
        print("✅ Gerenciador de versões funcionando corretamente!")
        return True
    except Exception as e:
        print(f"❌ Erro ao testar gerenciador de versões: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Instalador de Hooks de Versionamento - NioChat")
    print("=" * 50)
    
    # Verificar se estamos na raiz do repositório Git
    if not Path(".git").exists():
        print("❌ Este script deve ser executado na raiz de um repositório Git")
        print("   Certifique-se de estar no diretório correto")
        exit(1)
    
    # Instalar hooks
    if install_hooks():
        # Testar gerenciador de versões
        test_version_manager()
        
        print("\n🎯 Próximos passos:")
        print("1. Execute 'python version_manager.py show' para ver a versão atual")
        print("2. Faça suas alterações no código")
        print("3. Execute 'git add .' e 'git commit'")
        print("4. A versão será atualizada automaticamente!")
    else:
        print("❌ Falha na instalação dos hooks")
        exit(1)
