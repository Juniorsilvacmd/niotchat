import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ConversationList from './components/ConversationList';
import ChatArea from './components/ChatArea';
import ConversationsPage from './components/ConversationsPage';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import CompanyManagement from './components/CompanyManagement';
import ConversasDashboard from './components/ConversasDashboard';
import Contacts from './components/Contacts2';
import SuperadminDashboard from './components/SuperadminDashboard';
import Login from './components/Login';
import Topbar from './components/Topbar';
import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
} from 'react-router-dom';
import AuditLog from './components/AuditLog';
import SuperadminSidebar from './components/SuperadminSidebar';
import ProviderAdminSidebar from './components/ProviderAdminSidebar';
import ProviderDataForm from './components/ProviderDataForm';
import ProviderScheduleForm from './components/ProviderScheduleForm';
import Integrations from './components/Integrations';
import ProfilePage from './components/ProfilePage';
import AppearancePage from './components/AppearancePage';
import TeamsPage from './components/TeamsPage';
import ConversationRecovery from './components/ConversationRecovery';
import { io } from 'socket.io-client';
import axios from 'axios';
import { AlertTriangle } from 'lucide-react';

// Configurar baseURL do axios para usar URLs absolutas do backend
axios.defaults.baseURL = 'http://localhost:8010';

// Interceptor global do Axios para adicionar o token do usuário logado
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Token ${token}`;
  }
  return config;
});

function ProvedorAppWrapper({ userRole, user, handleLogout, handleChangelog, handleNotifications, selectedConversation, setSelectedConversation, providerMenu, setProviderMenu, whatsappDisconnected, setWhatsappDisconnected }) {
  const { provedorId } = useParams();
  
  // Proteção de rotas baseada no papel do usuário
  const isAdminRoute = (path) => {
    const adminRoutes = ['users', 'equipes', 'audit', 'companies', 'integracoes', 'dados-provedor', 'horario-provedor'];
    return adminRoutes.some(route => path.includes(route));
  };
  
  // Se é atendente e está tentando acessar rota administrativa, redirecionar
  if (userRole === 'agent' && isAdminRoute(window.location.pathname)) {
    return <Navigate to={`/app/accounts/${provedorId}/conversations`} replace />;
  }
  
  // Estado para abrir/fechar o sidebar no mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fechar sidebar ao navegar (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [window.location.pathname]);
  
  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <Sidebar userRole={userRole} provedorId={provedorId} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Topbar onLogout={handleLogout} onChangelog={handleChangelog} onNotifications={handleNotifications} onMenuClick={() => setSidebarOpen(true)} />
        <Routes>
          <Route path="dashboard" element={<Dashboard provedorId={provedorId} />} />
          <Route path="conversas" element={<ConversasDashboard provedorId={provedorId} />} />
          <Route path="conversas-dashboard" element={<ConversasDashboard provedorId={provedorId} />} />
          <Route path="contacts" element={<Contacts provedorId={provedorId} />} />
          <Route path="conversations" element={
            <ConversationsPage 
              selectedConversation={selectedConversation}
              setSelectedConversation={setSelectedConversation}
              provedorId={provedorId}
            />
          } />
          <Route path="reports" element={<Dashboard provedorId={provedorId} />} />
          <Route path="settings" element={<Settings provedorId={provedorId} />} />
          <Route path="users" element={<UserManagement provedorId={provedorId} />} />
          <Route path="equipes" element={<TeamsPage />} />
          <Route path="audit" element={<AuditLog provedorId={provedorId} />} />
          <Route path="recovery" element={<ConversationRecovery provedorId={provedorId} />} />
          <Route path="companies" element={<CompanyManagement provedorId={provedorId} />} />
          <Route path="integracoes" element={<Integrations provedorId={provedorId} />} />
          <Route path="perfil" element={<ProfilePage provedorId={provedorId} />} />
          <Route path="aparencia" element={<AppearancePage provedorId={provedorId} />} />
          <Route path="dados-provedor" element={<ProviderDataForm provedorId={provedorId} />} />
          <Route path="horario-provedor" element={<ProviderScheduleForm provedorId={provedorId} />} />
          <Route path="atendimento-provedor" element={<div>Em breve: Atendimento Provedor</div>} />
          <Route path="*" element={<Navigate to={`dashboard`} replace />} />
        </Routes>
      </div>
    </div>
  );
}

function SafeRedirect({ user }) {
  const location = useLocation();
  if (user && user.user_type === 'superadmin') {
    return <Navigate to="/superadmin" replace />;
  }
  if (
    location.pathname.includes('/app/accounts/') &&
    location.pathname.split('/').filter(x => x === 'dashboard').length > 1
  ) {
    return <Navigate to={`/app/accounts/${user.provedor_id}/dashboard`} replace />;
  }
  
  // Redirecionamento inteligente baseado no tipo de usuário
  if (user && user.provedor_id) {
    if (user.user_type === 'agent') {
      // Atendentes vão para o painel de atendimento
      return <Navigate to={`/app/accounts/${user.provedor_id}/conversations`} replace />;
    } else {
      // Admins vão para o dashboard
      return <Navigate to={`/app/accounts/${user.provedor_id}/dashboard`} replace />;
    }
  }
  
  return <Navigate to={user && user.provedor_id ? `/app/accounts/${user.provedor_id}/dashboard` : '/'} replace />;
}

function App() {
  const [selectedConversation, setSelectedConversation] = useState(() => {
    // Recuperar conversa selecionada do localStorage
    const savedConversation = localStorage.getItem('selectedConversation');
    return savedConversation ? JSON.parse(savedConversation) : null;
  });

  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('superadmin');
  const [authLoading, setAuthLoading] = useState(true);
  const [providerMenu, setProviderMenu] = useState('dados');
  const [whatsappDisconnected, setWhatsappDisconnected] = useState(false);
  const [provedorId, setProvedorId] = useState(null);
  const lastStatusRef = useRef(null);

  // Debug: Log do estado do usuário
  useEffect(() => {
    console.log('App - Estado atual:', { user, userRole, authLoading, provedorId });
  }, [user, userRole, authLoading, provedorId]);

  // Salvar conversa selecionada no localStorage quando mudar
  useEffect(() => {
    if (selectedConversation) {
      localStorage.setItem('selectedConversation', JSON.stringify(selectedConversation));
    } else {
      localStorage.removeItem('selectedConversation');
    }
  }, [selectedConversation]);

  // Buscar provedorId do usuário logado
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        if (userObj.provedor_id) setProvedorId(userObj.provedor_id);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      axios.get('/api/auth/me/', {
        headers: { Authorization: `Token ${token}` }
      })
        .then(res => {
          if (res.status !== 200) throw new Error('Token inválido');
          return res.data;
        })
        .then(userData => {
          console.log('Dados do usuário recebidos:', userData);
          setUser({ ...userData, token });
          const tipo = userData.role || userData.user_type;
          setUserRole(tipo);
          setAuthLoading(false);
          
          // Conectar ao WebSocket do usuário para status online/offline
          if (userData.id) {
            const wsUrl = `ws://${window.location.hostname}:8010/ws/user/${userData.id}/`;
            const userWs = new WebSocket(wsUrl);
            
            // Enviar status online ao conectar
            userWs.onopen = () => {
              userWs.send(JSON.stringify({
                type: 'status_update',
                is_online: true
              }));
            };
            
            // Enviar ping a cada 30 segundos para manter conexão
            const pingInterval = setInterval(() => {
              if (userWs.readyState === WebSocket.OPEN) {
                userWs.send(JSON.stringify({ type: 'ping' }));
              }
            }, 30000);
            
            // Limpar interval ao desmontar
            return () => {
              clearInterval(pingInterval);
              if (userWs.readyState === WebSocket.OPEN) {
                userWs.close();
              }
            };
          }
        })
        .catch((error) => {
          console.error('Erro ao buscar usuário:', error);
          localStorage.removeItem('token');
          setUser(null);
          setUserRole(null);
          setAuthLoading(false);
        });
    } else {
      setAuthLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Integração WebSocket Evolution
    const evoInstance = localStorage.getItem('evoInstance');
    if (!evoInstance) return;
    const socket = io(`wss://evo.niochat.com.br/${evoInstance}`, {
      transports: ['websocket'],
    });
    socket.on('connect', () => {
      console.log('Conectado ao Evolution WebSocket');
    });
    socket.onAny((event, data) => {
      console.log('Evento Evolution:', event, data);
    });
    socket.on('disconnect', () => {
      console.log('Desconectado do Evolution WebSocket');
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  // Listener para atualização de conversas
  useEffect(() => {
    const handleConversationUpdate = (event) => {
      const { conversationId, conversation } = event.detail;
      if (selectedConversation && selectedConversation.id === conversationId) {
        setSelectedConversation(conversation);
      }
    };

    window.addEventListener('conversationUpdated', handleConversationUpdate);
    return () => {
      window.removeEventListener('conversationUpdated', handleConversationUpdate);
    };
  }, [selectedConversation]);

  const handleLogin = (userData) => {
    console.log('Login realizado:', userData);
    setUser(userData);
    const tipo = userData.role || userData.user_type;
    setUserRole(tipo);
    
    // Conectar ao WebSocket do usuário para status online/offline
    if (userData.id) {
      const wsUrl = `ws://${window.location.hostname}:8010/ws/user/${userData.id}/`;
      const userWs = new WebSocket(wsUrl);
      
      // Enviar status online ao conectar
      userWs.onopen = () => {
        userWs.send(JSON.stringify({
          type: 'status_update',
          is_online: true
        }));
      };
      
      // Enviar ping a cada 30 segundos para manter conexão
      const pingInterval = setInterval(() => {
        if (userWs.readyState === WebSocket.OPEN) {
          userWs.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
      
      // Limpar interval ao desmontar
      return () => {
        clearInterval(pingInterval);
        if (userWs.readyState === WebSocket.OPEN) {
          userWs.close();
        }
      };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setUserRole(null);
    window.location.href = '/login';
  };

  const handleChangelog = () => {
    alert('Changelog em breve!');
  };

  const handleNotifications = () => {
    alert('Notificações em breve!');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      </Router>
    );
  }

  const SuperadminRoute = ({ children }) => {
    if (userRole !== 'superadmin') {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  // Debug: Renderização com fallback
  try {
    return (
      <>
        {/* Modal de alerta WhatsApp desconectado */}
        {whatsappDisconnected && (
          <div className="fixed inset-0 bg-white/95 flex items-center justify-center z-50">
            <div className="w-full max-w-md text-center relative flex flex-col items-center p-10 rounded-xl">
              <button onClick={() => setWhatsappDisconnected(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition text-2xl text-gray-400" title="Fechar">
                ×
              </button>
              <div className="flex flex-col items-center mb-4">
                <div className="bg-red-100 rounded-full p-4 mb-2">
                  <AlertTriangle className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-2">WhatsApp desconectado</h3>
                <p className="text-gray-700 mb-6">Conecte-se novamente para que os resultados não sejam afetados.</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow transition w-full"
              >
                RECONECTAR-SE
              </button>
            </div>
          </div>
        )}
        <Router>
          <Routes>
            <Route path="/superadmin/*" element={
              <SuperadminRoute>
                <div className="h-screen bg-background text-foreground flex overflow-hidden">
                  <SuperadminSidebar onLogout={handleLogout} />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Topbar onLogout={handleLogout} onChangelog={handleChangelog} onNotifications={handleNotifications} />
                    <SuperadminDashboard onLogout={handleLogout} />
                  </div>
                </div>
              </SuperadminRoute>
            } />
            {/* Rotas multi-tenant para provedores */}
            <Route path="/app/accounts/:provedorId/*" element={
              <ProvedorAppWrapper
                userRole={userRole}
                user={user}
                handleLogout={handleLogout}
                handleChangelog={handleChangelog}
                handleNotifications={handleNotifications}
                selectedConversation={selectedConversation}
                setSelectedConversation={setSelectedConversation}
                providerMenu={providerMenu}
                setProviderMenu={setProviderMenu}
                whatsappDisconnected={whatsappDisconnected}
                setWhatsappDisconnected={setWhatsappDisconnected}
              />
            } />
            {/* Redirecionamento padrão para login ou dashboard */}
            <Route path="*" element={<SafeRedirect user={user} />} />
          </Routes>
        </Router>
      </>
    );
  } catch (error) {
    console.error('Erro na renderização:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro na Aplicação</h1>
          <p className="text-red-500 mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }
}

export default App;

