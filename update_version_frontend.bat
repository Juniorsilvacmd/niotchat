@echo off
echo 🚀 Atualizando versão do frontend NioChat...

echo.
echo 📋 Verificando versão atual...
python version_manager.py show

echo.
echo 🔄 Recompilando frontend...
cd frontend\frontend
call npm run build

echo.
echo ✅ Frontend recompilado com sucesso!
echo 📱 Nova versão agora está disponível na interface

echo.
echo 🎯 Para aplicar as mudanças:
echo 1. Reinicie o servidor frontend (se estiver rodando)
echo 2. Recarregue a página no navegador
echo 3. A nova versão deve aparecer na interface

pause
