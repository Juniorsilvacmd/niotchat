import React, { useEffect, useRef, useState } from 'react';
import { useParams, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './components/Dashboard';
import DashboardPrincipal from './components/DashboardPrincipal';
import ConversasDashboard from './components/ConversasDashboard';
import Contacts from './components/Contacts2';
import ConversationList from './components/ConversationList';
import ChatArea from './components/ChatArea';
import ConversationsPage from './components/ConversationsPage';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import TeamsPage from './components/TeamsPage';
import AuditLog from './components/AuditLog';
import ConversationRecovery from './components/ConversationRecovery';
import CompanyManagement from './components/CompanyManagement';
import Integrations from './components/Integrations';
import ProfilePage from './components/ProfilePage';
import AppearancePage from './components/AppearancePage';
import ProviderDataForm from './components/ProviderDataForm';
import ProviderScheduleForm from './components/ProviderScheduleForm';
import ChatGPTTest from './components/ChatGPTTest';

export default function ProvedorAppWrapper(props) {
  const { provedorId } = useParams();
  const location = useLocation();
  const lastStatusRef = useRef(null);
  const { setWhatsappDisconnected, userRole, user, handleLogout, handleChangelog, handleNotifications, selectedConversation, setSelectedConversation, providerMenu, setProviderMenu } = props;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Resetar conversa selecionada ao trocar de rota
  useEffect(() => {
    setSelectedConversation(null);
  }, [location.pathname]);

  useEffect(() => { setSidebarOpen(false); }, [window.location.pathname]);

  useEffect(() => {
    if (!provedorId) return;
    let interval;
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/canais/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        const data = await res.json();
        const whatsappBeta = (data.results || data).find(c => c.tipo === 'whatsapp_beta' && c.dados_extras?.instance_id);
        if (whatsappBeta) {
          const statusRes = await fetch(`/api/canais/${whatsappBeta.id}/whatsapp-beta-status/`, {
            method: 'POST',
            headers: { 'Authorization': `Token ${token}` }
          });
          const statusData = await statusRes.json();
          if (statusData.status === 'connected' && statusData.loggedIn) {
            lastStatusRef.current = 'connected';
          }
          if (
            (lastStatusRef.current === 'connected' && (statusData.status === 'disconnected' || !statusData.loggedIn)) ||
            (lastStatusRef.current === null && (statusData.status === 'disconnected' || !statusData.loggedIn))
          ) {
            setWhatsappDisconnected(true);
            lastStatusRef.current = 'disconnected';
          }
        }
      } catch (e) {
        // Se der erro, não faz nada
      }
    };
    fetchStatus();
    interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [provedorId, setWhatsappDisconnected]);

  // Proteção de rotas baseada no papel do usuário
  const isAdminRoute = (path) => {
    const adminRoutes = ['users', 'equipes', 'audit', 'companies', 'integracoes', 'dados-provedor', 'horario-provedor', 'chatgpt-test'];
    return adminRoutes.some(route => path.includes(route));
  };
  if (userRole === 'agent' && isAdminRoute(window.location.pathname)) {
    return <Navigate to={`/app/accounts/${provedorId}/conversations`} replace />;
  }

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <Sidebar userRole={userRole} provedorId={provedorId} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Topbar onLogout={handleLogout} onChangelog={handleChangelog} onNotifications={handleNotifications} onMenuClick={() => setSidebarOpen(true)} />
        <Routes>
                      <Route path="dashboard" element={<DashboardPrincipal provedorId={provedorId} />} />
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
          <Route path="reports" element={<DashboardPrincipal provedorId={provedorId} />} />
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
          <Route path="chatgpt-test" element={<ChatGPTTest provedorId={provedorId} />} />
          <Route path="atendimento-provedor" element={<div>Em breve: Atendimento Provedor</div>} />
          <Route path="*" element={<Navigate to={`dashboard`} replace />} />
        </Routes>
      </div>
    </div>
  );
} 