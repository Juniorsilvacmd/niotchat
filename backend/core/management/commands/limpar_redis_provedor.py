"""
Comando para limpar dados Redis de provedores específicos
"""

from django.core.management.base import BaseCommand
from core.models import Provedor
from core.redis_memory_service import redis_memory_service

class Command(BaseCommand):
    help = 'Limpa dados Redis de provedores específicos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--provedor-id',
            type=int,
            help='ID do provedor para limpar dados',
        )
        parser.add_argument(
            '--todos',
            action='store_true',
            help='Limpar dados de todos os provedores',
        )
        parser.add_argument(
            '--listar',
            action='store_true',
            help='Listar todos os provedores com dados no Redis',
        )
        parser.add_argument(
            '--stats',
            type=int,
            help='Mostrar estatísticas de um provedor específico',
        )

    def handle(self, *args, **options):
        if options['listar']:
            self.listar_provedores()
        elif options['stats']:
            self.mostrar_stats(options['stats'])
        elif options['todos']:
            self.limpar_todos()
        elif options['provedor_id']:
            self.limpar_provedor(options['provedor_id'])
        else:
            self.stdout.write(
                self.style.ERROR('Especifique uma opção: --provedor-id, --todos, --listar ou --stats')
            )

    def listar_provedores(self):
        """Lista todos os provedores com dados no Redis"""
        self.stdout.write('# Debug logging removed for security Listando provedores com dados no Redis...')
        
        provider_ids = redis_memory_service.list_all_providers()
        
        if not provider_ids:
            self.stdout.write(self.style.SUCCESS('# Debug logging removed for security Nenhum provedor com dados no Redis'))
            return
        
        self.stdout.write(f'# Debug logging removed for security Provedores encontrados: {len(provider_ids)}')
        
        for provider_id in provider_ids:
            try:
                provedor = Provedor.objects.get(id=provider_id)
                self.stdout.write(f'  • ID {provider_id}: {provedor.nome}')
            except Provedor.DoesNotExist:
                self.stdout.write(f'  • ID {provider_id}: PROVEDOR NÃO ENCONTRADO')
        
        self.stdout.write('')
        self.stdout.write('# Debug logging removed for security Use --provedor-id <ID> para limpar dados de um provedor específico')
        self.stdout.write('# Debug logging removed for security Use --todos para limpar dados de todos os provedores')

    def mostrar_stats(self, provider_id):
        """Mostra estatísticas de um provedor específico"""
        self.stdout.write(f'# Debug logging removed for security Estatísticas do provedor {provider_id}...')
        
        try:
            provedor = Provedor.objects.get(id=provider_id)
            self.stdout.write(f'# Debug logging removed for security Nome: {provedor.nome}')
        except Provedor.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'# Debug logging removed for security Provedor {provider_id} não encontrado'))
            return
        
        stats = redis_memory_service.get_provider_stats(provider_id)
        
        if not stats:
            self.stdout.write(self.style.SUCCESS('# Debug logging removed for security Nenhum dado encontrado para este provedor'))
            return
        
        self.stdout.write(f'# Debug logging removed for security Total de chaves: {stats["total_keys"]}')
        self.stdout.write(f'⏰ Uso de memória: {stats["memory_usage"]}s')
        
        if stats["key_types"]:
            self.stdout.write('📝 Tipos de chaves:')
            for key_type, count in stats["key_types"].items():
                self.stdout.write(f'  • {key_type}: {count}')

    def limpar_provedor(self, provider_id):
        """Limpa dados de um provedor específico"""
        self.stdout.write(f'# Debug logging removed for security Limpando dados do provedor {provider_id}...')
        
        try:
            provedor = Provedor.objects.get(id=provider_id)
            self.stdout.write(f'# Debug logging removed for security Nome: {provedor.nome}')
        except Provedor.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'# Debug logging removed for security Provedor {provider_id} não encontrado'))
            return
        
        # Verificar se há dados antes de limpar
        stats = redis_memory_service.get_provider_stats(provider_id)
        if not stats or stats["total_keys"] == 0:
            self.stdout.write(self.style.SUCCESS('# Debug logging removed for security Nenhum dado para limpar'))
            return
        
        self.stdout.write(f'# Debug logging removed for security Chaves encontradas: {stats["total_keys"]}')
        
        # Limpar dados
        success = redis_memory_service.clear_provider_data(provider_id)
        
        if success:
            self.stdout.write(self.style.SUCCESS(f'# Debug logging removed for security Dados do provedor {provider_id} limpos com sucesso!'))
            
            # Verificar se foi limpo
            stats_after = redis_memory_service.get_provider_stats(provider_id)
            if stats_after and stats_after["total_keys"] == 0:
                self.stdout.write('# Debug logging removed for security Confirmação: dados removidos completamente')
            else:
                self.stdout.write(self.style.WARNING('⚠️ Aviso: alguns dados podem não ter sido removidos'))
        else:
            self.stdout.write(self.style.ERROR(f'# Debug logging removed for security Erro ao limpar dados do provedor {provider_id}'))

    def limpar_todos(self):
        """Limpa dados de todos os provedores"""
        self.stdout.write('# Debug logging removed for security Limpando dados de TODOS os provedores...')
        
        provider_ids = redis_memory_service.list_all_providers()
        
        if not provider_ids:
            self.stdout.write(self.style.SUCCESS('# Debug logging removed for security Nenhum provedor com dados para limpar'))
            return
        
        self.stdout.write(f'# Debug logging removed for security Provedores encontrados: {len(provider_ids)}')
        
        total_cleared = 0
        errors = 0
        
        for provider_id in provider_ids:
            try:
                provedor = Provedor.objects.get(id=provider_id)
                self.stdout.write(f'# Debug logging removed for security Limpando {provedor.nome} (ID: {provider_id})...')
            except Provedor.DoesNotExist:
                self.stdout.write(f'# Debug logging removed for security Limpando provedor ID: {provider_id}...')
            
            success = redis_memory_service.clear_provider_data(provider_id)
            
            if success:
                total_cleared += 1
                self.stdout.write(self.style.SUCCESS(f'  # Debug logging removed for security Limpo com sucesso'))
            else:
                errors += 1
                self.stdout.write(self.style.ERROR(f'  # Debug logging removed for security Erro ao limpar'))
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'# Debug logging removed for security Limpeza concluída!'))
        self.stdout.write(f'# Debug logging removed for security Provedores limpos: {total_cleared}')
        if errors > 0:
            self.stdout.write(f'# Debug logging removed for security Erros: {errors}')
        
        # Verificar se todos foram limpos
        remaining = redis_memory_service.list_all_providers()
        if not remaining:
            self.stdout.write(self.style.SUCCESS('# Debug logging removed for security Todos os dados foram removidos do Redis'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠️ Ainda restam dados de {len(remaining)} provedores')) 
Comando para limpar dados Redis de provedores específicos
"""

from django.core.management.base import BaseCommand
from core.models import Provedor
from core.redis_memory_service import redis_memory_service

class Command(BaseCommand):
    help = 'Limpa dados Redis de provedores específicos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--provedor-id',
            type=int,
            help='ID do provedor para limpar dados',
        )
        parser.add_argument(
            '--todos',
            action='store_true',
            help='Limpar dados de todos os provedores',
        )
        parser.add_argument(
            '--listar',
            action='store_true',
            help='Listar todos os provedores com dados no Redis',
        )
        parser.add_argument(
            '--stats',
            type=int,
            help='Mostrar estatísticas de um provedor específico',
        )

    def handle(self, *args, **options):
        if options['listar']:
            self.listar_provedores()
        elif options['stats']:
            self.mostrar_stats(options['stats'])
        elif options['todos']:
            self.limpar_todos()
        elif options['provedor_id']:
            self.limpar_provedor(options['provedor_id'])
        else:
            self.stdout.write(
                self.style.ERROR('Especifique uma opção: --provedor-id, --todos, --listar ou --stats')
            )

    def listar_provedores(self):
        """Lista todos os provedores com dados no Redis"""
        self.stdout.write('# Debug logging removed for security Listando provedores com dados no Redis...')
        
        provider_ids = redis_memory_service.list_all_providers()
        
        if not provider_ids:
            self.stdout.write(self.style.SUCCESS('# Debug logging removed for security Nenhum provedor com dados no Redis'))
            return
        
        self.stdout.write(f'# Debug logging removed for security Provedores encontrados: {len(provider_ids)}')
        
        for provider_id in provider_ids:
            try:
                provedor = Provedor.objects.get(id=provider_id)
                self.stdout.write(f'  • ID {provider_id}: {provedor.nome}')
            except Provedor.DoesNotExist:
                self.stdout.write(f'  • ID {provider_id}: PROVEDOR NÃO ENCONTRADO')
        
        self.stdout.write('')
        self.stdout.write('# Debug logging removed for security Use --provedor-id <ID> para limpar dados de um provedor específico')
        self.stdout.write('# Debug logging removed for security Use --todos para limpar dados de todos os provedores')

    def mostrar_stats(self, provider_id):
        """Mostra estatísticas de um provedor específico"""
        self.stdout.write(f'# Debug logging removed for security Estatísticas do provedor {provider_id}...')
        
        try:
            provedor = Provedor.objects.get(id=provider_id)
            self.stdout.write(f'# Debug logging removed for security Nome: {provedor.nome}')
        except Provedor.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'# Debug logging removed for security Provedor {provider_id} não encontrado'))
            return
        
        stats = redis_memory_service.get_provider_stats(provider_id)
        
        if not stats:
            self.stdout.write(self.style.SUCCESS('# Debug logging removed for security Nenhum dado encontrado para este provedor'))
            return
        
        self.stdout.write(f'# Debug logging removed for security Total de chaves: {stats["total_keys"]}')
        self.stdout.write(f'⏰ Uso de memória: {stats["memory_usage"]}s')
        
        if stats["key_types"]:
            self.stdout.write('📝 Tipos de chaves:')
            for key_type, count in stats["key_types"].items():
                self.stdout.write(f'  • {key_type}: {count}')

    def limpar_provedor(self, provider_id):
        """Limpa dados de um provedor específico"""
        self.stdout.write(f'# Debug logging removed for security Limpando dados do provedor {provider_id}...')
        
        try:
            provedor = Provedor.objects.get(id=provider_id)
            self.stdout.write(f'# Debug logging removed for security Nome: {provedor.nome}')
        except Provedor.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'# Debug logging removed for security Provedor {provider_id} não encontrado'))
            return
        
        # Verificar se há dados antes de limpar
        stats = redis_memory_service.get_provider_stats(provider_id)
        if not stats or stats["total_keys"] == 0:
            self.stdout.write(self.style.SUCCESS('# Debug logging removed for security Nenhum dado para limpar'))
            return
        
        self.stdout.write(f'# Debug logging removed for security Chaves encontradas: {stats["total_keys"]}')
        
        # Limpar dados
        success = redis_memory_service.clear_provider_data(provider_id)
        
        if success:
            self.stdout.write(self.style.SUCCESS(f'# Debug logging removed for security Dados do provedor {provider_id} limpos com sucesso!'))
            
            # Verificar se foi limpo
            stats_after = redis_memory_service.get_provider_stats(provider_id)
            if stats_after and stats_after["total_keys"] == 0:
                self.stdout.write('# Debug logging removed for security Confirmação: dados removidos completamente')
            else:
                self.stdout.write(self.style.WARNING('⚠️ Aviso: alguns dados podem não ter sido removidos'))
        else:
            self.stdout.write(self.style.ERROR(f'# Debug logging removed for security Erro ao limpar dados do provedor {provider_id}'))

    def limpar_todos(self):
        """Limpa dados de todos os provedores"""
        self.stdout.write('# Debug logging removed for security Limpando dados de TODOS os provedores...')
        
        provider_ids = redis_memory_service.list_all_providers()
        
        if not provider_ids:
            self.stdout.write(self.style.SUCCESS('# Debug logging removed for security Nenhum provedor com dados para limpar'))
            return
        
        self.stdout.write(f'# Debug logging removed for security Provedores encontrados: {len(provider_ids)}')
        
        total_cleared = 0
        errors = 0
        
        for provider_id in provider_ids:
            try:
                provedor = Provedor.objects.get(id=provider_id)
                self.stdout.write(f'# Debug logging removed for security Limpando {provedor.nome} (ID: {provider_id})...')
            except Provedor.DoesNotExist:
                self.stdout.write(f'# Debug logging removed for security Limpando provedor ID: {provider_id}...')
            
            success = redis_memory_service.clear_provider_data(provider_id)
            
            if success:
                total_cleared += 1
                self.stdout.write(self.style.SUCCESS(f'  # Debug logging removed for security Limpo com sucesso'))
            else:
                errors += 1
                self.stdout.write(self.style.ERROR(f'  # Debug logging removed for security Erro ao limpar'))
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'# Debug logging removed for security Limpeza concluída!'))
        self.stdout.write(f'# Debug logging removed for security Provedores limpos: {total_cleared}')
        if errors > 0:
            self.stdout.write(f'# Debug logging removed for security Erros: {errors}')
        
        # Verificar se todos foram limpos
        remaining = redis_memory_service.list_all_providers()
        if not remaining:
            self.stdout.write(self.style.SUCCESS('# Debug logging removed for security Todos os dados foram removidos do Redis'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠️ Ainda restam dados de {len(remaining)} provedores')) 