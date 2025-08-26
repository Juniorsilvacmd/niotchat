from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
import os
import shutil

from conversations.models import (
    Message, Conversation, Contact, Inbox, Team, TeamMember,
    InternalChatRoom, InternalChatParticipant, InternalChatMessage,
    InternalChatMessageRead, InternalChatReaction,
    PrivateMessage, PrivateMessageReaction,
    RecoveryAttempt
)
from core.models import AuditLog


class Command(BaseCommand):
    help = 'Limpa todas as conversas, mensagens e arquivos do banco de dados'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirma a limpeza sem perguntar',
        )
        parser.add_argument(
            '--keep-audit',
            action='store_true',
            help='Mantém os logs de auditoria',
        )
        parser.add_argument(
            '--keep-users',
            action='store_true',
            help='Mantém usuários e provedores',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    '⚠️  ATENÇÃO: Esta operação irá APAGAR TODAS as conversas e mensagens!'
                )
            )
            self.stdout.write('')
            self.stdout.write('Serão removidos:')
            self.stdout.write('  • Todas as conversas e mensagens')
            self.stdout.write('  • Todos os contatos')
            self.stdout.write('  • Todas as equipes')
            self.stdout.write('  • Todas as mensagens de chat interno')
            self.stdout.write('  • Todas as mensagens privadas')
            self.stdout.write('  • Todos os arquivos de mídia')
            self.stdout.write('  • Todas as tentativas de recuperação')
            
            if not options['keep_audit']:
                self.stdout.write('  • Todos os logs de auditoria')
            
            self.stdout.write('')
            confirm = input('Digite "LIMPAR" para confirmar: ')
            
            if confirm != 'LIMPAR':
                self.stdout.write(self.style.ERROR('Operação cancelada!'))
                return

        try:
            with transaction.atomic():
                self.stdout.write('🗑️  Iniciando limpeza do banco de dados...')
                
                # 1. Limpar mensagens privadas e reações
                private_reactions_count = PrivateMessageReaction.objects.count()
                PrivateMessageReaction.objects.all().delete()
                self.stdout.write(f'  ✓ Removidas {private_reactions_count} reações de mensagens privadas')
                
                private_messages_count = PrivateMessage.objects.count()
                PrivateMessage.objects.all().delete()
                self.stdout.write(f'  ✓ Removidas {private_messages_count} mensagens privadas')
                
                # 2. Limpar chat interno
                internal_reactions_count = InternalChatReaction.objects.count()
                InternalChatReaction.objects.all().delete()
                self.stdout.write(f'  ✓ Removidas {internal_reactions_count} reações do chat interno')
                
                internal_reads_count = InternalChatMessageRead.objects.count()
                InternalChatMessageRead.objects.all().delete()
                self.stdout.write(f'  ✓ Removidos {internal_reads_count} registros de leitura do chat interno')
                
                internal_messages_count = InternalChatMessage.objects.count()
                InternalChatMessage.objects.all().delete()
                self.stdout.write(f'  ✓ Removidas {internal_messages_count} mensagens do chat interno')
                
                internal_participants_count = InternalChatParticipant.objects.count()
                InternalChatParticipant.objects.all().delete()
                self.stdout.write(f'  ✓ Removidos {internal_participants_count} participantes do chat interno')
                
                internal_rooms_count = InternalChatRoom.objects.count()
                InternalChatRoom.objects.all().delete()
                self.stdout.write(f'  ✓ Removidas {internal_rooms_count} salas de chat interno')
                
                # 3. Limpar tentativas de recuperação
                recovery_attempts_count = RecoveryAttempt.objects.count()
                RecoveryAttempt.objects.all().delete()
                self.stdout.write(f'  ✓ Removidas {recovery_attempts_count} tentativas de recuperação')
                
                # 4. Limpar mensagens principais
                messages_count = Message.objects.count()
                Message.objects.all().delete()
                self.stdout.write(f'  ✓ Removidas {messages_count} mensagens principais')
                
                # 5. Limpar conversas
                conversations_count = Conversation.objects.count()
                Conversation.objects.all().delete()
                self.stdout.write(f'  ✓ Removidas {conversations_count} conversas')
                
                # 6. Limpar contatos
                contacts_count = Contact.objects.count()
                Contact.objects.all().delete()
                self.stdout.write(f'  ✓ Removidos {contacts_count} contatos')
                
                # 7. Limpar caixas de entrada
                inboxes_count = Inbox.objects.count()
                Inbox.objects.all().delete()
                self.stdout.write(f'  ✓ Removidas {inboxes_count} caixas de entrada')
                
                # 8. Limpar equipes
                team_members_count = TeamMember.objects.count()
                TeamMember.objects.all().delete()
                self.stdout.write(f'  ✓ Removidos {team_members_count} membros de equipe')
                
                teams_count = Team.objects.count()
                Team.objects.all().delete()
                self.stdout.write(f'  ✓ Removidas {teams_count} equipes')
                
                # 9. Limpar logs de auditoria (se solicitado)
                if not options['keep_audit']:
                    audit_logs_count = AuditLog.objects.count()
                    AuditLog.objects.all().delete()
                    self.stdout.write(f'  ✓ Removidos {audit_logs_count} logs de auditoria')
                else:
                    self.stdout.write('  ✓ Logs de auditoria mantidos')
                
                # 10. Limpar arquivos de mídia
                media_path = getattr(settings, 'MEDIA_ROOT', 'media/')
                if os.path.exists(media_path):
                    try:
                        # Remover apenas arquivos de conversas, manter avatares e outros
                        conversations_media = os.path.join(media_path, 'conversations')
                        if os.path.exists(conversations_media):
                            shutil.rmtree(conversations_media)
                            self.stdout.write('  ✓ Removida pasta de mídia das conversas')
                        
                        # Remover arquivos de mensagens
                        messages_media = os.path.join(media_path, 'messages')
                        if os.path.exists(messages_media):
                            shutil.rmtree(messages_media)
                            self.stdout.write('  ✓ Removida pasta de mídia das mensagens')
                        
                        # Remover arquivos de chat interno
                        internal_media = os.path.join(media_path, 'internal_chat')
                        if os.path.exists(internal_media):
                            shutil.rmtree(internal_media)
                            self.stdout.write('  ✓ Removida pasta de mídia do chat interno')
                        
                        # Remover arquivos privados
                        private_media = os.path.join(media_path, 'private_messages')
                        if os.path.exists(private_media):
                            shutil.rmtree(private_media)
                            self.stdout.write('  ✓ Removida pasta de mídia das mensagens privadas')
                            
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'  ⚠️  Erro ao limpar arquivos de mídia: {e}')
                        )
                else:
                    self.stdout.write('  ✓ Pasta de mídia não encontrada')
                
                # 11. Limpar Redis (se configurado)
                try:
                    from django_redis import get_redis_connection
                    redis_conn = get_redis_connection("default")
                    
                    # Limpar chaves relacionadas a conversas
                    pattern = "conversation_*"
                    keys = redis_conn.keys(pattern)
                    if keys:
                        redis_conn.delete(*keys)
                        self.stdout.write(f'  ✓ Removidas {len(keys)} chaves do Redis relacionadas a conversas')
                    
                    # Limpar chaves de chat interno
                    pattern = "internal_chat_*"
                    keys = redis_conn.keys(pattern)
                    if keys:
                        redis_conn.delete(*keys)
                        self.stdout.write(f'  ✓ Removidas {len(keys)} chaves do Redis relacionadas ao chat interno')
                    
                    # Limpar chaves de mensagens privadas
                    pattern = "private_message_*"
                    keys = redis_conn.keys(pattern)
                    if keys:
                        redis_conn.delete(*keys)
                        self.stdout.write(f'  ✓ Removidas {len(keys)} chaves do Redis relacionadas a mensagens privadas')
                        
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'  ⚠️  Erro ao limpar Redis: {e}')
                    )
                
                self.stdout.write('')
                self.stdout.write(
                    self.style.SUCCESS('✅ Limpeza concluída com sucesso!')
                )
                self.stdout.write('')
                self.stdout.write('Resumo da limpeza:')
                self.stdout.write(f'  • Mensagens privadas: {private_messages_count}')
                self.stdout.write(f'  • Mensagens do chat interno: {internal_messages_count}')
                self.stdout.write(f'  • Mensagens principais: {messages_count}')
                self.stdout.write(f'  • Conversas: {conversations_count}')
                self.stdout.write(f'  • Contatos: {contacts_count}')
                self.stdout.write(f'  • Equipes: {teams_count}')
                
                if not options['keep_audit']:
                    self.stdout.write(f'  • Logs de auditoria: {audit_logs_count}')
                
                self.stdout.write('')
                self.stdout.write('💡 Dica: Execute "python manage.py migrate" se houver problemas de integridade do banco.')
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erro durante a limpeza: {e}')
            )
            raise 