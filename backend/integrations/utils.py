import requests
from core.uazapi_client import UazapiClient


def fetch_whatsapp_profile_picture(phone, instance_name, integration_type='evolution', provedor=None, is_client=True):
    """
    Busca a foto do perfil do WhatsApp de forma automática
    
    Args:
        phone: Número do telefone do contato
        instance_name: Nome da instância WhatsApp
        integration_type: 'evolution' ou 'uazapi'
        provedor: Objeto Provedor (necessário para Uazapi)
        is_client: True para buscar foto do cliente, False para buscar foto da instância conectada
    
    Returns:
        str: URL da foto do perfil ou None se não encontrada
    """
    
    # Limpar o número do telefone
    clean_phone = phone.replace('@s.whatsapp.net', '').replace('@c.us', '')
    
    if integration_type == 'evolution':
        if is_client:
            return _fetch_evolution_client_profile_picture(phone, instance_name)
        else:
            return _fetch_evolution_profile_picture(clean_phone, instance_name)
    elif integration_type == 'uazapi':
        return _fetch_uazapi_profile_picture(clean_phone, instance_name, provedor)
    else:
        print(f"Tipo de integração não suportado: {integration_type}")
        return None


def _fetch_evolution_profile_picture(phone, instance_name):
    """Busca foto do perfil via Evolution API - mesma lógica do CanalSerializer"""
    try:
        # Usar a mesma lógica do CanalSerializer para buscar a foto do perfil
        url = 'https://evo.niochat.com.br/instance/fetchInstances'
        headers = {'apikey': '78be6d7e78e8be03ba5e3cbdf1443f1c'}
        
        print(f"[DEBUG] Buscando foto Evolution (fetchInstances): {url}")
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            # Procurar pela instância específica
            for inst in data:
                if inst.get('name') == instance_name:
                    profile_pic = inst.get('profilePicUrl')
                    if profile_pic:
                        print(f"[DEBUG] Foto Evolution encontrada: {profile_pic}")
                        return profile_pic
                    else:
                        print(f"[DEBUG] Foto Evolution não encontrada para instância {instance_name}")
                        break
            else:
                print(f"[DEBUG] Instância {instance_name} não encontrada")
        else:
            print(f"[DEBUG] Erro Evolution API: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"[DEBUG] Exception Evolution API: {str(e)}")
    
    return None


def _fetch_evolution_client_profile_picture(phone, instance_name):
    """Busca foto do perfil do cliente via Evolution API - usando findContact"""
    try:
        # Buscar a foto do perfil do cliente específico
        contact_url = f"https://evo.niochat.com.br/chat/findContact/{instance_name}"
        contact_data = {
            'number': phone.replace('@s.whatsapp.net', '').replace('@c.us', '')
        }
        headers = {'apikey': '78be6d7e78e8be03ba5e3cbdf1443f1c'}
        
        print(f"[DEBUG] Buscando foto do cliente Evolution: {contact_url} - {phone}")
        response = requests.post(contact_url, headers=headers, json=contact_data, timeout=10)
        
        if response.status_code == 200:
            contact_info = response.json()
            profile_pic_url = contact_info.get('profilePicUrl')
            if profile_pic_url:
                print(f"[DEBUG] Foto do cliente Evolution encontrada: {profile_pic_url}")
                return profile_pic_url
            else:
                print(f"[DEBUG] Foto do cliente Evolution não encontrada para {phone}")
        else:
            print(f"[DEBUG] Erro Evolution API cliente: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"[DEBUG] Exception Evolution API cliente: {str(e)}")
    
    return None


def _fetch_uazapi_profile_picture(phone, instance_name, provedor):
    """Busca foto do perfil via Uazapi usando /chat/details"""
    try:
        if not provedor or not provedor.integracoes_externas:
            print("[DEBUG] Provedor ou integrações não configuradas")
            return None
        
        token = provedor.integracoes_externas.get('whatsapp_token')
        uazapi_url = provedor.integracoes_externas.get('whatsapp_url')
        
        if not token or not uazapi_url:
            print("[DEBUG] Token ou URL do Uazapi não configurados")
            return None
        
        print(f"[DEBUG] Buscando foto Uazapi: {phone} - {instance_name}")
        client = UazapiClient(uazapi_url, token)
        contact_info = client.get_contact_info(instance_name, phone)
        
        if contact_info:
            # O endpoint /chat/details retorna a foto em diferentes campos
            # Tentar diferentes campos possíveis para a foto do perfil
            profile_pic_url = (
                contact_info.get('profilePicUrl') or
                contact_info.get('wa_profilePicUrl') or
                contact_info.get('profile_pic_url') or
                contact_info.get('image') or
                contact_info.get('avatar')
            )
            
            if profile_pic_url:
                print(f"[DEBUG] Foto Uazapi encontrada: {profile_pic_url}")
                return profile_pic_url
            else:
                print(f"[DEBUG] Foto Uazapi não encontrada nos dados: {list(contact_info.keys())}")
        else:
            print(f"[DEBUG] Dados do contato não encontrados para {phone}")
            
    except Exception as e:
        print(f"[DEBUG] Exception Uazapi: {str(e)}")
    
    return None


def update_contact_profile_picture(contact, instance_name, integration_type='evolution'):
    """
    Atualiza a foto do perfil de um contato automaticamente
    
    Args:
        contact: Objeto Contact
        instance_name: Nome da instância WhatsApp
        integration_type: 'evolution' ou 'uazapi'
    
    Returns:
        bool: True se a foto foi atualizada, False caso contrário
    """
    
    # Se já tem avatar, não precisa buscar
    if contact.avatar:
        print(f"[DEBUG] Contato {contact.name} já tem avatar: {contact.avatar}")
        return False
    
    # Determinar o tipo de integração baseado no provedor se não especificado
    if integration_type == 'auto':
        if contact.provedor and contact.provedor.integracoes_externas:
            if contact.provedor.integracoes_externas.get('whatsapp_url'):
                integration_type = 'uazapi'
            else:
                integration_type = 'evolution'
        else:
            integration_type = 'evolution'
    
    print(f"[DEBUG] Buscando foto para {contact.name} ({contact.phone}) via {integration_type}")
    
    # Buscar a foto do perfil do cliente
    profile_pic_url = fetch_whatsapp_profile_picture(
        phone=contact.phone,
        instance_name=instance_name,
        integration_type=integration_type,
        provedor=contact.provedor,
        is_client=True  # Buscar foto do cliente
    )
    
    if profile_pic_url:
        # Validar se a URL é acessível
        try:
            response = requests.head(profile_pic_url, timeout=5)
            if response.status_code == 200:
                contact.avatar = profile_pic_url
                contact.save()
                print(f"[DEBUG] Avatar atualizado para {contact.name}: {profile_pic_url}")
                return True
            else:
                print(f"[DEBUG] URL da foto não acessível: {response.status_code}")
                return False
        except Exception as e:
            print(f"[DEBUG] Erro ao validar URL da foto: {e}")
            return False
    else:
        print(f"[DEBUG] Não foi possível obter avatar para {contact.name}")
        return False 