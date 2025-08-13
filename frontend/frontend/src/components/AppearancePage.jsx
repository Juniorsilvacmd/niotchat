import React, { useState } from 'react';
import { Palette } from 'lucide-react';

export default function AppearancePage() {
  const [settings, setSettings] = useState({
    appearance: {
      theme: 'dark',
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo'
    }
  });

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Palette className="w-8 h-8 text-muted-foreground" /> Aparência
        </h1>
        <div className="niochat-card p-6">
          <h3 className="text-lg font-medium text-card-foreground mb-4">
            Aparência e Localização
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Tema
              </label>
              <select
                value={settings.appearance.theme}
                onChange={(e) => setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, theme: e.target.value }
                })}
                className="niochat-input"
              >
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
                <option value="auto">Automático</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Idioma
              </label>
              <select
                value={settings.appearance.language}
                onChange={(e) => setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, language: e.target.value }
                })}
                className="niochat-input"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Fuso Horário
              </label>
              <select
                value={settings.appearance.timezone}
                onChange={(e) => setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, timezone: e.target.value }
                })}
                className="niochat-input"
              >
                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                <option value="America/New_York">New York (GMT-5)</option>
                <option value="Europe/London">London (GMT+0)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 