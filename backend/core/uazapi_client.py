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
        """Testa se o token funciona com o endpoint /status"""
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