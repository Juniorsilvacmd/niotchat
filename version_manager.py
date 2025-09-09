#!/usr/bin/env python3
"""
Gerenciador de Versões Automático para NioChat
Atualiza automaticamente a versão em todos os arquivos relevantes
"""

import re
import os
import sys
import json
from pathlib import Path
from datetime import datetime

class VersionManager:
    def __init__(self):
        self.version_file = Path("VERSION")
        self.current_version = self.read_version()
        
    def read_version(self):
        """Lê a versão atual do arquivo VERSION"""
        if self.version_file.exists():
            return self.version_file.read_text().strip()
        return "0.0.0"
    
    def bump_version(self, bump_type="patch"):
        """Incrementa a versão baseado no tipo especificado"""
        major, minor, patch = map(int, self.current_version.split('.'))
        
        if bump_type == "major":
            major += 1
            minor = 0
            patch = 0
        elif bump_type == "minor":
            minor += 1
            patch = 0
        elif bump_type == "patch":
            patch += 1
        else:
            raise ValueError("bump_type deve ser 'major', 'minor' ou 'patch'")
        
        new_version = f"{major}.{minor}.{patch}"
        return new_version
    
    def update_version_file(self, new_version):
        """Atualiza o arquivo VERSION"""
        self.version_file.write_text(f"{new_version}\n")
        print(f"✅ Arquivo VERSION atualizado para {new_version}")
    
    def update_package_json(self, new_version):
        """Atualiza a versão no package.json do frontend"""
        package_json_path = Path("frontend/frontend/package.json")
        if package_json_path.exists():
            content = package_json_path.read_text()
            # Atualizar versão principal
            content = re.sub(r'"version": "\d+\.\d+\.\d+"', f'"version": "{new_version}"', content)
            package_json_path.write_text(content)
            print(f"✅ package.json atualizado para versão {new_version}")
    
    def update_package_lock(self, new_version):
        """Atualiza a versão no package-lock.json"""
        package_lock_path = Path("frontend/frontend/package-lock.json")
        if package_lock_path.exists():
            content = package_lock_path.read_text()
            # Atualizar versão principal
            content = re.sub(r'"version": "\d+\.\d+\.\d+"', f'"version": "{new_version}"', content)
            # Atualizar versão do projeto
            content = re.sub(r'"name": "niochat-frontend",\s*"version": "\d+\.\d+\.\d+"', 
                           f'"name": "niochat-frontend",\n  "version": "{new_version}"', content)
            package_lock_path.write_text(content)
            print(f"✅ package-lock.json atualizado para versão {new_version}")
    
    def update_pnpm_lock(self, new_version):
        """Atualiza a versão no pnpm-lock.yaml"""
        pnpm_lock_path = Path("frontend/frontend/pnpm-lock.yaml")
        if pnpm_lock_path.exists():
            content = pnpm_lock_path.read_text()
            # Atualizar versão principal
            content = re.sub(r'version: \d+\.\d+\.\d+', f'version: {new_version}', content)
            pnpm_lock_path.write_text(content)
            print(f"✅ pnpm-lock.yaml atualizado para versão {new_version}")
    
    def update_django_settings(self, new_version):
        """Atualiza a versão nas configurações do Django"""
        settings_path = Path("backend/niochat/settings.py")
        if settings_path.exists():
            content = settings_path.read_text()
            
            # Adicionar ou atualizar a configuração de versão
            version_config = f'VERSION = "{new_version}"'
            
            if 'VERSION =' in content:
                content = re.sub(r'VERSION = "[^"]*"', version_config, content)
            else:
                # Adicionar após as configurações básicas
                content = content.replace(
                    'from pathlib import Path',
                    'from pathlib import Path\n\n# Version\nVERSION = "2.1.0"'
                )
            
            settings_path.write_text(content)
            print(f"✅ Django settings atualizado para versão {new_version}")
    
    def update_telegram_service(self, new_version):
        """Atualiza a versão no telegram_service.py"""
        telegram_path = Path("backend/core/telegram_service.py")
        if telegram_path.exists():
            content = telegram_path.read_text()
            # Atualizar versões do sistema e app
            content = re.sub(r'system_version="[^"]*"', f'system_version="{new_version}"', content)
            content = re.sub(r'app_version="[^"]*"', f'app_version="{new_version}"', content)
            telegram_path.write_text(content)
            print(f"✅ telegram_service.py atualizado para versão {new_version}")
    
    def update_frontend_version_config(self, new_version):
        """Atualiza a versão no arquivo de configuração do frontend"""
        version_config_path = Path("frontend/frontend/src/config/version.js")
        if version_config_path.exists():
            content = version_config_path.read_text()
            
            # Atualizar versão
            content = re.sub(r"export const APP_VERSION = '[^']*'", f"export const APP_VERSION = '{new_version}'", content)
            
            # Atualizar data de build
            from datetime import datetime
            build_date = datetime.now().strftime("%Y-%m-%d")
            content = re.sub(r"export const BUILD_DATE = '[^']*'", f"export const BUILD_DATE = '{build_date}'", content)
            
            version_config_path.write_text(content)
            print(f"✅ Arquivo de configuração do frontend atualizado para versão {new_version}")
        else:
            print("⚠️  Arquivo de configuração do frontend não encontrado")
    
    def update_changelog(self, new_version, bump_type):
        """Atualiza o arquivo CHANGELOG.json com a nova versão"""
        changelog_path = Path("CHANGELOG.json")
        
        if not changelog_path.exists():
            # Criar changelog inicial se não existir
            changelog_data = {"versions": []}
        else:
            try:
                with open(changelog_path, 'r', encoding='utf-8') as f:
                    changelog_data = json.load(f)
            except:
                changelog_data = {"versions": []}
        
        # Determinar o título e mudanças baseado no tipo de versão
        if bump_type == "major":
            title = "Atualização Principal"
            default_changes = [
                {
                    "type": "feature",
                    "title": "Novas Funcionalidades Principais",
                    "description": "Implementação de novas funcionalidades que podem alterar a compatibilidade"
                }
            ]
        elif bump_type == "minor":
            title = "Novas Funcionalidades"
            default_changes = [
                {
                    "type": "feature",
                    "title": "Novas Funcionalidades",
                    "description": "Adição de novas funcionalidades mantendo compatibilidade"
                }
            ]
        else:  # patch
            title = "Correções e Melhorias"
            default_changes = [
                {
                    "type": "fix",
                    "title": "Correções de Bugs",
                    "description": "Correções de problemas e melhorias de estabilidade"
                }
            ]
        
        # Criar nova entrada
        new_entry = {
            "version": new_version,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "type": bump_type,
            "title": title,
            "changes": default_changes
        }
        
        # Adicionar no início da lista (versão mais recente primeiro)
        changelog_data["versions"].insert(0, new_entry)
        
        # Salvar arquivo
        with open(changelog_path, 'w', encoding='utf-8') as f:
            json.dump(changelog_data, f, indent=2, ensure_ascii=False)
        
        # Copiar para o diretório público do frontend
        frontend_public_path = Path("frontend/frontend/public/CHANGELOG.json")
        if frontend_public_path.parent.exists():
            import shutil
            shutil.copy2(changelog_path, frontend_public_path)
            print(f"✅ CHANGELOG.json copiado para frontend/public/")
        
        print(f"✅ CHANGELOG.json atualizado com versão {new_version}")
        print(f"📝 Edite CHANGELOG.json para adicionar detalhes específicos das mudanças")

    def create_version_info(self, new_version):
        """Cria um arquivo de informações de versão"""
        version_info = f'''# NioChat - Informações de Versão

## Versão Atual: {new_version}

### Data de Lançamento: {self.get_current_date()}

### Funcionalidades desta Versão:
- Sistema de memória Redis para não pedir CPF repetidamente
- Envio automático de fatura via WhatsApp com botões interativos
- Verificação obrigatória se é cliente antes de prosseguir
- Uso automático das ferramentas GetCpfContato e SalvarCpfContato
- Fluxo inteligente para faturas: CPF → SGP → Geração → Envio automático

### Arquivos de Versão Atualizados:
- VERSION: {new_version}
- frontend/frontend/package.json: {new_version}
- frontend/frontend/package-lock.json: {new_version}
- frontend/frontend/pnpm-lock.yaml: {new_version}
- backend/niochat/settings.py: {new_version}
- backend/core/telegram_service.py: {new_version}
- CHANGELOG.json: {new_version}

### Como Usar:
Para atualizar a versão automaticamente, execute:
```bash
python version_manager.py [major|minor|patch]
```

### Histórico de Versões:
- 2.1.0: IA Inteligente com Memória Redis e Envio Automático de Fatura
- 2.0.0: Integração ChatGPT + SGP Automático
- 1.0.0: Sistema base completo
'''
        
        version_info_path = Path("VERSION_INFO.md")
        version_info_path.write_text(version_info)
        print(f"✅ VERSION_INFO.md criado com informações da versão {new_version}")
    
    def get_current_date(self):
        """Retorna a data atual formatada"""
        from datetime import datetime
        return datetime.now().strftime("%d/%m/%Y")
    
    def update_all_files(self, new_version, bump_type="patch"):
        """Atualiza a versão em todos os arquivos relevantes"""
        print(f"🔄 Atualizando versão de {self.current_version} para {new_version}")
        
        self.update_version_file(new_version)
        self.update_package_json(new_version)
        self.update_package_lock(new_version)
        self.update_pnpm_lock(new_version)
        self.update_django_settings(new_version)
        self.update_telegram_service(new_version)
        self.update_frontend_version_config(new_version)
        self.update_changelog(new_version, bump_type)
        self.create_version_info(new_version)
        
        print(f"\n🎉 Versão atualizada com sucesso para {new_version}!")
        print(f"📝 Execute 'git add .' e 'git commit -m \"v{new_version}\"' para salvar as mudanças")
        print(f"🔨 Execute 'npm run build' no diretório frontend/frontend para recompilar")
        print(f"📋 Edite CHANGELOG.json para personalizar as mudanças desta versão")
    
    def show_current_version(self):
        """Mostra a versão atual"""
        print(f"📋 Versão atual: {self.current_version}")
    
    def sync_files(self):
        """Sincroniza a versão em todos os arquivos sem incrementar"""
        print(f"🔄 Sincronizando versão {self.current_version} em todos os arquivos")
        
        self.update_package_json(self.current_version)
        self.update_package_lock(self.current_version)
        self.update_pnpm_lock(self.current_version)
        self.update_django_settings(self.current_version)
        self.update_telegram_service(self.current_version)
        self.update_frontend_version_config(self.current_version)
        
        # Atualizar changelog apenas se necessário
        changelog_path = Path("CHANGELOG.json")
        if changelog_path.exists():
            try:
                with open(changelog_path, 'r', encoding='utf-8') as f:
                    changelog_data = json.load(f)
                if (changelog_data.get("versions") and 
                    changelog_data["versions"][0].get("version") != self.current_version):
                    # Copiar para frontend
                    frontend_public_path = Path("frontend/frontend/public/CHANGELOG.json")
                    if frontend_public_path.parent.exists():
                        import shutil
                        shutil.copy2(changelog_path, frontend_public_path)
            except:
                pass
        
        print(f"✅ Arquivos sincronizados com versão {self.current_version}")

    def run(self):
        """Executa o gerenciador de versões"""
        if len(sys.argv) < 2:
            print("📋 Uso: python version_manager.py [major|minor|patch|show|sync]")
            print("   major: incrementa versão principal (1.0.0 → 2.0.0)")
            print("   minor: incrementa versão secundária (1.0.0 → 1.1.0)")
            print("   patch: incrementa versão de correção (1.0.0 → 1.0.1)")
            print("   sync: sincroniza versão atual em todos os arquivos")
            print("   show: mostra a versão atual")
            return
        
        command = sys.argv[1].lower()
        
        if command == "show":
            self.show_current_version()
        elif command == "sync":
            self.sync_files()
        elif command in ["major", "minor", "patch"]:
            new_version = self.bump_version(command)
            self.update_all_files(new_version, command)
        else:
            print(f"❌ Comando inválido: {command}")
            print("Comandos válidos: major, minor, patch, sync, show")

if __name__ == "__main__":
    manager = VersionManager()
    manager.run()
