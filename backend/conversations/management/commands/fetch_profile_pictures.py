from django.core.management.base import BaseCommand
from conversations.models import Contact
from core.models import Provedor
from integrations.utils import update_contact_profile_picture


class Command(BaseCommand):
    help = 'Busca fotos de perfil do WhatsApp para todos os contatos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--integration-type',
            type=str,
            choices=['evolution', 'uazapi', 'both'],
            default='both',
            help='Tipo de integração para buscar fotos (evolution, uazapi, both)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Força a atualização mesmo se já existe avatar'
        )

    def handle(self, *args, **options):
        integration_type = options['integration_type']
        force = options['force']
        
        self.stdout.write(f"Buscando fotos de perfil para integração: {integration_type}")
        
        # Buscar todos os contatos que têm telefone
        contacts = Contact.objects.filter(phone__isnull=False).exclude(phone='')
        
        if not force:
            # Se não for forçado, buscar apenas contatos sem avatar
            contacts = contacts.filter(avatar__isnull=True).exclude(avatar='')
        
        total_contacts = contacts.count()
        self.stdout.write(f"Total de contatos para processar: {total_contacts}")
        
        success_count = 0
        error_count = 0
        
        for i, contact in enumerate(contacts, 1):
            self.stdout.write(f"Processando {i}/{total_contacts}: {contact.name} ({contact.phone})")
            
            try:
                # Determinar o tipo de integração baseado no provedor
                provedor = contact.provedor
                if not provedor:
                    self.stdout.write(f"    Contato {contact.name} não tem provedor associado")
                    continue
                
                # Buscar integrações WhatsApp
                whatsapp_integrations = []
                
                if integration_type in ['evolution', 'both']:
                    # Buscar integração Evolution (se existir)
                    evolution_integration = getattr(provedor, 'whatsapp_integration', None)
                    if evolution_integration and evolution_integration.is_active:
                        whatsapp_integrations.append({
                            'type': 'evolution',
                            'instance': evolution_integration.instance_name,
                            'integration': evolution_integration
                        })
                
                if integration_type in ['uazapi', 'both']:
                    # Buscar integração Uazapi
                    if provedor.integracoes_externas and provedor.integracoes_externas.get('whatsapp_url'):
                        whatsapp_integrations.append({
                            'type': 'uazapi',
                            'instance': provedor.integracoes_externas.get('whatsapp_instance', 'default'),
                            'integration': provedor
                        })
                
                if not whatsapp_integrations:
                    self.stdout.write(f"    Nenhuma integração WhatsApp ativa encontrada para {contact.name}")
                    continue
                
                # Tentar buscar foto do perfil em cada integração
                profile_pic_found = False
                
                for integration in whatsapp_integrations:
                    if update_contact_profile_picture(
                        contact, 
                        integration['instance'], 
                        integration['type']
                    ):
                        self.stdout.write(f"   Foto obtida via {integration['type']}")
                        profile_pic_found = True
                        success_count += 1
                        break
                
                if not profile_pic_found:
                    self.stdout.write(f"   Nenhuma foto encontrada para {contact.name}")
                    error_count += 1
                    
            except Exception as e:
                self.stdout.write(f"   Erro ao processar {contact.name}: {str(e)}")
                error_count += 1
        
        self.stdout.write(f"\nResumo:")
        self.stdout.write(f"   Sucessos: {success_count}")
        self.stdout.write(f"   Erros: {error_count}")
        self.stdout.write(f"   Total processado: {total_contacts}") 