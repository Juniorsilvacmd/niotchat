import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart2, MessageCircle, Eye, Users, Database, Megaphone, User, LogOut, Wifi, Settings } from 'lucide-react';

const menu = [
  { key: 'dashboard', label: 'Dashboard', icon: <BarChart2 size={20} /> },
  { key: 'provedores', label: 'Provedores', icon: <Wifi size={20} /> },
  { key: 'canais', label: 'Canais', icon: <MessageCircle size={20} /> },
  { key: 'auditoria', label: 'Auditoria', icon: <Eye size={20} /> },
  { key: 'usuarios-sistema', label: 'Usuários do Sistema', icon: <Users size={20} /> },
  { key: 'configuracoes', label: 'Configurações do Sistema', icon: <Settings size={20} /> },
  { key: 'mensagem', label: 'Enviar Mensagem', icon: <Megaphone size={20} /> },
  { key: 'painel-empresa', label: 'Meu Painel de Empresa', icon: <User size={20} /> },
];

export default function SuperadminSidebar({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname.replace('/superadmin/', '');
  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground h-full flex flex-col border-r border-sidebar-border">
      <div className="p-6 text-2xl font-bold text-sidebar-primary">Superadmin</div>
      <nav className="flex-1">
        {menu.map(item => (
          <button
            key={item.key}
            className={`w-full flex items-center px-6 py-3 text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${current === item.key ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' : ''}`}
            onClick={() => navigate(`/superadmin/${item.key}`)}
          >
            <span className="mr-3">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
} 