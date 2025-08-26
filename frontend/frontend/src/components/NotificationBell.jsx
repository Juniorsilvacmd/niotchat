import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle } from 'lucide-react';
import axios from 'axios';
import NotificationModal from './NotificationModal';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);

  // Buscar notificações do usuário
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Verificar se o usuário é admin de provedor
      const userResponse = await axios.get('/api/auth/me/', {
        headers: { Authorization: `Token ${token}` }
      });
      
      const user = userResponse.data;
      
      // Só buscar notificações se for admin de provedor
      if (user.user_type === 'admin' && user.provedores_admin && user.provedores_admin.length > 0) {
        const response = await axios.get('/api/mensagens-sistema/minhas_mensagens/', {
          headers: { Authorization: `Token ${token}` }
        });
        
        setNotifications(response.data || []);
      } else {
        // Usuário não é admin de provedor, não mostrar notificações
        setNotifications([]);
      }
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
      // Em caso de erro, não mostrar notificações
      setNotifications([]);
    }
  };

  // Marcar como visualizada
  const markAsRead = async (notificationId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.patch(`/api/mensagens-sistema/${notificationId}/marcar-visualizada/`, {}, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Atualizar lista
      fetchNotifications();
    } catch (err) {
      console.error('Erro ao marcar como visualizada:', err);
    } finally {
      setLoading(false);
    }
  };

  // Callback para quando o modal marca como visualizada
  const handleModalMarkAsRead = (notificationId) => {
    markAsRead(notificationId);
    setShowModal(false);
    setCurrentNotification(null);
  };

  // Fechar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentNotification(null);
  };

  // Executar imediatamente e configurar intervalo
  useEffect(() => {
    // Executar imediatamente
    fetchNotifications();
    
    // Buscar a cada 30 segundos
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Verificar se há novas mensagens não lidas e mostrar modal
  useEffect(() => {
    // Só mostrar modal se for admin de provedor
    if (notifications.length > 0) {
      const unreadNotifications = notifications.filter(n => !n.visualizacoes || Object.keys(n.visualizacoes).length === 0);
      
      if (unreadNotifications.length > 0 && !showModal) {
        // Mostrar modal para a primeira mensagem não lida
        setCurrentNotification(unreadNotifications[0]);
        setShowModal(true);
      }
    }
  }, [notifications, showModal]);

  // Contar notificações não lidas
  const unreadCount = notifications.filter(n => !n.visualizacoes || Object.keys(n.visualizacoes).length === 0).length;

  return (
    <div className="relative">
      {/* Sino de notificações */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificações */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-lg border border-border z-50">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Notificações
              </h3>
              <button
                onClick={() => setShowDropdown(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((notification) => {
                const isRead = notification.visualizacoes && Object.keys(notification.visualizacoes).length > 0;
                return (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-border ${
                      !isRead ? 'bg-blue-500/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground mb-1">
                          {notification.assunto}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.mensagem}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {new Date(notification.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="capitalize">
                            {notification.tipo}
                          </span>
                        </div>
                      </div>
                      
                      {!isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          disabled={loading}
                          className="ml-2 p-1 text-blue-500 hover:text-blue-600 disabled:opacity-50"
                          title="Marcar como visualizada"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-border text-center">
              <button
                onClick={fetchNotifications}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                Atualizar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay para fechar ao clicar fora */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}

      {/* Modal de notificação automático */}
      <NotificationModal
        isOpen={showModal}
        onClose={handleCloseModal}
        notification={currentNotification}
        onMarkAsRead={handleModalMarkAsRead}
      />
    </div>
  );
};

export default NotificationBell; 