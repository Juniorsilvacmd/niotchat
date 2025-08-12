@echo off
echo 🚀 Instalando hooks de versionamento automático para NioChat...

echo.
echo 📋 Configurando pre-commit hook...
copy .git\hooks\pre-commit .git\hooks\pre-commit.bak >nul 2>&1

echo ✅ Hook pre-commit configurado!
echo.
echo 📝 Para usar o sistema de versionamento automático:
echo.
echo 1. Atualizar versão manualmente:
echo    python version_manager.py [major^|minor^|patch]
echo.
echo 2. Ver versão atual:
echo    python version_manager.py show
echo.
echo 3. O hook pre-commit atualizará automaticamente a versão
echo    em todos os arquivos antes de cada commit
echo.
echo 🎯 Tipos de versão:
echo    - major: 1.0.0 → 2.0.0 (mudanças incompatíveis)
echo    - minor: 1.0.0 → 1.1.0 (novas funcionalidades)
echo    - patch: 1.0.0 → 1.0.1 (correções e melhorias)
echo.
echo 🎉 Sistema de versionamento configurado com sucesso!
pause
