# 🚀 Sistema de Versionamento Automático - NioChat

## 📋 Visão Geral

O NioChat agora possui um sistema de versionamento automático que atualiza a versão em todos os arquivos relevantes automaticamente quando você faz commits no Git.

## ✨ Funcionalidades

- **Versionamento Automático**: Atualiza versão em todos os arquivos antes de cada commit
- **Gerenciamento Centralizado**: Um único arquivo `VERSION` controla toda a versão
- **Atualização Inteligente**: Detecta mudanças e atualiza apenas quando necessário
- **Múltiplos Tipos**: Suporte para major, minor e patch versions
- **Hooks Git**: Integração automática com Git pre-commit hooks

## 🎯 Como Funciona

### 1. Arquivo VERSION Centralizado
```
VERSION
2.1.0
```

### 2. Atualização Automática
O sistema atualiza automaticamente a versão em:
- `VERSION` (arquivo principal)
- `frontend/frontend/package.json`
- `frontend/frontend/package-lock.json`
- `frontend/frontend/pnpm-lock.yaml`
- `backend/niochat/settings.py`
- `backend/core/telegram_service.py`
- `VERSION_INFO.md` (documentação da versão)

### 3. Hook Pre-commit
Antes de cada commit, o Git verifica se o arquivo `VERSION` foi modificado e atualiza automaticamente todos os outros arquivos.

## 🛠️ Instalação

### Opção 1: Script Python (Recomendado)
```bash
python install_hooks.py
```

### Opção 2: Script Batch (Windows)
```bash
install_version_hooks.bat
```

### Opção 3: Manual
```bash
# Copiar o hook pre-commit
cp pre-commit .git/hooks/
chmod +x .git/hooks/pre-commit  # Linux/Mac
```

## 📖 Como Usar

### Ver Versão Atual
```bash
python version_manager.py show
```

### Atualizar Versão Manualmente
```bash
# Incrementar patch (1.0.0 → 1.0.1)
python version_manager.py patch

# Incrementar minor (1.0.0 → 1.1.0)
python version_manager.py minor

# Incrementar major (1.0.0 → 2.0.0)
python version_manager.py major
```

### Fluxo de Trabalho Automático
1. **Faça suas alterações** no código
2. **Modifique o arquivo VERSION** se necessário
3. **Execute `git add .`** para adicionar as mudanças
4. **Execute `git commit`** - a versão será atualizada automaticamente!
5. **Execute `git push`** para enviar para o GitHub

## 🎯 Tipos de Versão

### Patch (1.0.0 → 1.0.1)
- Correções de bugs
- Melhorias pequenas
- Atualizações de segurança
- **Use quando**: Corrigir problemas ou fazer melhorias menores

### Minor (1.0.0 → 1.1.0)
- Novas funcionalidades
- Melhorias significativas
- **Use quando**: Adicionar novas funcionalidades sem quebrar compatibilidade

### Major (1.0.0 → 2.0.0)
- Mudanças incompatíveis
- Refatorações grandes
- **Use quando**: Fazer mudanças que quebram compatibilidade

## 📁 Estrutura de Arquivos

```
niochat/
├── VERSION                    # Versão principal
├── version_manager.py         # Gerenciador de versões
├── install_hooks.py          # Instalador de hooks
├── install_version_hooks.bat # Instalador Windows
├── pre-commit               # Hook Git
├── VERSION_INFO.md          # Documentação da versão
└── .git/hooks/
    └── pre-commit          # Hook instalado
```

## 🔧 Configuração Avançada

### Personalizar Arquivos de Versão
Edite o `version_manager.py` para adicionar ou remover arquivos que devem ter a versão atualizada.

### Modificar Comportamento do Hook
Edite o arquivo `pre-commit` para personalizar o comportamento antes do commit.

### Adicionar Novos Tipos de Versão
Modifique o método `bump_version` no `version_manager.py` para suportar novos esquemas de versionamento.

## 🚨 Solução de Problemas

### Hook não executa
```bash
# Verificar se o hook está instalado
ls -la .git/hooks/pre-commit

# Reinstalar o hook
python install_hooks.py
```

### Erro de permissão (Linux/Mac)
```bash
chmod +x .git/hooks/pre-commit
```

### Versão não atualiza
```bash
# Verificar se o arquivo VERSION foi modificado
git status VERSION

# Executar manualmente
python version_manager.py patch
```

## 📚 Exemplos de Uso

### Cenário 1: Correção de Bug
```bash
# 1. Fazer correção no código
# 2. Atualizar versão para patch
python version_manager.py patch
# 3. Commit automático com versão atualizada
git add . && git commit -m "Correção de bug na IA"
```

### Cenário 2: Nova Funcionalidade
```bash
# 1. Implementar nova funcionalidade
# 2. Atualizar versão para minor
python version_manager.py minor
# 3. Commit automático com versão atualizada
git add . && git commit -m "Nova funcionalidade de relatórios"
```

### Cenário 3: Refatoração Grande
```bash
# 1. Fazer refatoração grande
# 2. Atualizar versão para major
python version_manager.py major
# 3. Commit automático com versão atualizada
git add . && git commit -m "Refatoração completa do sistema"
```

## 🎉 Benefícios

- **Consistência**: Versão sempre sincronizada em todos os arquivos
- **Automação**: Sem necessidade de atualizar manualmente cada arquivo
- **Histórico**: Rastreamento claro de mudanças de versão
- **Profissionalismo**: Sistema de versionamento padrão da indústria
- **Colaboração**: Equipe sempre sabe qual versão está trabalhando

## 🤝 Contribuição

Para contribuir com melhorias no sistema de versionamento:

1. Fork o repositório
2. Crie uma branch para sua feature
3. Implemente as melhorias
4. Teste o sistema
5. Faça commit e push
6. Abra um Pull Request

## 📞 Suporte

Se encontrar problemas ou tiver dúvidas:

1. Verifique este README
2. Execute `python version_manager.py show` para verificar a versão
3. Verifique se os hooks estão instalados corretamente
4. Abra uma issue no GitHub

---

**🎯 Lembre-se**: O sistema de versionamento automático torna o desenvolvimento mais profissional e eficiente!
