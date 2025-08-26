import React, { useEffect, useState } from 'react';
import { ClipboardList, LogOut, Sun, Moon, Menu, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InternalChatButton from './InternalChatButton';
import NotificationBell from './NotificationBell';

export default function Topbar({ onLogout, onChangelog, onNotifications, onMenuClick }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="w-full flex items-center justify-end bg-sidebar px-6 py-2 border-b border-border gap-4 relative">
      {/* Botão de menu só no mobile */}
      {isMobile && (
        <button
          className="absolute left-2 p-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
          title="Abrir menu"
          onClick={onMenuClick}
        >
          <Menu className="w-6 h-6" />
        </button>
      )}
      <button
        className="p-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        title="Alternar tema"
        onClick={toggleTheme}
      >
        {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>
      
      {/* Botão do Chat Interno */}
      <InternalChatButton />
      
      <button
        className="p-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        title="Changelog"
        onClick={onChangelog}
      >
        <ClipboardList className="w-5 h-5" />
      </button>
      {/* Sistema de Notificações do Superadmin */}
      <NotificationBell />
      <button
        className="p-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        title="Sair"
        onClick={onLogout}
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
} 