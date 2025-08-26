import requests

class SGPClient:
    def __init__(self, base_url, token, app_name):
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.app_name = app_name

    def _headers(self, include_content_type=True):
        headers = {
            'Authorization': f'Token {self.token}',
            'App': self.app_name
        }
        if include_content_type:
            headers['Content-Type'] = 'application/json'
        return headers

    def listar_clientes(self):
        return requests.get(f'{self.base_url}/api/ura/clientes/', headers=self._headers()).json()

    def consultar_cliente(self, cpf):
        params = {
            'token': self.token,
            'app': self.app_name,
            'cpfcnpj': cpf
        }
        return requests.get(f'{self.base_url}/api/ura/consultacliente/', params=params, headers=self._headers()).json()

    def verifica_acesso(self, contrato):
        data = {
            'token': self.token,
            'app': self.app_name,
            'contrato': contrato
        }
        # Não enviar Content-Type para form-data!
        return requests.post(f'{self.base_url}/api/ura/verificaacesso/', data=data, headers=self._headers(include_content_type=False)).json()

    def listar_contratos(self, cliente_id):
        return requests.post(f'{self.base_url}/api/ura/listacontrato/', json={'cliente_id': cliente_id}, headers=self._headers()).json()

    def liberar_por_confianca(self, contrato):
        return requests.post(f'{self.base_url}/api/ura/liberacaopromessa/', json={'contrato': contrato}, headers=self._headers()).json()

    def criar_chamado(self, cliente_id, motivo):
        return requests.post(f'{self.base_url}/api/ura/chamado/', json={'cliente_id': cliente_id, 'motivo': motivo}, headers=self._headers()).json()

    def segunda_via_fatura(self, contrato):
        # Enviar token apenas nos parâmetros (sem Content-Type para form-data)
        data = {
            'token': self.token,
            'app': self.app_name,
            'contrato': contrato
        }
        # Não enviar Content-Type para form-data!
        return requests.post(f'{self.base_url}/api/ura/fatura2via/', data=data, headers=self._headers(include_content_type=False)).json()

    def gerar_pix(self, fatura):
        return requests.get(f'{self.base_url}/api/ura/pagamento/pix/{fatura}', headers=self._headers()).json()

    def listar_manutencoes(self, cpf):
        return requests.post(f'{self.base_url}/api/ura/manutencao/list/', json={'cpf': cpf}, headers=self._headers()).json() 