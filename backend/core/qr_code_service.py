"""
Serviço para geração de QR Codes PIX
"""

import qrcode
from PIL import Image
import io
import base64
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class QRCodeService:
    """Serviço para geração de QR Codes PIX"""
    
    def __init__(self):
        self.qr_version = 1
        self.box_size = 10
        self.border = 5
    
    def gerar_qr_code_pix(self, codigo_pix: str) -> Optional[str]:
        """
        Gera QR code PIX e retorna base64
        
        Args:
            codigo_pix: Código PIX para gerar o QR code
            
        Returns:
            String base64 da imagem PNG ou None se erro
        """
        try:
            if not codigo_pix:
                logger.error("Código PIX vazio")
                return None
            
            # Criar QR code
            qr = qrcode.QRCode(
                version=self.qr_version,
                box_size=self.box_size,
                border=self.border
            )
            qr.add_data(codigo_pix)
            qr.make(fit=True)
            
            # Gerar imagem
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Converter para base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            logger.info(f"QR code PIX gerado com sucesso para código: {codigo_pix[:50]}...")
            return f"data:image/png;base64,{img_base64}"
            
        except Exception as e:
            logger.error(f"Erro ao gerar QR code PIX: {e}")
            return None
    
    def gerar_qr_code_pix_bytes(self, codigo_pix: str) -> Optional[bytes]:
        """
        Gera QR code PIX e retorna bytes da imagem
        
        Args:
            codigo_pix: Código PIX para gerar o QR code
            
        Returns:
            Bytes da imagem PNG ou None se erro
        """
        try:
            if not codigo_pix:
                logger.error("Código PIX vazio")
                return None
            
            # Criar QR code
            qr = qrcode.QRCode(
                version=self.qr_version,
                box_size=self.box_size,
                border=self.border
            )
            qr.add_data(codigo_pix)
            qr.make(fit=True)
            
            # Gerar imagem
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Converter para bytes
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            logger.info(f"QR code PIX gerado com sucesso para código: {codigo_pix[:50]}...")
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Erro ao gerar QR code PIX: {e}")
            return None

# Instância global do serviço
qr_code_service = QRCodeService() 