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

  // Buscar mensagens ao abrir o modal
  useEffect(() => {
    if (modalConversa && modalConversa.id) {
      setModalLoading(true);
      const token = localStorage.getItem('token');
      axios.get(`/api/conversations/${modalConversa.id}/messages/`, {
        headers: { Authorization: `Token ${token}` }
      })
        .then(res => {
          setModalMensagens(res.data.results || res.data);
        })
        .catch(() => setModalMensagens([]))
        .finally(() => setModalLoading(false));
    } else {
      setModalMensagens([]);
    }
  }, [modalConversa]);

  // WebSocket para mensagens em tempo real no modal
  useEffect(() => {
    if (modalConversa && modalConversa.id) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `ws://${window.location.hostname}:8010/ws/conversations/${modalConversa.id}/`;
      const ws = new window.WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.message) {
            setModalMensagens(prev => [...prev, data.message]);
          }
        } catch (e) { /* ignore */ }
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
    if (!window.confirm('Tem certeza que deseja encerrar e remover este atendimento?')) return;
    try {
      const response = await axios.delete(`/api/conversations/${conversa.id}/`, {
        headers: { Authorization: `Token ${token}` }
      });
      console.log('Resposta do delete:', response.status);
      setConversas(prev => prev.filter(c => c.id !== conversa.id));
      alert('Atendimento encerrado e removido com sucesso!');
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
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Token ${token}` } : {};
        const res = await axios.get('/api/conversations/', { headers });
        const conversasData = res.data.results || res.data;
        setConversas(conversasData);
        console.log('Conversas carregadas da API:', conversasData); // LOG PARA DEPURAÇÃO
        // Nova lógica de contagem
        let ia = 0, fila = 0, atendimento = 0;
        conversasData.forEach(conv => {
          // Com a IA: status 'snoozed' ou assignee nulo/IA
          if (conv.status === 'snoozed' || !conv.assignee || (conv.assignee && (conv.assignee.first_name?.toLowerCase().includes('ia') || conv.assignee.username?.toLowerCase().includes('ia')))) {
            ia++;
          } else if (conv.status === 'pending') {
            fila++;
          } else if (conv.status === 'open') {
            atendimento++;
          }
        });
        setCounts({ ia, fila, atendimento });
      } catch (e) {
        setCounts({ ia: 0, fila: 0, atendimento: 0 });
        setConversas([]);
      }
      setLoading(false);
    }
    fetchCounts();
    // Após o carregamento inicial, não chamar mais fetchCounts nem sobrescrever o estado

    // --- WEBSOCKET ---
    let ws;
    function setupWebSocket() {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `ws://${window.location.hostname}:8010/ws/conversas_dashboard/`;
      ws = new window.WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket evento:', data); // LOG PARA DEPURAÇÃO
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
    // ---

    return () => {
      if (ws) ws.close();
    };
  }, []);

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
    if (!conversa.assignee) return 'IA';
    return conversa.assignee.first_name || conversa.assignee.username || 'Atendente';
  }

  // Função para pegar equipe
  function getEquipe(conversa) {
    return conversa.team?.name || '';
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

  // Funções de filtro exclusivas
  function isComIA(conv) {
    return conv.status === 'snoozed' && (!conv.assignee || (conv.assignee && (conv.assignee.first_name?.toLowerCase().includes('ia') || conv.assignee.username?.toLowerCase().includes('ia'))));
  }
  function isEmEspera(conv) {
    return conv.status === 'pending';
  }
  function isEmAtendimento(conv) {
    return conv.status === 'open' && conv.assignee && !(conv.assignee.first_name?.toLowerCase().includes('ia') || conv.assignee.username?.toLowerCase().includes('ia'));
  }


  // Renderização dos balões de mensagem
  function renderMensagem(msg) {
    const isBot = msg.sender_type === 'bot' || msg.sender === 'bot';
    const isAtendente = msg.sender_type === 'agent' || msg.sender === 'atendente' || msg.sender === 'agent';
    const isCliente = !isBot && !isAtendente;
    const align = isCliente ? 'justify-start' : 'justify-end';
    const bg = isBot ? 'bg-green-100 dark:bg-green-900' : isAtendente ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground';
    const icon = isBot ? <Bot className="w-4 h-4 text-green-500" /> : isAtendente ? <User className="w-4 h-4 text-blue-500" /> : <User className="w-4 h-4 text-muted-foreground" />;
    return (
      <div key={msg.id} className={`flex ${align} mb-2`}>
        {isCliente && <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mr-2">{icon}</div>}
                      <div className={`max-w-fit ${isAtendente || isBot ? 'order-2' : 'order-1'}`}>
          <div className={`px-4 py-2 rounded-lg ${bg}`}>
            {msg.content_type === 'audio' && msg.audio_url ? (
              <audio controls src={msg.audio_url} className="w-full">
                Seu navegador não suporta áudio.
              </audio>
            ) : (
              <p className="text-sm whitespace-pre-line">{msg.content}</p>
            )}
          </div>
          <div className={`flex items-center mt-1 space-x-1 text-xs text-muted-foreground ${isAtendente || isBot ? 'justify-end' : 'justify-start'}`}>
            <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          </div>
        </div>
        {(isAtendente || isBot) && <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center ml-2">{icon}</div>}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Conversas</h1>
      
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
                        <div><strong>Canal:</strong> {conv.inbox?.name || 'Canal'}</div>
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
                      <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={() => handleAbrir(conv)}>
                        <MessageCircle className="w-4 h-4" /> <span>Abrir</span>
                      </button>
                      <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={() => handleTransferir(conv)}>
                        <User className="w-4 h-4 text-blue-500" /> <span>Transferir</span>
                      </button>
                      <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={() => handleTransferirGrupo(conv)}>
                        <Users className="w-4 h-4 text-blue-500" /> <span>Transferir Grupo</span>
                      </button>
                      <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted text-red-600" onClick={() => handleEncerrar(conv)}>
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
                        <div><strong>Canal:</strong> {conv.inbox?.name || 'Canal'}</div>
                      </div>
                    </div>
                  </div>
                  <button className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-card-foreground">
                    <MoreVertical className="w-3 h-3" />
                  </button>
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
                        <div><strong>Canal:</strong> {conv.inbox?.name || 'Canal'}</div>
                      </div>
                    </div>
                  </div>
                  <button className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-card-foreground">
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Modal de conversa detalhada */}
      <Dialog open={!!modalConversa} onOpenChange={v => !v && setModalConversa(null)}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>
              {modalConversa?.contact?.name || 'Contato'}
            </DialogTitle>
            {/* Aqui pode adicionar status, canal, etc */}
          </DialogHeader>
          <div className="min-h-[300px] max-h-[60vh] overflow-y-auto flex flex-col gap-2">
            {modalLoading ? (
              <div className="text-muted-foreground text-center py-8">Carregando mensagens...</div>
            ) : modalMensagens.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">Nenhuma mensagem nesta conversa.</div>
            ) : (
              <>
                {modalMensagens.map(renderMensagem)}
                <div ref={mensagensEndRef} />
              </>
            )}
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
    </div>
  );
} 