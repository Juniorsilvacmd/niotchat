import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, User, Clock, Tag } from 'lucide-react';
import axios from 'axios';

const ConversationList = ({ onConversationSelect, selectedConversation, provedorId, onConversationUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    // Recuperar aba ativa do localStorage ou usar 'mine' como padrão
    return localStorage.getItem('conversationListActiveTab') || 'mine';
  });
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState([]);

  // Buscar permissões do usuário
  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        const token = localStorage.getItem('token');
        const userRes = await axios.get('/api/auth/me/', {
          headers: { Authorization: `Token ${token}` }
        });
        setUserPermissions(userRes.data.permissions || []);
      } catch (err) {
        console.error('Erro ao buscar permissões do usuário:', err);
        setUserPermissions([]);
      }
    };
    fetchUserPermissions();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/conversations/', {
        headers: { Authorization: `Token ${token}` }
      });
      
      const conversationsData = res.data.results || res.data;
      setConversations(conversationsData);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (provedorId) {
      fetchConversations();
    }
  }, [provedorId]);

  // Expor função de recarregamento
  useEffect(() => {
    if (onConversationUpdate) {
      onConversationUpdate(fetchConversations);
    }
  }, [onConversationUpdate]);

  // Definir abas baseado nas permissões
  const getAvailableTabs = () => {
    // Filtrar conversas não fechadas
    const activeConversations = conversations.filter(c => c.status !== 'closed');
    
    const baseTabs = [
      { id: 'mine', label: 'Minhas', count: activeConversations.filter(c => c.assignee).length },
      { id: 'unassigned', label: 'Não atribuídas', count: activeConversations.filter(c => !c.assignee).length },
    ];

    // Se tem permissão para ver atendimentos com IA, adiciona aba "Com a IA"
    if (userPermissions.includes('view_ai_conversations')) {
      // Filtrar conversas que estão sendo tratadas pela IA (apenas ativas)
      const aiConversations = activeConversations.filter(conv => {
        // Conversas com IA: status 'snoozed', assignee nulo/IA, ou campo ai_assisted
        return conv.status === 'snoozed' || 
               !conv.assignee || 
               (conv.assignee && (
                 conv.assignee.first_name?.toLowerCase().includes('ia') || 
                 conv.assignee.username?.toLowerCase().includes('ia')
               )) ||
               (conv.additional_attributes && conv.additional_attributes.ai_assisted);
      });
      
      baseTabs.push({ 
        id: 'ai', 
        label: 'Com a IA', 
        count: aiConversations.length 
      });
    }

    return baseTabs;
  };

  const tabs = getAvailableTabs();

  // Definir aba padrão baseado nas permissões
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(tab => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'resolved': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getLabelColor = (label) => {
    switch (label) {
      case 'pagamentos': return 'label-blue';
      case 'internet_lenta': return 'label-yellow';
      case 'sem_conexao': return 'label-red';
      default: return 'label-blue';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 60) {
      return `${diffMins}min`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  };

  const filteredConversations = conversations.filter(conv => {
    // Não mostrar conversas fechadas
    if (conv.status === 'closed') {
      return false;
    }
    
    const matchesSearch = 
      conv.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.last_message?.content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtrar por aba
    if (activeTab === 'mine') {
      return matchesSearch && conv.assignee;
    } else if (activeTab === 'unassigned') {
      return matchesSearch && !conv.assignee;
    } else if (activeTab === 'ai') {
      // Para a aba 'Com a IA', mostrar apenas conversas que estão sendo tratadas pela IA
      return matchesSearch && (
        conv.status === 'snoozed' || 
        !conv.assignee || 
        (conv.assignee && (
          conv.assignee.first_name?.toLowerCase().includes('ia') || 
          conv.assignee.username?.toLowerCase().includes('ia')
        )) ||
        (conv.additional_attributes && conv.additional_attributes.ai_assisted)
      );
    }
    return matchesSearch; // fallback
  });

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-card-foreground">Conversas</h2>
          <button className="text-muted-foreground hover:text-card-foreground">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Pesquisar mensagens em conversas"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="niochat-input pl-8 w-full text-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                localStorage.setItem('conversationListActiveTab', tab.id);
              }}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-xs px-1 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-center text-muted-foreground">Carregando conversas...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-3 text-center text-muted-foreground">Nenhuma conversa encontrada.</div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onConversationSelect(conversation)}
              className={`p-3 border-b border-border cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedConversation?.id === conversation.id ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-start space-x-2">
                {/* Avatar */}
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  {conversation.contact.avatar ? (
                    <img 
                      src={conversation.contact.avatar} 
                      alt={conversation.contact.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-card-foreground truncate">
                      {conversation.contact?.name || 'Contato'}
                    </h3>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(conversation.status)}`}></div>
                      <span className="text-xs text-muted-foreground">
                        {conversation.last_activity_at ? formatTimestamp(conversation.last_activity_at) : ''}
                      </span>
                    </div>
                  </div>

                  <p className={`text-xs truncate mb-1 ${
                    conversation.unread_count > 0
                      ? 'text-card-foreground font-medium' 
                      : 'text-muted-foreground'
                  }`}>
                    {conversation.last_message?.content || 'Nenhuma mensagem'}
                  </p>

                  {/* Labels */}
                  {conversation.labels && conversation.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {conversation.labels.map((label) => (
                        <span key={label.id} className={`label-badge ${getLabelColor(label.name)}`}>
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      {conversation.assignee?.first_name || conversation.assignee?.username || 'Não atribuído'}
                    </span>
                    <span>{conversation.inbox?.name || 'Canal'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;

