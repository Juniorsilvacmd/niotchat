from django.core.management.base import BaseCommand
from core.models import User, Provedor


class Command(BaseCommand):
    help = 'Associa um usuário a um provedor'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Nome do usuário')
        parser.add_argument('provedor_nome', type=str, help='Nome do provedor')

    def handle(self, *args, **options):
        username = options['username']
        provedor_nome = options['provedor_nome']
        
        try:
            # Buscar usuário
            user = User.objects.get(username=username)
            self.stdout.write(f"Usuário encontrado: {user.username}")
            
            # Buscar provedor
            provedor = Provedor.objects.get(nome__icontains=provedor_nome)
            self.stdout.write(f"Provedor encontrado: {provedor.nome}")
            
            # Verificar se já está associado
            if user in provedor.admins.all():
                self.stdout.write(
                    self.style.WARNING(
                        f"Usuário {username} já está associado ao provedor {provedor.nome}"
                    )
                )
                return
            
            # Associar usuário ao provedor
            provedor.admins.add(user)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Usuário {username} associado com sucesso ao provedor {provedor.nome}"
                )
            )
            
            # Verificar associação
            provedores_user = user.provedores_admin.all()
            self.stdout.write(f"Provedores do usuário {username}:")
            for p in provedores_user:
                self.stdout.write(f"  - {p.nome}")
                
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Usuário '{username}' não encontrado")
            )
        except Provedor.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Provedor '{provedor_nome}' não encontrado")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Erro: {str(e)}")
            )
