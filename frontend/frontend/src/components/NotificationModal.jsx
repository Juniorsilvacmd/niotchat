import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Bell } from 'lucide-react';
import axios from 'axios';

const NotificationModal = ({ isOpen, onClose, notification, onMarkAsRead }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Marcar como visualizada
  const handleConfirmRead = async () => {
    if (!notification) return;
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      await axios.patch(`/api/mensagens-sistema/${notification.id}/marcar-visualizada/`, {}, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Chamar callback para atualizar estado
      if (onMarkAsRead) {
        onMarkAsRead(notification.id);
      }
      
      // Fechar modal
      onClose();
    } catch (err) {
      console.error('Erro ao marcar como visualizada:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Marcar como visualizada sempre que fechar
  const handleClose = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/mensagens-sistema/${notification.id}/marcar-visualizada/`, {}, {
        headers: { Authorization: `Token ${token}` }
      });
      console.log('Mensagem marcada como visualizada ao fechar');
      
      // Chamar callback para atualizar estado
      if (onMarkAsRead) {
        onMarkAsRead(notification.id);
      }
    } catch (error) {
      console.error('Erro ao marcar como visualizada:', error);
    }
    
    onClose();
  };

  // Fechar modal ao pressionar ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll do body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !notification) return null;

  return (
    <>
      {/* Overlay escuro */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* Modal */}
        <div 
          className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header do modal */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-blue-600/10 to-purple-600/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Bell className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Nova Notificação
                </h2>
                <p className="text-sm text-muted-foreground">
                  Mensagem do Superadmin
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          {/* Conteúdo do modal */}
          <div className="p-6 space-y-4">
            {/* Assunto */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Assunto
              </h3>
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-foreground font-medium">
                  {notification.assunto}
                </p>
              </div>
            </div>

            {/* Mensagem */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Mensagem
              </h3>
              <div className="bg-muted/50 rounded-lg p-3 border border-border max-h-64 overflow-y-auto">
                <p className="text-foreground whitespace-pre-wrap">
                  {notification.mensagem}
                </p>
              </div>
            </div>

            {/* Informações adicionais */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border">
              <span>
                Data: {new Date(notification.created_at).toLocaleDateString('pt-BR')}
              </span>
              <span className="capitalize">
                Tipo: {notification.tipo}
              </span>
            </div>
          </div>

          {/* Footer com botões */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/20">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-foreground"
            >
              Fechar
            </button>
            <button
              onClick={handleConfirmRead}
              disabled={isLoading}
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white font-medium flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Confirmar Leitura
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationModal; 