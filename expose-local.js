const { exec } = require('child_process');

console.log('🚀 Expondo serviços localmente...\n');

// Expor backend na porta 8010
exec('npx localtunnel --port 8010 --subdomain niochat-backend', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Erro ao expor backend:', error);
    return;
  }
  console.log('✅ Backend exposto:', stdout);
});

// Expor frontend na porta 8012
exec('npx localtunnel --port 8012 --subdomain niochat-frontend', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Erro ao expor frontend:', error);
    return;
  }
  console.log('✅ Frontend exposto:', stdout);
});

console.log('📋 URLs dos serviços:');
console.log('🔧 Backend: https://niochat-backend.loca.lt');
console.log('🌐 Frontend: https://niochat-frontend.loca.lt');
console.log('\n💡 Para parar: Ctrl+C'); 