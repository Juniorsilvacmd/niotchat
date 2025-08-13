"""
Comando Django para gerenciar worker das integrações Telegram
"""

import asyncio
import signal
import sys
from django.core.management.base import BaseCommand
from integrations.telegram_service import telegram_manager


class Command(BaseCommand):
    help = 'Gerenciar worker das integrações Telegram'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['start', 'stop', 'restart', 'status'],
            help='Ação a ser executada'
        )
        parser.add_argument(
            '--integration-id',
            type=int,
            help='ID da integração específica (opcional)'
        )
    
    def handle(self, *args, **options):
        action = options['action']
        integration_id = options.get('integration_id')
        
        if action == 'start':
            self.start_worker(integration_id)
        elif action == 'stop':
            self.stop_worker(integration_id)
        elif action == 'restart':
            self.restart_worker(integration_id)
        elif action == 'status':
            self.show_status()
    
    def start_worker(self, integration_id=None):
        """Iniciar worker"""
        self.stdout.write("Iniciando worker Telegram...")
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Configurar handlers para sinais
            def signal_handler(signum, frame):
                self.stdout.write("Recebido sinal de parada...")
                loop.create_task(self.shutdown(loop))
            
            signal.signal(signal.SIGINT, signal_handler)
            signal.signal(signal.SIGTERM, signal_handler)
            
            if integration_id:
                # Iniciar integração específica
                loop.run_until_complete(
                    telegram_manager.start_integration(integration_id)
                )
            else:
                # Iniciar todas as integrações
                loop.run_until_complete(
                    telegram_manager.start_all_integrations()
                )
            
            self.stdout.write(
                self.style.SUCCESS("Worker Telegram iniciado com sucesso!")
            )
            
            # Manter loop rodando
            loop.run_forever()
            
        except KeyboardInterrupt:
            self.stdout.write("Worker interrompido pelo usuário")
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Erro ao iniciar worker: {e}")
            )
        finally:
            loop.close()
    
    def stop_worker(self, integration_id=None):
        """Parar worker"""
        self.stdout.write("Parando worker Telegram...")
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            if integration_id:
                loop.run_until_complete(
                    telegram_manager.stop_integration(integration_id)
                )
            else:
                loop.run_until_complete(
                    telegram_manager.stop_all_integrations()
                )
            
            self.stdout.write(
                self.style.SUCCESS("Worker Telegram parado com sucesso!")
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Erro ao parar worker: {e}")
            )
    
    def restart_worker(self, integration_id=None):
        """Reiniciar worker"""
        self.stop_worker(integration_id)
        self.start_worker(integration_id)
    
    def show_status(self):
        """Mostrar status das integrações"""
        from integrations.models import TelegramIntegration
        
        integrations = TelegramIntegration.objects.filter(is_active=True)
        
        if not integrations:
            self.stdout.write("Nenhuma integração Telegram ativa encontrada.")
            return
        
        self.stdout.write("Status das integrações Telegram:")
        self.stdout.write("-" * 50)
        
        for integration in integrations:
            status = "🟢 Rodando" if integration.id in telegram_manager.services else "🔴 Parado"
            connected = " Conectado" if integration.is_connected else " Desconectado"
            
            self.stdout.write(
                f"ID: {integration.id} | "
                f"Empresa: {integration.company.name} | "
                f"Telefone: {integration.phone_number} | "
                f"Status: {status} | "
                f"Conexão: {connected}"
            )
    
    async def shutdown(self, loop):
        """Shutdown graceful"""
        self.stdout.write("Parando todas as integrações...")
        await telegram_manager.stop_all_integrations()
        loop.stop()

