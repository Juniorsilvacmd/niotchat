"""
Serviço de integração com E-mail (IMAP/SMTP)
"""

import imaplib
import smtplib
import email
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List, Dict, Any
from datetime import datetime
import re
import os
from django.conf import settings
from django.core.files.base import ContentFile
from .models import EmailIntegration
from conversations.models import Contact, Conversation, Message, Inbox

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, integration: EmailIntegration):
        self.integration = integration
        self.imap_client: Optional[imaplib.IMAP4_SSL] = None
        self.smtp_client: Optional[smtplib.SMTP] = None
        self.is_running = False
    
    def connect_imap(self) -> bool:
        """Conectar ao servidor IMAP"""
        try:
            if self.integration.imap_use_ssl:
                self.imap_client = imaplib.IMAP4_SSL(
                    self.integration.imap_host,
                    self.integration.imap_port
                )
            else:
                self.imap_client = imaplib.IMAP4(
                    self.integration.imap_host,
                    self.integration.imap_port
                )
            
            self.imap_client.login(
                self.integration.username,
                self.integration.password
            )
            
            logger.info(f"Conectado ao IMAP: {self.integration.email}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao conectar IMAP: {e}")
            return False
    
    def connect_smtp(self) -> bool:
        """Conectar ao servidor SMTP"""
        try:
            self.smtp_client = smtplib.SMTP(
                self.integration.smtp_host,
                self.integration.smtp_port
            )
            
            if self.integration.smtp_use_tls:
                self.smtp_client.starttls()
            
            self.smtp_client.login(
                self.integration.username,
                self.integration.password
            )
            
            logger.info(f"Conectado ao SMTP: {self.integration.email}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao conectar SMTP: {e}")
            return False
    
    def fetch_emails(self) -> List[Dict[str, Any]]:
        """Buscar novos e-mails"""
        if not self.imap_client:
            if not self.connect_imap():
                return []
        
        try:
            # Selecionar caixa de entrada
            self.imap_client.select('INBOX')
            
            # Buscar e-mails não lidos
            status, messages = self.imap_client.search(None, 'UNSEEN')
            
            if status != 'OK':
                return []
            
            email_ids = messages[0].split()
            emails = []
            
            for email_id in email_ids[-10:]:  # Processar últimos 10 e-mails
                try:
                    status, msg_data = self.imap_client.fetch(email_id, '(RFC822)')
                    
                    if status == 'OK':
                        email_message = email.message_from_bytes(msg_data[0][1])
                        parsed_email = self.parse_email(email_message)
                        parsed_email['email_id'] = email_id.decode()
                        emails.append(parsed_email)
                        
                except Exception as e:
                    logger.error(f"Erro ao processar e-mail {email_id}: {e}")
            
            return emails
            
        except Exception as e:
            logger.error(f"Erro ao buscar e-mails: {e}")
            return []
    
    def parse_email(self, email_message) -> Dict[str, Any]:
        """Analisar e-mail"""
        try:
            # Extrair informações básicas
            subject = email_message.get('Subject', '')
            from_email = email_message.get('From', '')
            to_email = email_message.get('To', '')
            date_str = email_message.get('Date', '')
            message_id = email_message.get('Message-ID', '')
            
            # Extrair nome e e-mail do remetente
            from_name, from_address = self.parse_email_address(from_email)
            
            # Extrair conteúdo
            content = ''
            attachments = []
            
            if email_message.is_multipart():
                for part in email_message.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get('Content-Disposition', ''))
                    
                    if content_type == 'text/plain' and 'attachment' not in content_disposition:
                        content += part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    elif content_type == 'text/html' and 'attachment' not in content_disposition and not content:
                        # Usar HTML se não houver texto plano
                        html_content = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                        content = self.html_to_text(html_content)
                    elif 'attachment' in content_disposition:
                        # Processar anexo
                        filename = part.get_filename()
                        if filename:
                            attachments.append({
                                'filename': filename,
                                'content_type': content_type,
                                'data': part.get_payload(decode=True)
                            })
            else:
                content = email_message.get_payload(decode=True).decode('utf-8', errors='ignore')
            
            return {
                'subject': subject,
                'from_name': from_name,
                'from_email': from_address,
                'to_email': to_email,
                'content': content.strip(),
                'attachments': attachments,
                'date': date_str,
                'message_id': message_id,
                'raw_email': email_message
            }
            
        except Exception as e:
            logger.error(f"Erro ao analisar e-mail: {e}")
            return {}
    
    def parse_email_address(self, email_str: str) -> tuple:
        """Extrair nome e e-mail de string"""
        try:
            # Regex para extrair nome e e-mail
            match = re.match(r'^(.*?)\s*<(.+?)>$', email_str.strip())
            if match:
                name = match.group(1).strip().strip('"')
                email_addr = match.group(2).strip()
                return name, email_addr
            else:
                # Apenas e-mail
                return '', email_str.strip()
        except:
            return '', email_str
    
    def html_to_text(self, html: str) -> str:
        """Converter HTML para texto simples"""
        try:
            # Remover tags HTML básicas
            import re
            text = re.sub(r'<[^>]+>', '', html)
            text = re.sub(r'\s+', ' ', text)
            return text.strip()
        except:
            return html
    
    def process_email(self, email_data: Dict[str, Any]) -> bool:
        """Processar e-mail recebido"""
        try:
            # Criar ou obter contato
            contact = self.get_or_create_contact(
                email_data['from_name'],
                email_data['from_email']
            )
            
            # Criar ou obter conversa
            conversation = self.get_or_create_conversation(contact, email_data['subject'])
            
            # Processar anexos
            attachments = []
            for attachment in email_data.get('attachments', []):
                attachment_info = self.save_attachment(attachment)
                if attachment_info:
                    attachments.append(attachment_info)
            
            # Criar mensagem
            message = Message.objects.create(
                conversation=conversation,
                content=email_data['content'],
                message_type='incoming',
                content_type='text',
                attachments=attachments,
                external_source_id=email_data.get('message_id', ''),
                metadata={
                    'email_subject': email_data['subject'],
                    'email_from': email_data['from_email'],
                    'email_to': email_data['to_email'],
                    'email_date': email_data['date'],
                    'email_message_id': email_data.get('message_id', ''),
                    'email_id': email_data.get('email_id', '')
                },
                is_from_customer=False
            )
            
            logger.info(f"E-mail processado: {message.id}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao processar e-mail: {e}")
            return False
    
    def get_or_create_contact(self, name: str, email_address: str) -> Contact:
        """Criar ou obter contato"""
        try:
            contact, created = Contact.objects.get_or_create(
                provedor=self.integration.provedor,
                email=email_address,
                defaults={
                    'name': name or email_address.split('@')[0],
                    'additional_attributes': {
                        'email_integration_id': self.integration.id
                    }
                }
            )
            
            # Atualizar nome se necessário
            if not created and name and contact.name != name:
                contact.name = name
                contact.save()
            
            return contact
            
        except Exception as e:
            logger.error(f"Erro ao criar/obter contato: {e}")
            # Retornar contato padrão
            return Contact.objects.get_or_create(
                provedor=self.integration.provedor,
                name="Contato Desconhecido",
                email=email_address,
                defaults={'additional_attributes': {}}
            )[0]
    
    def get_or_create_conversation(self, contact: Contact, subject: str) -> Conversation:
        """Criar ou obter conversa"""
        try:
            # Obter inbox de e-mail
            inbox, created = Inbox.objects.get_or_create(
                provedor=self.integration.provedor,
                channel_type='email',
                defaults={
                    'name': f'E-mail - {self.integration.name}',
                    'settings': {
                        'email_integration_id': self.integration.id,
                        'email_address': self.integration.email
                    }
                }
            )
            
            # Buscar conversa existente baseada no assunto
            conversation = Conversation.objects.filter(
                contact=contact,
                inbox=inbox,
                status__in=['open', 'pending'],
                additional_attributes__email_subject=subject
            ).first()
            
            if not conversation:
                conversation = Conversation.objects.create(
                    contact=contact,
                    inbox=inbox,
                    status='open',
                    priority='medium',
                    additional_attributes={
                        'email_subject': subject,
                        'email_integration_id': self.integration.id
                    }
                )
            
            return conversation
            
        except Exception as e:
            logger.error(f"Erro ao criar/obter conversa: {e}")
            raise
    
    def save_attachment(self, attachment: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Salvar anexo"""
        try:
            filename = attachment['filename']
            content_type = attachment['content_type']
            data = attachment['data']
            
            # Criar arquivo
            file_content = ContentFile(data)
            
            # Salvar no diretório de mídia
            file_path = f"email_attachments/{filename}"
            
            # Aqui você pode implementar o salvamento real do arquivo
            # Por enquanto, retornar informações do anexo
            
            return {
                'type': 'file',
                'filename': filename,
                'content_type': content_type,
                'size': len(data),
                'file_path': file_path
            }
            
        except Exception as e:
            logger.error(f"Erro ao salvar anexo: {e}")
            return None
    
    def send_email(self, to_email: str, subject: str, content: str, 
                   reply_to_message_id: Optional[str] = None,
                   attachments: Optional[List[str]] = None) -> bool:
        """Enviar e-mail"""
        try:
            if not self.smtp_client:
                if not self.connect_smtp():
                    return False
            
            # Criar mensagem
            msg = MIMEMultipart()
            msg['From'] = self.integration.email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            if reply_to_message_id:
                msg['In-Reply-To'] = reply_to_message_id
                msg['References'] = reply_to_message_id
            
            # Adicionar conteúdo
            msg.attach(MIMEText(content, 'plain', 'utf-8'))
            
            # Adicionar anexos se existirem
            if attachments:
                for attachment_path in attachments:
                    if os.path.exists(attachment_path):
                        with open(attachment_path, 'rb') as attachment:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(attachment.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename= {os.path.basename(attachment_path)}'
                            )
                            msg.attach(part)
            
            # Enviar e-mail
            self.smtp_client.send_message(msg)
            
            logger.info(f"E-mail enviado para: {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar e-mail: {e}")
            return False
    
    def mark_as_read(self, email_id: str) -> bool:
        """Marcar e-mail como lido"""
        try:
            if not self.imap_client:
                return False
            
            self.imap_client.store(email_id, '+FLAGS', '\\Seen')
            return True
            
        except Exception as e:
            logger.error(f"Erro ao marcar e-mail como lido: {e}")
            return False
    
    def start_monitoring(self):
        """Iniciar monitoramento de e-mails"""
        self.is_running = True
        
        while self.is_running:
            try:
                emails = self.fetch_emails()
                
                for email_data in emails:
                    if self.process_email(email_data):
                        # Marcar como lido se processado com sucesso
                        self.mark_as_read(email_data.get('email_id', ''))
                
                # Aguardar antes da próxima verificação
                import time
                time.sleep(30)  # Verificar a cada 30 segundos
                
            except Exception as e:
                logger.error(f"Erro no monitoramento: {e}")
                import time
                time.sleep(60)  # Aguardar 1 minuto em caso de erro
    
    def stop_monitoring(self):
        """Parar monitoramento"""
        self.is_running = False
        
        if self.imap_client:
            try:
                self.imap_client.close()
                self.imap_client.logout()
            except:
                pass
        
        if self.smtp_client:
            try:
                self.smtp_client.quit()
            except:
                pass


class EmailManager:
    """Gerenciador de múltiplas integrações de e-mail"""
    
    def __init__(self):
        self.services: Dict[int, EmailService] = {}
        self.threads: Dict[int, Any] = {}
    
    def start_integration(self, integration_id: int):
        """Iniciar integração específica"""
        try:
            integration = EmailIntegration.objects.get(
                id=integration_id,
                is_active=True
            )
            
            if integration_id not in self.services:
                service = EmailService(integration)
                self.services[integration_id] = service
            
            service = self.services[integration_id]
            
            # Iniciar em thread separada
            import threading
            thread = threading.Thread(target=service.start_monitoring)
            thread.daemon = True
            thread.start()
            
            self.threads[integration_id] = thread
            
            integration.is_connected = True
            integration.save()
            
            logger.info(f"Integração de e-mail {integration_id} iniciada")
            
        except EmailIntegration.DoesNotExist:
            logger.error(f"Integração de e-mail {integration_id} não encontrada")
        except Exception as e:
            logger.error(f"Erro ao iniciar integração {integration_id}: {e}")
    
    def stop_integration(self, integration_id: int):
        """Parar integração específica"""
        if integration_id in self.services:
            self.services[integration_id].stop_monitoring()
            del self.services[integration_id]
        
        if integration_id in self.threads:
            del self.threads[integration_id]
        
        try:
            integration = EmailIntegration.objects.get(id=integration_id)
            integration.is_connected = False
            integration.save()
        except EmailIntegration.DoesNotExist:
            pass
    
    def start_all_integrations(self):
        """Iniciar todas as integrações ativas"""
        integrations = EmailIntegration.objects.filter(is_active=True)
        
        for integration in integrations:
            self.start_integration(integration.id)
    
    def stop_all_integrations(self):
        """Parar todas as integrações"""
        for integration_id in list(self.services.keys()):
            self.stop_integration(integration_id)


# Instância global do gerenciador
email_manager = EmailManager()

