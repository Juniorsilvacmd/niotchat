import React from 'react';
import { Building, Users, Settings, Eye, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MODELS = [
  { key: 'empresas', label: 'Empresas', icon: <Building className="w-6 h-6" /> },
  { key: 'usuarios-sistema', label: 'Usuários', icon: <Users className="w-6 h-6" /> },
  { key: 'auditoria', label: 'Auditoria', icon: <Eye className="w-6 h-6" /> },
  // Adicione outros modelos importantes aqui
];

export default function SuperadminAdminPanel() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 p-8 bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Database className="w-8 h-8" /> Admin do Sistema
        </h1>
        <p className="mb-8 text-muted-foreground">Gerencie todos os dados do sistema como no Django Admin, de forma moderna e centralizada.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MODELS.map(model => (
            <button
              key={model.key}
              onClick={() => navigate(`/superadmin/${model.key}`)}
              className="flex items-center gap-4 p-6 bg-card rounded-lg shadow hover:bg-primary/10 transition border border-border"
            >
              {model.icon}
              <span className="text-lg font-semibold text-foreground">{model.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 