import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { 
  MessageCircle, 
  Users, 
  Shield, 
  Settings, 
  Crown,
  LayoutGrid,
  Clock,
  User,
  Plug,
  MessageSquarePlus, // Novo ícone para Conversas
  UserCheck, // Ícone para Usuários
  Users2, // Ícone para Equipes
  BookOpen, // Ícone para Contatos (substituindo AddressBook)
  Headphones, // Ícone para Atendimento
  RefreshCw // Ícone para Recuperador
} from 'lucide-react';
import logo from '../assets/logo.png';

const Sidebar = ({ userRole = 'agent', mobileOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { provedorId } = useParams();
  const currentPath = location.pathname;

  // Menu base com todos os itens
  const allMenuItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard', path: `/app/accounts/${provedorId}/dashboard` },
    { id: 'conversations', icon: Headphones, label: 'Atendimento', path: `/app/accounts/${provedorId}/conversations` },
    { id: 'conversas', icon: MessageSquarePlus, label: 'Conversas', path: `/app/accounts/${provedorId}/conversas` },
    { id: 'contacts', icon: BookOpen, label: 'Contatos', path: `/app/accounts/${provedorId}/contacts` },
    { id: 'users', icon: UserCheck, label: 'Usuários', path: `/app/accounts/${provedorId}/users` },
    { id: 'teams', icon: Users2, label: 'Equipes', path: `/app/accounts/${provedorId}/equipes` },
    { id: 'audit', icon: Shield, label: 'Auditoria', path: `/app/accounts/${provedorId}/audit` },
  ];

  // Filtrar itens baseado no papel do usuário
  let menuItems = [];
  if (userRole === 'superadmin') {
    menuItems = [
      { id: 'superadmin-dashboard', icon: Crown, label: 'Dashboard Superadmin', path: '/superadmin' },
      ...allMenuItems
    ];
  } else if (userRole === 'admin') {
    // Admins veem todos os itens
    menuItems = allMenuItems;
  } else if (userRole === 'agent') {
    // Atendentes veem apenas itens relacionados ao atendimento
    menuItems = [
      { id: 'conversations', icon: Headphones, label: 'Atendimento', path: `/app/accounts/${provedorId}/conversations` },
      { id: 'contacts', icon: BookOpen, label: 'Contatos', path: `/app/accounts/${provedorId}/contacts` },
    ];
  } else {
    // Fallback: mostra todos os itens
    menuItems = allMenuItems;
  }

  // Itens fixos - filtrar baseado no papel
  const allFixedItems = [
    { id: 'horario', icon: Clock, label: 'Horário', path: `/app/accounts/${provedorId}/horario-provedor` },
    { id: 'integracoes', icon: Plug, label: 'Integrações', path: `/app/accounts/${provedorId}/integracoes` },
    { id: 'dados-provedor', icon: Settings, label: 'Dados do Provedor', path: `/app/accounts/${provedorId}/dados-provedor` },
    { id: 'recovery', icon: RefreshCw, label: 'Recuperador de conversas', path: `/app/accounts/${provedorId}/recovery`, beta: true },
    { id: 'perfil', icon: User, label: 'Perfil', path: `/app/accounts/${provedorId}/perfil` },
  ];

  let fixedItems = [];
  if (userRole === 'agent') {
    // Atendentes veem apenas perfil
    fixedItems = [
      { id: 'perfil', icon: User, label: 'Perfil', path: `/app/accounts/${provedorId}/perfil` },
    ];
  } else {
    // Admins e superadmins veem todos os itens fixos
    fixedItems = allFixedItems;
  }

  // Detectar se está em mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Overlay para mobile
  if (isMobile) {
    return (
      <>
        <div
          className={`fixed inset-0 z-40 bg-black bg-opacity-40 transition-opacity ${mobileOpen ? 'block' : 'hidden'}`}
          onClick={onClose}
        />
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shadow-lg transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="p-4 flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg" />
            <div className="text-xl font-bold tracking-tight">Nio Chat</div>
            <button className="ml-auto p-2" onClick={onClose} aria-label="Fechar menu">
              <span style={{fontSize: 24, fontWeight: 'bold'}}>&times;</span>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto">
            <ul className="space-y-2 px-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => { navigate(item.path); onClose && onClose(); }}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.beta && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-500 text-white rounded-full">
                          BETA
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {fixedItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => { navigate(item.path); onClose && onClose(); }}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.beta && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-500 text-white rounded-full">
                          BETA
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      </>
    );
  }

  // Desktop: sidebar fixo
  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground h-full flex flex-col border-r border-sidebar-border">
      <div className="p-4 flex items-center gap-3">
        <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg" />
        <div className="text-xl font-bold tracking-tight">Nio Chat</div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-2 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.beta && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-500 text-white rounded-full">
                      BETA
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {fixedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.beta && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-500 text-white rounded-full">
                      BETA
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;

