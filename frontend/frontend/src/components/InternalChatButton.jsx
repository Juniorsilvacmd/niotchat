import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { 
  MessageCircle, 
  Search, 
  Users, 
  Settings,
  Plus,
  Crown,
  Phone,
  Video,
  MoreVertical
} from 'lucide-react';
import PrivateChatSidebar from './PrivateChatSidebar';
import useOnlineUsers from '../hooks/useOnlineUsers';
import axios from 'axios';
import { useNotifications } from '../contexts/NotificationContext';

const InternalChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByUser, setUnreadByUser] = useState({}); // Mensagens não lidas por usuário
  const [currentUser, setCurrentUser] = useState(null);
  
  // Hook para usuários online
  const { isUserOnline, getOnlineCount } = useOnlineUsers();
  
  // Hook para notificações
  const { unreadMessagesByUser } = useNotifications();
  
  // Usar URL relativa (será resolvida pelo proxy do Vite)
  const API_BASE = '/api';

  // ===== EFEITOS =====
  
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadCurrentUser();
      loadUnreadCounts();
    }
  }, [isOpen]);
  
  // Atualizar quando notificações mudarem
  useEffect(() => {
    // Forçar re-render quando notificações mudarem
  }, [unreadMessagesByUser]);

  // Removido - agora usa o hook useOnlineUsers

  // ===== FUNÇÕES DE API =====
  
  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('Token não encontrado no localStorage. Faça login novamente.');
        setUsers([]);
        return;
      }
      
      console.log('[DEBUG InternalChat] Fazendo requisição para /users-list/');
      
      // Buscar usuários do mesmo provedor (usando endpoint específico para chat interno)
      const response = await axios.get(`${API_BASE}/users-list/`, {
        headers: { Authorization: `Token ${token}` }
      });
      
      console.log('[DEBUG InternalChat] Usuários recebidos:', response.data);
      // A API /users-list/ retorna array direto
      const usersData = response.data || [];
      setUsers(usersData);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      if (error.response?.status === 401) {
        console.error('Token inválido! Faça login novamente.');
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };
  
  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/auth/me/`, {
        headers: { Authorization: `Token ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Erro ao carregar usuário atual:', error);
      setCurrentUser(null);
    }
  };
  
  const loadUnreadCounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/private-unread-counts/`, {
        headers: { Authorization: `Token ${token}` }
      });
      
      setUnreadByUser(response.data || {});
      
      // Total de mensagens não lidas
      const total = Object.values(response.data || {}).reduce((sum, count) => sum + count, 0);
      setUnreadCount(total);
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
      setUnreadByUser({});
      setUnreadCount(0);
    }
  };

  // ===== FUNÇÕES AUXILIARES =====
  
  const getUserName = (user) => {
    return `${user.first_name} ${user.last_name}`.trim() || user.username;
  };
  
  const getUserAvatar = (user) => {
    // Se tiver avatar, usar; senão usar iniciais
    return user.avatar || null;
  };
  
  const getUserInitials = (user) => {
    const name = getUserName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  // Função movida para o hook useOnlineUsers
  
  const getUserTypeLabel = (userType) => {
    const types = {
      'admin': 'Admin',
      'supervisor': 'Supervisor',
      'agent': 'Atendente',
      'manager': 'Gerente'
    };
    return types[userType] || 'Usuário';
  };
  
  const getUserTypeColor = (userType) => {
    const colors = {
      'admin': 'bg-red-500',
      'supervisor': 'bg-blue-500',
      'agent': 'bg-green-500',
      'manager': 'bg-purple-500'
    };
    return colors[userType] || 'bg-gray-500';
  };
  
  const filteredUsers = users; // Sem filtro de busca por enquanto
  
  // Debug: verificar estado dos usuários
  console.log('[DEBUG InternalChat] Estado atual:', {
    users: users,
    usersLength: users.length,
    currentUser: currentUser,
    filteredUsers: filteredUsers
  });
  
  // Separar usuários online e offline (excluindo usuário atual)
  const otherUsers = filteredUsers.filter(user => user.id !== currentUser?.id);
  const onlineUsersList = otherUsers.filter(user => isUserOnline(user.id));
  const offlineUsersList = otherUsers.filter(user => !isUserOnline(user.id));
  
  console.log('[DEBUG InternalChat] Usuários processados:', {
    otherUsers: otherUsers,
    otherUsersLength: otherUsers.length,
    onlineUsersList: onlineUsersList,
    offlineUsersList: offlineUsersList
  });
  
  // Função para abrir chat privado
  const openPrivateChat = (user) => {
    setSelectedUser(user);
    setIsOpen(false); // Fechar modal de usuários
  };

  // Removido - não é mais necessário

  return (
    <>
      {/* Botão no Topbar */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button
            className="p-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative"
            title="Chat Interno"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </button>
        </DialogTrigger>
        
        <DialogContent className="max-w-sm max-h-[85vh] p-0 bg-gray-800 border-gray-600">
          <DialogHeader className="p-4 pb-2 border-b border-gray-600">
            <DialogTitle className="flex items-center gap-2 text-white text-base font-medium">
              <Users className="h-4 w-4" />
              Chat
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col h-full max-h-[500px]">
            {/* Header Info */}
            <div className="p-3 border-b border-gray-600 text-center">
              <p className="text-xs text-gray-400">
                Clique em um usuário para iniciar uma conversa privada
              </p>
            </div>
            
            {/* Lista de Usuários */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {/* Lista Simplificada de Usuários */}
                  <div className="bg-gray-800">
                    {/* Todos os usuários em uma lista (exceto usuário atual) */}
                    {otherUsers.map(user => (
                      <div
                        key={user.id}
                        onClick={() => openPrivateChat(user)}
                        className="flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors cursor-pointer border-b border-gray-600 last:border-b-0 relative"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={getUserAvatar(user)} />
                            <AvatarFallback className="bg-gray-600 text-white text-sm">
                              {getUserInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Indicador Online/Offline */}
                          <div className={`absolute -bottom-1 -right-1 h-3 w-3 border-2 border-gray-800 rounded-full ${
                            isUserOnline(user.id) ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate">
                            {getUserName(user)}
                          </h4>
                          <p className="text-xs text-gray-400">
                            {isUserOnline(user.id) ? 'Online' : 
                             unreadMessagesByUser[user.id] ? `${unreadMessagesByUser[user.id]} mensagem${unreadMessagesByUser[user.id] > 1 ? 'ns' : ''} não lida${unreadMessagesByUser[user.id] > 1 ? 's' : ''}` : 
                             'Sem mensagens'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {user.user_type === 'admin' && (
                            <Crown className="h-3 w-3 text-yellow-500" />
                          )}
                          
                          {/* Badge de mensagens não lidas */}
                          {unreadMessagesByUser[user.id] && unreadMessagesByUser[user.id] > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                            >
                              {unreadMessagesByUser[user.id] > 9 ? '9+' : unreadMessagesByUser[user.id]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Nenhum usuário encontrado */}
                  {filteredUsers.length === 0 && !loading && (
                    <div className="p-8 text-center bg-gray-800">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-sm font-medium text-white mb-2">
                        Nenhum usuário encontrado
                      </h3>
                      <p className="text-xs text-gray-400">
                        Verifique se há usuários cadastrados
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-3 border-t border-gray-600 bg-gray-800">
              <div className="text-center text-xs text-gray-400">
                {onlineUsersList.length} online • {otherUsers.length} total
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Chat Privado Sidebar */}
      <PrivateChatSidebar
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        selectedUser={selectedUser}
        currentUser={currentUser}
      />
    </>
  );
};

export default InternalChatButton;