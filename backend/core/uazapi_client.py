import requests

class UazapiClient:
    def __init__(self, base_url, token):
        self.base_url = base_url.rstrip('/')
        self.token = token
        print(f"[DEBUG UazapiClient] Inicializado com URL: {self.base_url}")
        print(f"[DEBUG UazapiClient] Token: {self.token[:10] if self.token else 'None'}...")

    def connect_instance(self, phone=None):
        """
        Conecta uma instância ao WhatsApp
        Se phone=None, gera QR code
        Se phone=string, gera código de pareamento
        """
        url = f"{self.base_url}/instance/connect"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "token": self.token  # Formato correto da Uazapi
        }
        
        # Se não passar phone, gera QR code
        # Se passar phone, gera código de pareamento
        data = {}
        if phone:
            data["phone"] = phone
        
        print(f"[DEBUG UazapiClient] Fazendo POST para: {url}")
        print(f"[DEBUG UazapiClient] Headers: {headers}")
        print(f"[DEBUG UazapiClient] Data: {data}")
        
        resp = requests.post(url, json=data, headers=headers, timeout=15)
        print(f"[DEBUG UazapiClient] Status code: {resp.status_code}")
        print(f"[DEBUG UazapiClient] Response: {resp.text}")
        
        # Não usar raise_for_status() pois 409 é esperado
        return resp.json()

    def get_instance_status(self, instance_id):
        """
        Verifica o status de uma instância específica
        Retorna informações completas da instância incluindo:
        - Estado da conexão (disconnected, connecting, connected)
        - QR code atualizado (se em processo de conexão)
        - Código de pareamento (se disponível)
        - Informações da última desconexão
        """
        url = f"{self.base_url}/instance/status?instance={instance_id}"
        headers = {
            "Accept": "application/json",
            "token": self.token  # Formato correto da Uazapi
        }
        
        print(f"[DEBUG UazapiClient] Fazendo GET para: {url}")
        print(f"[DEBUG UazapiClient] Headers: {headers}")
        
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"[DEBUG UazapiClient] Status code: {resp.status_code}")
        print(f"[DEBUG UazapiClient] Response: {resp.text}")
        
        resp.raise_for_status()
        return resp.json()
    
    def get_server_status(self):
        """Verifica se o token funciona com o endpoint /status"""
        url = f"{self.base_url}/status"
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.token}"  # Para /status usa Authorization
        }
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json() 

    def delete_instance(self, instance_id):
        """
        Deleta uma instância específica na Uazapi
        """
        url = f"{self.base_url}/instance/{instance_id}"
        headers = {
            "Accept": "application/json",
            "token": self.token
        }
        print(f"[DEBUG UazapiClient] Fazendo DELETE para: {url}")
        print(f"[DEBUG UazapiClient] Headers: {headers}")
        resp = requests.delete(url, headers=headers, timeout=10)
        print(f"[DEBUG UazapiClient] Status code: {resp.status_code}")
        print(f"[DEBUG UazapiClient] Response: {resp.text}")
        resp.raise_for_status()
        return resp.json() 

    def disconnect_instance(self, instance_id):
        """
        Desconecta uma instância específica na Uazapi
        """
        url = f"{self.base_url}/instance/disconnect"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "token": self.token
        }
        data = {"instance": instance_id}
        print(f"[DEBUG UazapiClient] Fazendo POST para: {url}")
        print(f"[DEBUG UazapiClient] Headers: {headers}")
        print(f"[DEBUG UazapiClient] Data: {data}")
        resp = requests.post(url, json=data, headers=headers, timeout=10)
        print(f"[DEBUG UazapiClient] Status code: {resp.status_code}")
        print(f"[DEBUG UazapiClient] Response: {resp.text}")
        resp.raise_for_status()
        return resp.json() 

    def get_contact_info(self, instance_id, phone):
        """
        Busca informações de um contato específico incluindo foto do perfil
        Usa o endpoint /chat/details conforme documentação da Uazapi
        """
        url = f"{self.base_url}/chat/details"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "token": self.token
        }
        
        data = {
            "instance": instance_id,
            "number": phone.replace('@s.whatsapp.net', '').replace('@c.us', ''),
            "preview": False  # Retorna imagem em tamanho full (melhor qualidade)
        }
        
        print(f"[DEBUG UazapiClient] Buscando contato via /chat/details: {url}")
        print(f"[DEBUG UazapiClient] Data: {data}")
        
        try:
            resp = requests.post(url, json=data, headers=headers, timeout=10)
            print(f"[DEBUG UazapiClient] Status: {resp.status_code}")
            
            if resp.status_code == 200:
                result = resp.json()
                print(f"[DEBUG UazapiClient] Sucesso: {result}")
                return result
            else:
                print(f"[DEBUG UazapiClient] Erro: {resp.status_code} - {resp.text}")
                return None
                
        except Exception as e:
            print(f"[DEBUG UazapiClient] Exception: {e}")
            return None
    
    def enviar_mensagem(self, numero: str, texto: str, instance_id: str = None) -> bool:
        """
        Envia mensagem de texto via WhatsApp
        
        Args:
            numero: Número do WhatsApp (com ou sem @s.whatsapp.net)
            texto: Texto da mensagem
            instance_id: ID da instância (opcional)
            
        Returns:
            True se enviado com sucesso, False caso contrário
        """
        try:
            # Limpar número
            numero_limpo = numero.replace('@s.whatsapp.net', '').replace('@c.us', '')
            
            url = f"{self.base_url}/send/text"
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "token": self.token
            }
            
            data = {
                "number": numero_limpo,
                "text": texto
            }
            
            if instance_id:
                data["instance"] = instance_id
            
            print(f"[DEBUG UazapiClient] Enviando mensagem para: {numero_limpo}")
            print(f"[DEBUG UazapiClient] Texto: {texto[:50]}...")
            
            resp = requests.post(url, json=data, headers=headers, timeout=30)
            print(f"[DEBUG UazapiClient] Status: {resp.status_code}")
            print(f"[DEBUG UazapiClient] Response: {resp.text}")
            
            if resp.status_code == 200:
                # Para Uazapi, status 200 já indica sucesso
                # A resposta contém dados da mensagem se enviada com sucesso
                result = resp.json()
                return bool(result.get('id'))  # Se tem ID da mensagem, foi enviada
            else:
                print(f"[DEBUG UazapiClient] Erro HTTP: {resp.status_code}")
                return False
                
        except Exception as e:
            print(f"[DEBUG UazapiClient] Erro ao enviar mensagem: {e}")
            return False
    
    def enviar_imagem(self, numero: str, imagem_bytes: bytes, legenda: str = "", instance_id: str = None) -> bool:
        """
        Envia imagem via WhatsApp usando /send/media conforme documentação
        
        Args:
            numero: Número do WhatsApp
            imagem_bytes: Bytes da imagem
            legenda: Legenda da imagem (opcional)
            instance_id: ID da instância (opcional)
            
        Returns:
            True se enviado com sucesso, False caso contrário
        """
        try:
            # Limpar número
            numero_limpo = numero.replace('@s.whatsapp.net', '').replace('@c.us', '')
            
            # Converter para base64 conforme documentação
            import base64
            imagem_base64 = base64.b64encode(imagem_bytes).decode('utf-8')
            
            # Usar endpoint /send/media conforme documentação
            url = f"{self.base_url}/send/media"
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json", 
                "token": self.token
            }
            
            # Formato conforme documentação /send/media
            data = {
                "number": numero_limpo,
                "type": "image",
                "file": f"data:image/png;base64,{imagem_base64}",
                "readchat": True
            }
            
            # Só adicionar text/caption se houver legenda
            if legenda:
                data["text"] = legenda
            
            if instance_id:
                data["instance"] = instance_id
            
            print(f"[DEBUG UazapiClient] Enviando imagem para: {numero_limpo}")
            print(f"[DEBUG UazapiClient] Tipo: image")
            print(f"[DEBUG UazapiClient] Caption: {legenda if legenda else 'SEM LEGENDA'}")
            print(f"[DEBUG UazapiClient] Base64 size: {len(imagem_base64)} chars")
            
            resp = requests.post(url, json=data, headers=headers, timeout=30)
            print(f"[DEBUG UazapiClient] Status: {resp.status_code}")
            print(f"[DEBUG UazapiClient] Response: {resp.text}")
            
            if resp.status_code == 200:
                result = resp.json()
                return bool(result.get('id'))  # Se tem ID da mensagem, foi enviada
            else:
                print(f"[DEBUG UazapiClient] Erro HTTP: {resp.status_code}")
                return False
                
        except Exception as e:
            print(f"[DEBUG UazapiClient] Erro ao enviar imagem: {e}")
            return False
    
    def enviar_documento(self, numero: str, documento_url: str, nome_arquivo: str = "boleto.pdf", legenda: str = "", instance_id: str = None) -> bool:
        """
        Envia documento (PDF do boleto) via WhatsApp usando /send/media
        
        Args:
            numero: Número do WhatsApp
            documento_url: URL do documento (PDF do boleto)
            nome_arquivo: Nome do arquivo (opcional)
            legenda: Legenda do documento (opcional)
            instance_id: ID da instância (opcional)
            
        Returns:
            True se enviado com sucesso, False caso contrário
        """
        try:
            # Limpar número
            numero_limpo = numero.replace('@s.whatsapp.net', '').replace('@c.us', '')
            
            # Usar endpoint /send/media conforme documentação
            url = f"{self.base_url}/send/media"
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json", 
                "token": self.token
            }
            
            # Formato conforme documentação /send/media para documentos
            data = {
                "number": numero_limpo,
                "type": "document",
                "file": documento_url,
                "docName": nome_arquivo,
                "readchat": True
            }
            
            # Só adicionar text/caption se houver legenda
            if legenda:
                data["text"] = legenda
            
            if instance_id:
                data["instance"] = instance_id
            
            print(f"[DEBUG UazapiClient] Enviando documento para: {numero_limpo}")
            print(f"[DEBUG UazapiClient] Tipo: document")
            print(f"[DEBUG UazapiClient] Nome: {nome_arquivo}")
            print(f"[DEBUG UazapiClient] URL: {documento_url}")
            print(f"[DEBUG UazapiClient] Caption: {legenda if legenda else 'SEM LEGENDA'}")
            
            resp = requests.post(url, json=data, headers=headers, timeout=30)
            print(f"[DEBUG UazapiClient] Status: {resp.status_code}")
            print(f"[DEBUG UazapiClient] Response: {resp.text}")
            
            if resp.status_code == 200:
                result = resp.json()
                return bool(result.get('id'))  # Se tem ID da mensagem, foi enviada
            else:
                print(f"[DEBUG UazapiClient] Erro HTTP: {resp.status_code}")
                return False
                
        except Exception as e:
            print(f"[DEBUG UazapiClient] Erro ao enviar documento: {e}")
            return False
    
    def enviar_menu(self, numero: str, tipo: str, texto: str, choices: list, footer_text: str = "", instance_id: str = None) -> bool:
        """
        Envia menu interativo com botões via WhatsApp
        
        Args:
            numero: Número do WhatsApp
            tipo: Tipo do menu ('button' ou 'list')
            texto: Texto principal
            choices: Lista de opções no formato ['Texto|valor', 'Texto2|valor2']
            footer_text: Texto do rodapé (opcional)
            instance_id: ID da instância (opcional)
            
        Returns:
            True se enviado com sucesso, False caso contrário
        """
        try:
            # Limpar número
            numero_limpo = numero.replace('@s.whatsapp.net', '').replace('@c.us', '')
            
            url = f"{self.base_url}/send/menu"
            
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "token": self.token
            }
            
            # Usar formato da documentação Uazapi para /send/menu
            data = {
                "number": numero_limpo,
                "type": tipo,
                "text": texto,
                "choices": choices
            }
            
            if footer_text:
                data["footerText"] = footer_text
            
            if instance_id:
                data["instance"] = instance_id
            
            print(f"[DEBUG UazapiClient] Enviando menu para: {numero_limpo}")
            print(f"[DEBUG UazapiClient] Tipo: {tipo}")
            print(f"[DEBUG UazapiClient] Choices: {len(choices)}")
            
            resp = requests.post(url, json=data, headers=headers, timeout=30)
            print(f"[DEBUG UazapiClient] Status: {resp.status_code}")
            print(f"[DEBUG UazapiClient] Response: {resp.text}")
            
            if resp.status_code == 200:
                # Para Uazapi, status 200 já indica sucesso
                # A resposta contém dados da mensagem se enviada com sucesso
                result = resp.json()
                return bool(result.get('id'))  # Se tem ID da mensagem, foi enviada
            else:
                print(f"[DEBUG UazapiClient] Erro HTTP: {resp.status_code}")
                return False
                
        except Exception as e:
            print(f"[DEBUG UazapiClient] Erro ao enviar menu: {e}")
            return False 