import { useState, useEffect, useRef } from 'react';

export default function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const reconnectTimeoutRef = useRef(null);

  // Função para verificar se um usuário está online
  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  // Função para obter a contagem de usuários online
  const getOnlineCount = () => {
    return onlineUsers.size;
  };

  // Função para buscar usuários online via API REST (fallback se WebSocket não estiver disponível)
  const fetchOnlineUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/users/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const users = data.results || data;
        const onlineUserIds = users
          .filter(user => user.is_online)
          .map(user => user.id);
        setOnlineUsers(new Set(onlineUserIds));
      }
    } catch (error) {
      // Fallback silencioso - não expor erros
    }
  };

  // Conectar ao WebSocket para monitorar usuários online (desabilitado - usar apenas API REST)
  const connectWebSocket = () => {
    // WebSocket desabilitado temporariamente - usar apenas API REST
    // Fazer busca inicial via API
    fetchOnlineUsers();
  };

  // Inicializar busca de usuários online via API REST
  useEffect(() => {
    connectWebSocket();
    
    // Buscar usuários online via API REST a cada 30 segundos
    const apiInterval = setInterval(fetchOnlineUsers, 30000);

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      clearInterval(apiInterval);
    };
  }, []);

  return {
    isUserOnline,
    getOnlineCount,
    onlineUsers: Array.from(onlineUsers)
  };
}