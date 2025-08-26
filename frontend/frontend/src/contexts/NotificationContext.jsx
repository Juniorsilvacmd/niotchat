import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadMessagesByUser, setUnreadMessagesByUser] = useState({});
  const initializingRef = useRef(false);

  // Carregar estado inicial do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('unread_messages_by_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const totalUnread = Object.values(parsed).reduce((sum, count) => sum + count, 0);
        setUnreadCount(totalUnread);
        setHasNewMessages(totalUnread > 0);
        setUnreadMessagesByUser(parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar notificações do localStorage:', error);
    }
  }, []);

  // Carregar usuário atual
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Conectar WebSocket quando usuário for carregado
  useEffect(() => {
    if (currentUser?.id) {
      connectWebSocket();
    }

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [currentUser?.id]);

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/me/', {
        headers: { Authorization: `Token ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário atual:', error);
    }
  };

  const connectWebSocket = () => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Fechar conexão anterior se existir
    if (websocketRef.current && websocketRef.current.readyState !== WebSocket.CLOSED) {
      websocketRef.current.close();
    }

    try {
      const token = localStorage.getItem('token');
      // Conectar ao WebSocket de chat privado para notificações
      const wsUrl = `ws://${window.location.hostname}:8010/ws/private-chat/?token=${token}`;
      
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        setIsConnected(true);
        
        // Aguardar currentUser estar disponível antes de enviar join_notifications
        if (currentUser?.id) {
          websocketRef.current.send(JSON.stringify({
            type: 'join_notifications',
            user_id: currentUser.id
          }));
        }
      };
      
      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'new_private_message') {
            // Verificar se a mensagem é para o usuário atual
            if (data.message.recipient_id === currentUser.id) {
              
              const senderId = data.message.sender?.id?.toString();
              
              // Atualizar contador global
              setUnreadCount(prev => prev + 1);
              setHasNewMessages(true);
              
              // Atualizar contador por usuário
              if (senderId) {
                setUnreadMessagesByUser(prev => {
                  const newUnreadByUser = {
                    ...prev,
                    [senderId]: (prev[senderId] || 0) + 1
                  };
                  
                  // Salvar no localStorage para sincronizar entre componentes
                  localStorage.setItem('unread_messages_by_user', JSON.stringify(newUnreadByUser));
                  
                  // Disparar evento para sincronizar componentes
                  window.dispatchEvent(new Event('unread-messages-changed'));
                  

                  return newUnreadByUser;
                });
              }
              
              // Notificação do navegador
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Nova Mensagem no Chat Interno', {
                  body: `${data.message.sender?.name || 'Usuario'}: ${data.message.content}`,
                  icon: '/favicon.ico',
                  tag: 'chat-interno'
                });
              }
              
              // Som de notificação
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
                audio.play().catch(() => {});
              } catch (audioError) {
                console.log('Som nao disponivel');
              }
            } else {
              console.log('Mensagem nao e para mim, ignorando');
            }
          } else if (data.type === 'notifications_joined') {
            console.log('=== ENTROU NO SISTEMA DE NOTIFICACOES GLOBAL ===');
          }
        } catch (error) {
          console.error('Erro ao processar notificacao:', error);
        }
      };
      
      websocketRef.current.onclose = (event) => {
        console.log('=== WEBSOCKET GLOBAL DESCONECTADO ===');
        console.log('Codigo:', event.code, 'Razao:', event.reason);
        setIsConnected(false);
        
        // Reconectar automaticamente
        if (!event.wasClean) {
          console.log('Reconectando em 3 segundos...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (currentUser?.id) {
              connectWebSocket();
            }
          }, 3000);
        }
      };
      
      websocketRef.current.onerror = (error) => {
        console.error('=== ERRO WEBSOCKET GLOBAL ===', error);
        setIsConnected(false);
      };
      
    } catch (error) {
      console.error('Erro ao criar WebSocket global:', error);
    }
  };

  // Funções para gerenciar notificações
  const clearNotifications = () => {
    setUnreadCount(0);
    setHasNewMessages(false);
    setUnreadMessagesByUser({});
    localStorage.removeItem('unread_messages_by_user');
    
    // Disparar evento para sincronizar componentes
    window.dispatchEvent(new Event('unread-messages-changed'));
  };

  const markAsRead = (count = null, userId = null) => {
    if (userId) {
      // Marcar como lida mensagens de um usuário específico
      setUnreadMessagesByUser(prev => {
        const userUnreadCount = prev[userId] || 0;
        const newUnreadByUser = { ...prev };
        delete newUnreadByUser[userId];
        
        // Atualizar contador global
        setUnreadCount(prevTotal => Math.max(0, prevTotal - userUnreadCount));
        
        // Salvar no localStorage
        localStorage.setItem('unread_messages_by_user', JSON.stringify(newUnreadByUser));
        
        // Disparar evento para sincronizar componentes
        window.dispatchEvent(new Event('unread-messages-changed'));
        

        return newUnreadByUser;
      });
    } else if (count !== null) {
      setUnreadCount(prev => Math.max(0, prev - count));
    } else {
      clearNotifications();
    }
  };

  // Conectar WebSocket quando component monta
  useEffect(() => {
    if (initializingRef.current) {
      return;
    }
    
    initializingRef.current = true;
    connectWebSocket();
    
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      initializingRef.current = false;
    };
  }, []);

  // Enviar join_notifications quando currentUser for carregado
  useEffect(() => {
    if (currentUser?.id && websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'join_notifications',
        user_id: currentUser.id
      }));
    }
  }, [currentUser]);

  // Solicitar permissão para notificações
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const value = {
    unreadCount,
    hasNewMessages,
    currentUser,
    isConnected,
    unreadMessagesByUser,
    clearNotifications,
    markAsRead,
    websocket: websocketRef.current
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};