"""
Comando Django para gerenciar worker das integrações de E-mail
"""

import signal
import sys
import time
from django.core.management.base import BaseCommand
from integrations.email_service import email_manager


class Command(BaseCommand):
    help = 'Gerenciar worker das integrações de E-mail'
    
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
        self.stdout.write("Iniciando worker de E-mail...")
        
        try:
            # Configurar handler para sinais
            def signal_handler(signum, frame):
                self.stdout.write("Recebido sinal de parada...")
                self.stop_worker(integration_id)
                sys.exit(0)
            
            signal.signal(signal.SIGINT, signal_handler)
            signal.signal(signal.SIGTERM, signal_handler)
            
            if integration_id:
                # Iniciar integração específica
                email_manager.start_integration(integration_id)
            else:
                # Iniciar todas as integrações
                email_manager.start_all_integrations()
            
            self.stdout.write(
                self.style.SUCCESS("Worker de E-mail iniciado com sucesso!")
            )
            
            # Manter processo rodando
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                self.stdout.write("Worker interrompido pelo usuário")
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Erro ao iniciar worker: {e}")
            )
    
    def stop_worker(self, integration_id=None):
        """Parar worker"""
        self.stdout.write("Parando worker de E-mail...")
        
        try:
            if integration_id:
                email_manager.stop_integration(integration_id)
            else:
                email_manager.stop_all_integrations()
            
            self.stdout.write(
                self.style.SUCCESS("Worker de E-mail parado com sucesso!")
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Erro ao parar worker: {e}")
            )
    
    def restart_worker(self, integration_id=None):
        """Reiniciar worker"""
        self.stop_worker(integration_id)
        time.sleep(2)
        self.start_worker(integration_id)
    
    def show_status(self):
        """Mostrar status das integrações"""
        from integrations.models import EmailIntegration
        
        integrations = EmailIntegration.objects.filter(is_active=True)
        
        if not integrations:
            self.stdout.write("Nenhuma integração de E-mail ativa encontrada.")
            return
        
        self.stdout.write("Status das integrações de E-mail:")
        self.stdout.write("-" * 60)
        
        for integration in integrations:
            status = "🟢 Rodando" if integration.id in email_manager.services else "🔴 Parado"
            connected = " Conectado" if integration.is_connected else " Desconectado"
            
            self.stdout.write(
                f"ID: {integration.id} | "
                f"Nome: {integration.name} | "
                f"E-mail: {integration.email} | "
                f"Provedor: {integration.get_provider_display()} | "
                f"Status: {status} | "
                f"Conexão: {connected}"
            )

