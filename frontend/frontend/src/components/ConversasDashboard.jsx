import React, { useEffect, useState, useRef } from 'react';
import { Users, AlertTriangle, Flame, HelpCircle, Clock, MoreVertical, Bot, MessageCircle, User, X, Volume2 } from 'lucide-react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
// Remover: import { toast } from './ui/sonner';

const statusMap = [
  {
    key: 'snoozed',
    titulo: 'Na Automação',
    cor: 'bg-[#2d5eff]',
    textoCor: 'text-white',
  },
  {
    key: 'pending',
    titulo: 'Em Espera',
    cor: 'bg-[#ffd600]',
    textoCor: 'text-black',
  },
  {
    key: 'open',
    titulo: 'Em Atendimento',
    cor: 'bg-[#1bc47d]',
    textoCor: 'text-white',
  },
];

const fases = [
  {
    titulo: 'Navegando',
    cor: 'border',
    info: { flame: 0, alert: 0, help: 0, users: 0 },
  },
  {
    titulo: 'Em Espera',
    cor: 'border',
    info: { flame: 0, alert: 0, help: 0, users: 0 },
  },
  {
    titulo: 'Em Atendimento',
    cor: 'border',
    info: { flame: 0, alert: 0, help: 0, users: 0 },
  },
];

const blocos = [
  {
    key: 'ia',
    titulo: 'Com a IA',
    cor: 'bg-gradient-to-r from-purple-500 to-indigo-500',
    textoCor: 'text-white',
    icone: <HelpCircle className="w-7 h-7 text-white" />,
    status: 'snoozed', // Exemplo: status para IA
  },
  {
    key: 'fila',
    titulo: 'Fila de Atendentes',
    cor: 'bg-gradient-to-r from-orange-400 to-yellow-400',
    textoCor: 'text-white',
    icone: <AlertTriangle className="w-7 h-7 text-white" />,
    status: 'pending', // Exemplo: status para fila
  },
  {
    key: 'atendimento',
    titulo: 'Em Atendimento',
    cor: 'bg-gradient-to-r from-green-400 to-emerald-600',
    textoCor: 'text-white',
    icone: <Users className="w-7 h-7 text-white" />,
    status: 'open', // Exemplo: status para atendimento humano
  },
];

export default function ConversasDashboard() {
  const [counts, setCounts] = useState({ ia: 0, fila: 0, atendimento: 0 });
  const [loading, setLoading] = useState(true);

  // Função para obter nome limpo do canal
  const getChannelDisplayName = (inbox) => {
    if (!inbox) return 'Canal';
    
    const channelTypes = {
      'whatsapp': 'WhatsApp',
      'email': 'Email', 
      'telegram': 'Telegram',
      'webchat': 'Chat Web',
      'facebook': 'Facebook',
      'instagram': 'Instagram'
    };
    
    return channelTypes[inbox.channel_type] || inbox.channel_type || 'Canal';
  };
  const [conversas, setConversas] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuBtnRefs = useRef({});
  const [modalConversa, setModalConversa] = useState(null); // conversa aberta no modal
  const [modalMensagens, setModalMensagens] = useState([]); // mensagens da conversa
  const [modalLoading, setModalLoading] = useState(false);
  const mensagensEndRef = useRef(null);
  const wsRef = useRef(null);
  const [modalTransferir, setModalTransferir] = useState(null); // conversa a transferir
  const [usuariosTransferir, setUsuariosTransferir] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [modalTransferirEquipe, setModalTransferirEquipe] = useState(null); // conversa a transferir para equipe
  const [equipesTransferir, setEquipesTransferir] = useState([]);
  const [loadingEquipes, setLoadingEquipes] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Funções auxiliares para filtrar conversas (sem sobreposição)
  const isComIA = (conv) => {
    // Apenas conversas com status 'snoozed' (Com IA)
    return conv.status === 'snoozed';
  };

  const isEmEspera = (conv) => {
    // Conversas com status 'pending' (Em Espera) - incluindo sem atendente
    return conv.status === 'pending';
  };

  const isEmAtendimento = (conv) => {
    // Conversas com status 'open' (Em Atendimento)
    return conv.status === 'open';
  };

  // Função para verificar autenticação (mesma lógica do ConversationList)
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userRes = await axios.get('/api/auth/me/', {
          headers: { Authorization: `Token ${token}` }
        });
        setUser(userRes.data);
        setAuthReady(true);
        return true;
      }
    } catch (error) {
      console.log('Token inválido, removendo...');
      localStorage.removeItem('token');
    }

    // Tentar sessão ativa
    try {
      const userRes = await axios.get('/api/auth/me/', {
        withCredentials: true
      });
      setUser(userRes.data);
      setAuthReady(true);
      return true;
    } catch (error) {
      console.log('Nenhuma sessão ativa encontrada');
      return false;
    }
  };

  // Inicializar autenticação
  useEffect(() => {
    const initializeAuth = async () => {
      const success = await checkAuth();
      if (!success) {
        setAuthReady(false);
        setHasInitialized(true);
      } else {
        setHasInitialized(true);
      }
    };
    
    initializeAuth();
  }, []);

  // Buscar mensagens ao abrir o modal
  useEffect(() => {
    if (modalConversa && modalConversa.id) {
      setModalLoading(true);
      const token = localStorage.getItem('token');
      console.log(`# Debug logging removed for security Carregando mensagens da conversa ${modalConversa.id}`);
      axios.get(`/api/messages/?conversation=${modalConversa.id}&page_size=1000`, {
        headers: { Authorization: `Token ${token}` }
      })
        .then(res => {
          console.log('# Debug logging removed for security Mensagens carregadas:', res.data);
          const mensagens = res.data.results || res.data;
          console.log('# Debug logging removed for security Total de mensagens:', mensagens.length);
          setModalMensagens(mensagens);
        })
        .catch(error => {
          console.error('# Debug logging removed for security Erro ao carregar mensagens:', error);
          setModalMensagens([]);
        })
        .finally(() => setModalLoading(false));
    } else {
      setModalMensagens([]);
    }
  }, [modalConversa]);

  // WebSocket para mensagens em tempo real no modal
  useEffect(() => {
    if (modalConversa && modalConversa.id) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${wsProtocol}://${window.location.host}/ws/conversations/${modalConversa.id}/`;
      const ws = new window.WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket modal recebeu:', data);
          
          if (data.type === 'message' || data.type === 'new_message' || data.type === 'chat_message') {
            console.log('💬 Nova mensagem recebida via WebSocket');
            
            // Recarregar mensagens para garantir dados atualizados
            const token = localStorage.getItem('token');
            axios.get(`/api/messages/?conversation=${modalConversa.id}`, {
              headers: { Authorization: `Token ${token}` }
            })
            .then(res => {
              console.log('# Debug logging removed for security Mensagens recarregadas:', res.data);
              const mensagens = res.data.results || res.data;
              setModalMensagens(mensagens);
            })
            .catch(error => {
              console.error('# Debug logging removed for security Erro ao recarregar mensagens:', error);
            });
          }
        } catch (e) { 
          console.error('# Debug logging removed for security Erro ao processar WebSocket modal:', e);
        }
      };
      ws.onclose = () => { wsRef.current = null; };
      return () => { ws.close(); };
    }
  }, [modalConversa]);

  // Scroll automático para última mensagem
  useEffect(() => {
    if (mensagensEndRef.current) {
      mensagensEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [modalMensagens, modalLoading]);

  // Handlers do menu contextual
  function handleMenuOpen(conversaId, e) {
    e.stopPropagation();
    const btn = menuBtnRefs.current[conversaId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 160
      });
    }
    setMenuOpenId(conversaId);
  }
  function handleMenuClose() {
    setMenuOpenId(null);
  }
  function handleAbrir(conversa) {
    setModalConversa(conversa);
    setMenuOpenId(null);
  }
  function handleTransferir(conversa) {
    setModalTransferir(conversa);
    setMenuOpenId(null);
  }
  async function handleTransferirGrupo(conversa) {
    setModalTransferirEquipe(conversa);
    setMenuOpenId(null);
    
    // Buscar equipes disponíveis
    const token = localStorage.getItem('token');
    setLoadingEquipes(true);
    
    try {
      const response = await axios.get('/api/teams/', {
        headers: { Authorization: `Token ${token}` }
      });
      
      const equipes = response.data.results || response.data;
      console.log('Equipes encontradas:', equipes);
      setEquipesTransferir(equipes);
    } catch (error) {
      console.error('Erro ao buscar equipes:', error);
      setEquipesTransferir([]);
    } finally {
      setLoadingEquipes(false);
    }
  }
  async function handleEncerrar(conversa) {
    setMenuOpenId(null);
    if (!conversa?.id) return;
    const token = localStorage.getItem('token');
    
    // Perguntar tipo de resolução
    const resolutionType = prompt('Tipo de resolução (ex: resolvido, transferido, cancelado):') || 'resolvido';
    const resolutionNotes = prompt('Observações sobre a resolução (opcional):') || '';
    
    if (!window.confirm('Tem certeza que deseja encerrar este atendimento?')) return;
    
    try {
      // Usar a API de encerramento por agente
      const response = await axios.post(`/api/conversations/${conversa.id}/close_conversation_agent/`, {
        resolution_type: resolutionType,
        resolution_notes: resolutionNotes
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      console.log('Resposta do encerramento:', response.status);
      
      // Atualizar a conversa na lista (mudar status para 'closed')
      setConversas(prev => prev.map(c => 
        c.id === conversa.id 
          ? { ...c, status: 'closed' }
          : c
      ));
      
      alert('Atendimento encerrado com sucesso!');
    } catch (e) {
      console.error('Erro ao encerrar atendimento:', e);
      console.error('Status:', e.response?.status);
      console.error('Data:', e.response?.data);
      alert(`Erro ao encerrar atendimento: ${e.response?.status || e.message}`);
    }
  }
  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClick(e) {
      if (menuOpenId) setMenuOpenId(null);
    }
    if (menuOpenId) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [menuOpenId]);

  useEffect(() => {
    async function fetchCounts() {
      if (!authReady) {
        console.log('Auth não está pronto, aguardando...');
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Token ${token}` } : {};
        const res = await axios.get('/api/conversations/', { headers });
        const conversasData = res.data.results || res.data;
        setConversas(conversasData);
        console.log('Conversas carregadas da API:', conversasData);
        
        // Usar as funções de filtro para contagem consistente
        const ia = conversasData.filter(isComIA).length;
        const fila = conversasData.filter(isEmEspera).length;
        const atendimento = conversasData.filter(isEmAtendimento).length;
        
        console.log('Contagem de conversas:', { ia, fila, atendimento });
        setCounts({ ia, fila, atendimento });
      } catch (e) {
        console.error('Erro ao carregar conversas:', e);
        if (e.response?.status === 401) {
          console.log('Erro de autenticação, tentando reautenticar...');
          setAuthReady(false);
          await checkAuth();
        } else {
          setCounts({ ia: 0, fila: 0, atendimento: 0 });
          setConversas([]);
        }
      } finally {
        setLoading(false);
      }
    }

    if (authReady && hasInitialized) {
      fetchCounts();
    }
  }, [authReady, hasInitialized]);

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    if (!authReady) return;

    let ws;
    function setupWebSocket() {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${wsProtocol}://${window.location.host}/ws/conversas_dashboard/`;
      ws = new window.WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🔔 WebSocket ConversasDashboard recebeu:', data);
          
          // Processar qualquer evento relacionado a conversas
          if (data.action === 'update_conversation' || 
              data.action === 'new_message' ||
              data.type === 'dashboard_event' ||
              data.type === 'conversation_event' ||
              data.event_type === 'new_message') {
            
            console.log('# Debug logging removed for security Recarregando conversas devido a evento WebSocket');
            
            // Recarregar todas as conversas para garantir dados atualizados
            setTimeout(async () => {
              try {
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Token ${token}` } : {};
                const res = await axios.get('/api/conversations/', { headers });
                const conversasData = res.data.results || res.data;
                setConversas(conversasData);
                
                // Recalcular contagens
                const ia = conversasData.filter(isComIA).length;
                const fila = conversasData.filter(isEmEspera).length;
                const atendimento = conversasData.filter(isEmAtendimento).length;
                setCounts({ ia, fila, atendimento });
                
                console.log('# Debug logging removed for security Conversas atualizadas via WebSocket');
              } catch (error) {
                console.error('# Debug logging removed for security Erro ao atualizar conversas:', error);
              }
            }, 100);
          }
          
          // Manter lógica original para compatibilidade
          if (data.action === 'update_conversation' && data.conversation) {
            setConversas(prev => {
              const idx = prev.findIndex(c => c.id === data.conversation.id);
              let novaLista;
              if (idx !== -1) {
                novaLista = [...prev];
                novaLista[idx] = data.conversation;
              } else {
                novaLista = [data.conversation, ...prev];
              }
              // Nova lógica de contagem
              let ia = 0, fila = 0, atendimento = 0;
              novaLista.forEach(conv => {
                if (conv.status === 'snoozed' || !conv.assignee || (conv.assignee && (conv.assignee.first_name?.toLowerCase().includes('ia') || conv.assignee.username?.toLowerCase().includes('ia')))) {
                  ia++;
                } else if (conv.status === 'pending') {
                  fila++;
                } else if (conv.status === 'open') {
                  atendimento++;
                }
              });
              setCounts({ ia, fila, atendimento });
              return novaLista;
            });
          }
        } catch (e) { console.log('Erro WebSocket:', e); }
      };
      ws.onclose = () => {
        setTimeout(setupWebSocket, 2000);
      };
    }
    setupWebSocket();

    return () => {
      if (ws) ws.close();
    };
  }, [authReady]);

  // Buscar usuários do provedor ao abrir modal de transferência
  useEffect(() => {
    if (modalTransferir) {
      setLoadingUsuarios(true);
      const token = localStorage.getItem('token');
      axios.get('/api/users/?provedor=me', { headers: { Authorization: `Token ${token}` } })
        .then(res => {
          const users = res.data.results || res.data;
          setUsuariosTransferir(users);
          
          // Conectar ao WebSocket para atualizações de status em tempo real
          const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
          const wsUrl = `${wsProtocol}://${window.location.hostname}:810/ws/user_status/`;
          const statusWs = new WebSocket(wsUrl);
          
          statusWs.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'user_status_update' && data.users) {
                // Atualizar status dos usuários na lista
                setUsuariosTransferir(prev => 
                  prev.map(user => {
                    const updatedUser = data.users.find(u => u.id === user.id);
                    return updatedUser ? { ...user, is_online: updatedUser.is_online } : user;
                  })
                );
              }
            } catch (e) { /* ignore */ }
          };
          
          // Limpar WebSocket ao fechar modal
          return () => {
            if (statusWs.readyState === WebSocket.OPEN) {
              statusWs.close();
            }
          };
        })
        .catch(() => setUsuariosTransferir([]))
        .finally(() => setLoadingUsuarios(false));
    } else {
      setUsuariosTransferir([]);
    }
  }, [modalTransferir]);

  async function transferirParaUsuario(usuario) {
    if (!modalTransferir) return;
    const token = localStorage.getItem('token');
    try {
      await axios.post(`/api/conversations/${modalTransferir.id}/transfer/`, { user_id: usuario.id }, {
        headers: { Authorization: `Token ${token}` }
      });
      alert('Transferido com sucesso!');
      setModalTransferir(null);
    } catch (e) {
      alert('Erro ao transferir atendimento.');
    }
  }

  async function transferirParaEquipe(equipe) {
    if (!modalTransferirEquipe?.id) return;
    
    const token = localStorage.getItem('token');
    try {
      // Para transferir para equipe, vamos transferir para o primeiro membro da equipe
      if (equipe.members && equipe.members.length > 0) {
        const primeiroMembro = equipe.members[0];
        if (!primeiroMembro.user) {
          alert('Erro: Membro da equipe sem usuário válido.');
          return;
        }
        const response = await axios.post(`/api/conversations/${modalTransferirEquipe.id}/transfer/`, {
          user_id: primeiroMembro.user.id
        }, {
          headers: { Authorization: `Token ${token}` }
        });
        
        console.log('Transferência para equipe realizada:', response.data);
        setModalTransferirEquipe(null);
        setEquipesTransferir([]);
        
        alert('Transferido para equipe com sucesso!');
        // Recarregar conversas
        window.location.reload();
      } else {
        alert('Esta equipe não possui membros para receber a conversa.');
      }
    } catch (error) {
      console.error('Erro ao transferir para equipe:', error);
      alert('Erro ao transferir conversa para equipe. Tente novamente.');
    }
  }

  // Função utilitária para pegar avatar
  function getAvatar(contact) {
    if (contact && contact.avatar) return contact.avatar;
    // Se não tiver avatar, usar inicial do nome
    const name = contact?.name || 'Contato';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  }

  // Função para pegar nome do atendente
  function getAtendente(conversa) {
    // Se tem atendente, mostrar nome
    if (conversa.assignee) {
    return conversa.assignee.first_name || conversa.assignee.username || 'Atendente';
    }
    
    // Se não tem atendente mas está "Com IA", mostrar "IA"
    if (conversa.status === 'snoozed') {
      return 'IA';
    }
    
    // Se não tem atendente e está em espera/atendimento: deixar vazio
    return '';
  }

  // Função para pegar equipe
  function getEquipe(conversa) {
    // DEBUG: Log para verificar dados
    console.log('# Debug logging removed for security getEquipe DEBUG:', {
      id: conversa.id,
      additional_attributes: conversa.additional_attributes,
      assigned_team: conversa.additional_attributes?.assigned_team,
      assignee: conversa.assignee
    });
    
    // Primeiro, verificar se há informação da equipe específica da transferência
    if (conversa.additional_attributes?.assigned_team?.name) {
      console.log('# Debug logging removed for security Usando assigned_team:', conversa.additional_attributes.assigned_team.name);
      return conversa.additional_attributes.assigned_team.name;
    }
    
    // Se tem assignee, tentar obter da equipe do usuário
    if (conversa.assignee?.team?.name) {
      console.log('# Debug logging removed for security Usando assignee.team:', conversa.assignee.team.name);
      return conversa.assignee.team.name;
    }
    
    // Fallback padrão
    if (conversa.assignee) {
      console.log('# Debug logging removed for security Usando fallback ATENDIMENTO');
      return 'ATENDIMENTO';
    }
    
    console.log('# Debug logging removed for security Retornando vazio');
    return '';
  }

  // Função para formatar número do contato
  function formatPhone(phone) {
    if (!phone) return '-';
    // Remove sufixo @s.whatsapp.net ou @lid
    let num = phone.replace(/(@.*$)/, '');
    // Formata para +55 99999-9999
    if (num.length >= 13) {
      return `+${num.slice(0,2)} ${num.slice(2,7)}-${num.slice(7,11)}`;
    } else if (num.length >= 11) {
      return `+${num.slice(0,2)} ${num.slice(2,7)}-${num.slice(7)}`;
    }
    return num;
  }

  // Função para formatar timestamp
  function formatTimestamp(timestamp) {
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
  }

  // Função para pegar status traduzido
  function getStatusText(status) {
    switch (status) {
      case 'snoozed': return 'Em Espera';
      case 'open': return 'Em Atendimento';
      case 'pending': return 'Pendente';
      case 'resolved': return 'Resolvido';
      default: return status;
    }
  }

  // Função para pegar cor do status
  function getStatusColor(status) {
    switch (status) {
      case 'snoozed': return 'bg-yellow-500';
      case 'open': return 'bg-green-500';
      case 'pending': return 'bg-orange-500';
      case 'resolved': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  }

  // Renderização dos balões de mensagem
  function renderMensagem(msg) {
    // # Debug logging removed for security CORRIGIDO: Melhor detecção de tipo de mensagem
    const isCliente = msg.is_from_customer === true;
    const isAtendente = msg.is_from_customer === false && !msg.sender_type?.includes('bot');
    const isBot = msg.is_from_customer === false && (msg.sender_type?.includes('bot') || msg.message_type === 'outgoing');
    
    const align = isCliente ? 'justify-start' : 'justify-end';
    
    // # Debug logging removed for security CORRIGIDO: Agente e IA ambos em verde
    const bg = (isBot || isAtendente) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-800';
    const icon = (isBot || isAtendente) ? <User className="w-5 h-5 text-green-600" /> : <User className="w-5 h-5 text-gray-600" />;
    
    return (
      <div key={msg.id} className={`flex ${align} mb-4`}>
        {isCliente && (
          <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden bg-gray-300">
            {/* # Debug logging removed for security CORRIGIDO: Foto de perfil do cliente */}
            {modalConversa?.contact?.avatar ? (
              <img 
                src={modalConversa.contact.avatar} 
                alt={modalConversa.contact.name || 'Cliente'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`w-full h-full flex items-center justify-center text-white font-medium text-sm bg-gradient-to-br from-blue-500 to-purple-600 ${modalConversa?.contact?.avatar ? 'hidden' : 'flex'}`}
            >
              {(modalConversa?.contact?.name || modalConversa?.contact?.phone || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        <div className={`max-w-[70%] ${(isAtendente || isBot) ? 'order-2' : 'order-1'}`}>
          <div className={`px-4 py-3 rounded-2xl shadow-sm ${bg}`}>
            {msg.content_type === 'audio' && msg.audio_url ? (
              <audio controls src={msg.audio_url} className="w-full">
                Seu navegador não suporta áudio.
              </audio>
            ) : (
              <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
            )}
          </div>
          <div className={`flex items-center mt-2 space-x-1 text-xs text-muted-foreground ${(isAtendente || isBot) ? 'justify-end' : 'justify-start'}`}>
            <span className="bg-background/80 px-2 py-1 rounded-full">
              {(msg.created_at || msg.timestamp) ? new Date(msg.created_at || msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        </div>
        {(isAtendente || isBot) && (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Conversas</h1>
      
      {/* Verificação de autenticação */}
      {!hasInitialized ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verificando autenticação...</p>
          </div>
        </div>
      ) : !authReady ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-lg font-medium mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground mb-4">Você precisa estar logado para acessar as conversas.</p>
            <button 
              onClick={() => window.location.href = '/admin/login/'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Fazer Login
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando conversas...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Dashboard de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Com IA</p>
                  <p className="text-2xl font-bold text-purple-600">{conversas.filter(isComIA).length}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Bot className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Em Espera</p>
                  <p className="text-2xl font-bold text-yellow-600">{conversas.filter(isEmEspera).length}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Em Atendimento</p>
                  <p className="text-2xl font-bold text-green-600">{conversas.filter(isEmAtendimento).length}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Blocos de fases */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bloco 1: Com IA */}
            <div className="bg-card rounded-lg shadow-md p-4 flex flex-col h-96">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Com IA</h3>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-3">
                  {conversas.filter(isComIA).map((conv) => (
                    <div key={conv.id} className="bg-background rounded-lg p-3 relative">
                      <div className="flex items-start gap-3">
                        <img 
                          src={getAvatar(conv.contact)} 
                          alt="avatar" 
                          className="w-10 h-10 rounded-full object-cover border-2 border-border" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-card-foreground truncate">
                              {conv.contact?.name || 'Contato'}
                            </h4>
                            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                              {formatTimestamp(conv.updated_at || conv.created_at)}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground mt-2">
                            <div><strong>Contato:</strong> {formatPhone(conv.contact?.phone)}</div>
                            <div><strong>Atendente:</strong> {getAtendente(conv)}</div>
                            <div><strong>Grupo:</strong> {getEquipe(conv) || 'ATENDIMENTO'}</div>
                            <div><strong>Status:</strong> {getStatusText(conv.status)}</div>
                            <div><strong>Canal:</strong> {getChannelDisplayName(conv.inbox)}</div>
                          </div>
                        </div>
                      </div>
                      <button
                        ref={el => (menuBtnRefs.current[conv.id] = el)}
                        className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-card-foreground"
                        onClick={e => handleMenuOpen(conv.id, e)}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                      {/* Menu contextual */}
                      {menuOpenId === conv.id && (
                        <div
                          className="bg-card border border-border rounded shadow-lg z-[9999] min-w-[160px] flex flex-col w-max fixed"
                          style={{ top: menuPosition.top, left: menuPosition.left }}
                        >
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleAbrir(conv); }}>
                            <MessageCircle className="w-4 h-4" /> <span>Abrir</span>
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleTransferir(conv); }}>
                            <User className="w-4 h-4 text-blue-500" /> <span>Transferir</span>
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleTransferirGrupo(conv); }}>
                            <Users className="w-4 h-4 text-blue-500" /> <span>Transferir Grupo</span>
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted text-red-600" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleEncerrar(conv); }}>
                            <X className="w-4 h-4" /> <span>Encerrar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bloco 2: Em Espera */}
            <div className="bg-card rounded-lg shadow-md p-4 flex flex-col h-96">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Em Espera</h3>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-3">
                  {conversas.filter(isEmEspera).map((conv) => (
                    <div key={conv.id} className="bg-background rounded-lg p-3 relative">
                      <div className="flex items-start gap-3">
                        <img 
                          src={getAvatar(conv.contact)} 
                          alt="avatar" 
                          className="w-10 h-10 rounded-full object-cover border-2 border-border" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-card-foreground truncate">
                              {conv.contact?.name || 'Contato'}
                            </h4>
                            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                              {formatTimestamp(conv.updated_at || conv.created_at)}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground mt-2">
                            <div><strong>Contato:</strong> {formatPhone(conv.contact?.phone)}</div>
                            <div><strong>Atendente:</strong> {getAtendente(conv)}</div>
                            <div><strong>Grupo:</strong> {getEquipe(conv) || 'ATENDIMENTO'}</div>
                            <div><strong>Status:</strong> {getStatusText(conv.status)}</div>
                            <div><strong>Canal:</strong> {getChannelDisplayName(conv.inbox)}</div>
                          </div>
                        </div>
                      </div>
                      <button 
                        ref={el => (menuBtnRefs.current[conv.id] = el)}
                        className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-card-foreground"
                        onClick={e => handleMenuOpen(conv.id, e)}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                      {/* Menu contextual */}
                      {menuOpenId === conv.id && (
                        <div
                          className="bg-card border border-border rounded shadow-lg z-[9999] min-w-[160px] flex flex-col w-max fixed"
                          style={{ top: menuPosition.top, left: menuPosition.left }}
                        >
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleAbrir(conv); }}>
                            <MessageCircle className="w-4 h-4" /> <span>Abrir</span>
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleTransferir(conv); }}>
                            <User className="w-4 h-4 text-blue-500" /> <span>Transferir</span>
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleTransferirGrupo(conv); }}>
                            <Users className="w-4 h-4 text-blue-500" /> <span>Transferir Grupo</span>
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted text-red-600" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleEncerrar(conv); }}>
                            <X className="w-4 h-4" /> <span>Encerrar</span>
                      </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bloco 3: Em Atendimento */}
            <div className="bg-card rounded-lg shadow-md p-4 flex flex-col h-96">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Em Atendimento</h3>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-3">
                  {conversas.filter(isEmAtendimento).map((conv) => (
                    <div key={conv.id} className="bg-background rounded-lg p-3 relative">
                      <div className="flex items-start gap-3">
                        <img 
                          src={getAvatar(conv.contact)} 
                          alt="avatar" 
                          className="w-10 h-10 rounded-full object-cover border-2 border-border" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-card-foreground truncate">
                              {conv.contact?.name || 'Contato'}
                            </h4>
                            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                              {formatTimestamp(conv.updated_at || conv.created_at)}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground mt-2">
                            <div><strong>Contato:</strong> {formatPhone(conv.contact?.phone)}</div>
                            <div><strong>Atendente:</strong> {getAtendente(conv)}</div>
                            <div><strong>Grupo:</strong> {getEquipe(conv) || 'ATENDIMENTO'}</div>
                            <div><strong>Status:</strong> {getStatusText(conv.status)}</div>
                            <div><strong>Canal:</strong> {getChannelDisplayName(conv.inbox)}</div>
                          </div>
                        </div>
                      </div>
                      <button 
                        ref={el => (menuBtnRefs.current[conv.id] = el)}
                        className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-card-foreground"
                        onClick={e => handleMenuOpen(conv.id, e)}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                      {/* Menu contextual */}
                      {menuOpenId === conv.id && (
                        <div
                          className="bg-card border border-border rounded shadow-lg z-[9999] min-w-[160px] flex flex-col w-max fixed"
                          style={{ top: menuPosition.top, left: menuPosition.left }}
                        >
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleAbrir(conv); }}>
                            <MessageCircle className="w-4 h-4" /> <span>Abrir</span>
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleTransferir(conv); }}>
                            <User className="w-4 h-4 text-blue-500" /> <span>Transferir</span>
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleTransferirGrupo(conv); }}>
                            <Users className="w-4 h-4 text-blue-500" /> <span>Transferir Grupo</span>
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted text-red-600" onClick={(e) => { e.stopPropagation(); handleMenuClose(); handleEncerrar(conv); }}>
                            <X className="w-4 h-4" /> <span>Encerrar</span>
                      </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Modal de conversa detalhada */}
          <Dialog open={!!modalConversa} onOpenChange={v => !v && setModalConversa(null)}>
            <DialogContent className="max-w-none w-screen h-screen bg-background/95 border-none p-8 flex items-center justify-center">
              {/* Modal secundário com o conteúdo */}
              <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col">
                <style>{`
                  .messages-container::-webkit-scrollbar {
                    width: 14px;
                    background: transparent;
                  }
                  .messages-container::-webkit-scrollbar-track {
                    background: #e5e7eb;
                    border-radius: 8px;
                    margin: 4px;
                  }
                  .messages-container::-webkit-scrollbar-thumb {
                    background: #9ca3af;
                    border-radius: 8px;
                    border: 2px solid #e5e7eb;
                  }
                  .messages-container::-webkit-scrollbar-thumb:hover {
                    background: #6b7280;
                  }
                  .messages-container {
                    scrollbar-width: auto;
                    scrollbar-color: #9ca3af #e5e7eb;
                  }
                `}</style>
                
                {/* Header do modal secundário */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-card rounded-t-lg">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {modalConversa?.contact?.avatar ? (
                        <img 
                          src={modalConversa.contact.avatar} 
                          alt={modalConversa.contact.name || 'Cliente'}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm ${modalConversa?.contact?.avatar ? 'hidden' : 'flex'}`}
                      >
                        {(modalConversa?.contact?.name || modalConversa?.contact?.phone || 'U').charAt(0).toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-foreground">{modalConversa?.contact?.name || 'Contato'}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPhone(modalConversa?.contact?.phone)} • {getChannelDisplayName(modalConversa?.inbox)} • {getStatusText(modalConversa?.status)}
                      </div>
                      {/* # Debug logging removed for security Tempo de atendimento em aberto */}
                      <div className="text-xs text-white bg-gray-600 px-2 py-1 rounded-full mt-1 inline-block">
                        Atendimento há: {modalConversa?.created_at ? (() => {
                          const agora = new Date();
                          const inicio = new Date(modalConversa.created_at);
                          const diffMs = agora - inicio;
                          const diffMinutos = Math.floor(diffMs / (1000 * 60));
                          const diffHoras = Math.floor(diffMinutos / 60);
                          const diffDias = Math.floor(diffHoras / 24);
                          
                          if (diffDias > 0) {
                            return `${diffDias} dia${diffDias > 1 ? 's' : ''}`;
                          } else if (diffHoras > 0) {
                            return `${diffHoras}h ${diffMinutos % 60}min`;
                          } else {
                            return `${diffMinutos} min`;
                          }
                        })() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Área de mensagens com scroll */}
                <div 
                  className="messages-container flex-1 overflow-y-auto flex flex-col gap-3 p-4 bg-background rounded-b-lg"
                >
                {modalLoading ? (
                    <div className="text-muted-foreground text-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Carregando mensagens...
                    </div>
                ) : modalMensagens.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      Nenhuma mensagem nesta conversa.
                    </div>
                ) : (
                  <>
                      <div className="text-xs text-muted-foreground text-center py-2 border-b border-border mb-2">
                        {modalMensagens.length} mensagem{modalMensagens.length !== 1 ? 's' : ''} • Atualizações em tempo real ativas
                      </div>
                    {modalMensagens.map(renderMensagem)}
                    <div ref={mensagensEndRef} />
                  </>
                )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {/* Modal de transferência de atendimento */}
          <Dialog open={!!modalTransferir} onOpenChange={v => !v && setModalTransferir(null)}>
            <DialogContent className="max-w-md w-full">
              <DialogHeader>
                <DialogTitle>
                  Transferir Atendimento <span className="font-bold">{modalTransferir?.contact?.name}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="divide-y">
                {loadingUsuarios ? (
                  <div className="text-muted-foreground text-center py-8">Carregando usuários...</div>
                ) : usuariosTransferir.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">Nenhum usuário encontrado.</div>
                ) : (
                  usuariosTransferir.map(usuario => (
                    <button
                      key={usuario.id}
                      className="flex items-center w-full gap-4 py-3 px-2 hover:bg-muted transition"
                      onClick={() => transferirParaUsuario(usuario)}
                    >
                      <img
                        src={usuario.avatar || '/avatar-em-branco.png'}
                        alt={usuario.first_name}
                        className="w-12 h-12 rounded-full object-cover bg-muted"
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium text-card-foreground">{usuario.first_name} {usuario.last_name}</div>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${usuario.is_online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{usuario.is_online ? 'Online' : 'Offline'}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
          {/* Modal de transferência para equipe */}
          <Dialog open={!!modalTransferirEquipe} onOpenChange={v => !v && setModalTransferirEquipe(null)}>
            <DialogContent className="max-w-md w-full">
              <DialogHeader>
                <DialogTitle>
                  Transferir para Equipe <span className="font-bold">{modalTransferirEquipe?.contact?.name}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="divide-y">
                {loadingEquipes ? (
                  <div className="text-muted-foreground text-center py-8">Carregando equipes...</div>
                ) : equipesTransferir.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">Nenhuma equipe encontrada.</div>
                ) : (
                  equipesTransferir.map(equipe => (
                    <button
                      key={equipe.id}
                      className="flex items-center w-full gap-4 py-3 px-2 hover:bg-muted transition"
                      onClick={() => transferirParaEquipe(equipe)}
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-card-foreground">{equipe.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {equipe.members?.length || 0} membro(s)
                        </div>
                        {equipe.members && equipe.members.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {equipe.members.map(member => {
                              if (member.user) {
                                const firstName = member.user.first_name || '';
                                const lastName = member.user.last_name || '';
                                const username = member.user.username || '';
                                return `${firstName} ${lastName}`.trim() || username;
                              }
                              return 'Usuário não encontrado';
                            }).join(', ')}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

        </>
      )}
    </div>
  );
} 