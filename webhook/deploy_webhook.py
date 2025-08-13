#!/usr/bin/env python3
"""
Webhook para deploy automatizado
Este script será executado quando houver push no GitHub
"""

import os
import sys
import json
import hmac
import hashlib
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Configurações
WEBHOOK_SECRET = "niochat_deploy_secret_2024"  # Altere para uma chave segura
DEPLOY_SCRIPT = "/var/www/niochat/deploy_automated.sh"

class DeployWebhook(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Verificar se é um webhook do GitHub
            if not self.headers.get('X-GitHub-Event') == 'push':
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Not a push event'}).encode())
                return

            # Ler o corpo da requisição
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            # Verificar assinatura do webhook (opcional, mas recomendado)
            signature = self.headers.get('X-Hub-Signature-256', '')
            if signature:
                expected_signature = 'sha256=' + hmac.new(
                    WEBHOOK_SECRET.encode(),
                    body,
                    hashlib.sha256
                ).hexdigest()
                
                if not hmac.compare_digest(signature, expected_signature):
                    self.send_response(401)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Invalid signature'}).encode())
                    return

            # Parse do JSON
            data = json.loads(body.decode('utf-8'))
            
            # Verificar se é o branch main
            ref = data.get('ref', '')
            if ref != 'refs/heads/main':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'message': 'Not main branch, ignoring'}).encode())
                return

            # Executar script de deploy
            print(f"[{self.log_date_time_string()}] Iniciando deploy automatizado...")
            
            result = subprocess.run(
                ['bash', DEPLOY_SCRIPT],
                capture_output=True,
                text=True,
                cwd='/var/www/niochat'
            )

            if result.returncode == 0:
                print(f"[{self.log_date_time_string()}] Deploy concluído com sucesso")
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'success',
                    'message': 'Deploy iniciado com sucesso',
                    'output': result.stdout
                }).encode())
            else:
                print(f"[{self.log_date_time_string()}] Erro no deploy: {result.stderr}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'error',
                    'message': 'Erro no deploy',
                    'error': result.stderr
                }).encode())

        except Exception as e:
            print(f"[{self.log_date_time_string()}] Erro no webhook: {str(e)}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'error',
                'message': str(e)
            }).encode())

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({
            'status': 'ok',
            'message': 'NioChat Deploy Webhook está funcionando'
        }).encode())

    def log_message(self, format, *args):
        # Log personalizado
        print(f"[{self.log_date_time_string()}] {format % args}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    server = HTTPServer(('0.0.0.0', port), DeployWebhook)
    print(f"🚀 Webhook de deploy iniciado na porta {port}")
    print(f"📝 URL: http://194.238.25.164:{port}/deploy")
    print(f"🔗 Configure no GitHub: https://github.com/Juniorsilvacmd/niochat/settings/hooks")
    server.serve_forever() 