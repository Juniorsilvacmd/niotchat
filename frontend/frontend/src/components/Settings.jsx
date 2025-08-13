import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState({
    profile: {
      name: 'Administrador',
      email: 'admin@niochat.com',
      phone: '+55 11 99999-9999',
      avatar: null
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      soundNotifications: false,
      desktopNotifications: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90
    },
    appearance: {
      theme: 'dark',
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo'
    }
  });

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'appearance', label: 'Aparência', icon: Palette }
    // Integrações removido daqui
  ];

  const handleSave = () => {
    // Aqui você salvaria as configurações no backend
    console.log('Saving settings:', settings);
  };

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-card-foreground mb-4">
          Informações Pessoais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={settings.profile.name}
              onChange={(e) => setSettings({
                ...settings,
                profile: { ...settings.profile, name: e.target.value }
              })}
              className="niochat-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              E-mail
            </label>
            <input
              type="email"
              value={settings.profile.email}
              onChange={(e) => setSettings({
                ...settings,
                profile: { ...settings.profile, email: e.target.value }
              })}
              className="niochat-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Telefone
            </label>
            <input
              type="tel"
              value={settings.profile.phone}
              onChange={(e) => setSettings({
                ...settings,
                profile: { ...settings.profile, phone: e.target.value }
              })}
              className="niochat-input"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-card-foreground mb-4">
          Alterar Senha
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Senha Atual
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="niochat-input pr-10"
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Nova Senha
            </label>
            <input
              type="password"
              className="niochat-input"
              placeholder="Digite sua nova senha"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-card-foreground mb-4">
        Preferências de Notificação
      </h3>
      <div className="space-y-4">
        {Object.entries(settings.notifications).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <h4 className="font-medium text-card-foreground">
                {key === 'emailNotifications' && 'Notificações por E-mail'}
                {key === 'pushNotifications' && 'Notificações Push'}
                {key === 'soundNotifications' && 'Notificações Sonoras'}
                {key === 'desktopNotifications' && 'Notificações Desktop'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {key === 'emailNotifications' && 'Receber notificações por e-mail'}
                {key === 'pushNotifications' && 'Receber notificações push no dispositivo'}
                {key === 'soundNotifications' && 'Reproduzir som para notificações'}
                {key === 'desktopNotifications' && 'Mostrar notificações na área de trabalho'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, [key]: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-card-foreground mb-4">
        Configurações de Segurança
      </h3>
      <div className="space-y-4">
        <div className="p-4 border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-card-foreground">Autenticação de Dois Fatores</h4>
              <p className="text-sm text-muted-foreground">
                Adicione uma camada extra de segurança à sua conta
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security.twoFactorAuth}
                onChange={(e) => setSettings({
                  ...settings,
                  security: { ...settings.security, twoFactorAuth: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Timeout da Sessão (minutos)
            </label>
            <select
              value={settings.security.sessionTimeout}
              onChange={(e) => setSettings({
                ...settings,
                security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
              })}
              className="niochat-input"
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Expiração da Senha (dias)
            </label>
            <select
              value={settings.security.passwordExpiry}
              onChange={(e) => setSettings({
                ...settings,
                security: { ...settings.security, passwordExpiry: parseInt(e.target.value) }
              })}
              className="niochat-input"
            >
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
              <option value={180}>180 dias</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
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
  );

  const renderIntegrationsSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-card-foreground mb-4">
        Integrações Disponíveis
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: 'Telegram', status: 'connected', color: 'bg-blue-500' },
          { name: 'WhatsApp', status: 'disconnected', color: 'bg-green-500' },
          { name: 'E-mail', status: 'connected', color: 'bg-red-500' },
          { name: 'Chat Web', status: 'connected', color: 'bg-purple-500' }
        ].map((integration) => (
          <div key={integration.name} className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${integration.color} rounded-lg flex items-center justify-center`}>
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-card-foreground">{integration.name}</h4>
                  <p className={`text-sm ${
                    integration.status === 'connected' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {integration.status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </p>
                </div>
              </div>
              <button className="niochat-button niochat-button-primary px-4 py-2">
                {integration.status === 'connected' ? 'Configurar' : 'Conectar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'appearance':
        return renderAppearanceSettings();
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            <SettingsIcon className="w-8 h-8 mr-3" />
            Configurações
          </h1>
          <p className="text-muted-foreground">Gerencie suas preferências e configurações do sistema</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="niochat-card p-6">
              {renderTabContent()}
              
              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-border">
                <button
                  onClick={handleSave}
                  className="niochat-button niochat-button-primary px-6 py-2 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

