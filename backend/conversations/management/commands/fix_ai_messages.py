from django.core.management.base import BaseCommand
from conversations.models import Message
from django.db.models import Q


class Command(BaseCommand):
    help = 'Corrigir mensagens da IA que estão com is_from_customer=True incorretamente'

    def handle(self, *args, **options):
        # Buscar mensagens que são da IA (message_type='outgoing' ou 'text' com conteúdo típico da IA)
        ai_messages = Message.objects.filter(
            Q(message_type='outgoing') | 
            Q(message_type='text', content__icontains='Como posso te ajudar') |
            Q(message_type='text', content__icontains='Olá!') |
            Q(message_type='text', content__icontains='😊') |
            Q(message_type='text', content__icontains='estou à disposição')
        ).filter(is_from_customer=True)
        
        count = ai_messages.count()
        self.stdout.write(f'Encontradas {count} mensagens da IA para corrigir...')
        
        if count > 0:
            ai_messages.update(is_from_customer=False)
            self.stdout.write(
                self.style.SUCCESS(f' {count} mensagens da IA corrigidas com sucesso!')
            )
        else:
            self.stdout.write(
                self.style.WARNING(' Nenhuma mensagem da IA encontrada para corrigir.')
            ) 