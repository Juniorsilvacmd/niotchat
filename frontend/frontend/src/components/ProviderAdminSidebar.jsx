import React from 'react';
import { Home, Settings, Clock, User, ChevronDown } from 'lucide-react';

export default function ProviderAdminSidebar({ selected, onSelect }) {
  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground h-full flex flex-col border-r border-sidebar-border">
      <div className="p-6 text-2xl font-bold tracking-tight">Painel do Provedor</div>
      <nav className="flex-1">
        <ul className="space-y-2 px-4">
          <li>
            <button
              className={`flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${selected === 'dados' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
              onClick={() => onSelect('dados')}
            >
              <Settings className="w-5 h-5" /> Dados do Provedor
            </button>
          </li>
          <li>
            <button
              className={`flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${selected === 'horario' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
              onClick={() => onSelect('horario')}
            >
              <Clock className="w-5 h-5" /> Horário
            </button>
          </li>
          <li>
            <button
              className={`flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${selected === 'atendimento' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}`}
              onClick={() => onSelect('atendimento')}
            >
              <User className="w-5 h-5" /> Atendimento
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
} 