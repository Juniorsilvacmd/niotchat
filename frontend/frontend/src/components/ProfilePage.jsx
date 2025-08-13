import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, Volume2, Save, Key } from 'lucide-react';
import axios from 'axios';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);
  const [settings, setSettings] = useState({
    profile: {
      name: '',
      email: '',
      phone: '',
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
      sessionTimeout: 30
    }
  });

  // Buscar dados do usuário
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/auth/me/', {
          headers: { Authorization: `Token ${token}` }
        });
        
        const user = response.data;
        setUserData(user);
        setSettings({
          ...settings,
          profile: {
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
            email: user.email || '',
            phone: user.phone || '',
            avatar: user.avatar
          }
        });
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const [firstName, ...lastNameParts] = settings.profile.name.split(' ');
      const lastName = lastNameParts.join(' ') || '';
      
              await axios.patch('/api/auth/me/', {
        first_name: firstName,
        last_name: lastName,
        email: settings.profile.email,
        phone: settings.profile.phone
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      setMessage('Perfil atualizado com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setMessage('Erro ao atualizar perfil. Tente novamente.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const newPassword = prompt('Digite sua nova senha:');
    if (!newPassword) return;
    
    const confirmPassword = prompt('Confirme sua nova senha:');
    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/reset-password/', {
        new_password: newPassword
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      setMessage('Senha alterada com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setMessage('Erro ao alterar senha. Tente novamente.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield }
  ];

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-card-foreground">
          Informações Pessoais
        </h3>
        <button
          onClick={handleSaveProfile}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
      
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
            placeholder="Digite seu nome completo"
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
            placeholder="Digite seu e-mail"
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
            placeholder="Digite seu telefone"
          />
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
            <div className="flex items-center gap-2">
              {key === 'soundNotifications' && <Volume2 className="w-5 h-5 text-muted-foreground" />}
              <h4 className="font-medium text-card-foreground">
                {key === 'emailNotifications' && 'Notificações por E-mail'}
                {key === 'pushNotifications' && 'Notificações Push'}
                {key === 'soundNotifications' && 'Notificações Sonoras'}
                {key === 'desktopNotifications' && 'Notificações Desktop'}
              </h4>
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

        <div className="p-4 border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-card-foreground">Redefinir Senha</h4>
              <p className="text-sm text-muted-foreground">
                Altere sua senha de acesso ao sistema
              </p>
            </div>
            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Key className="w-4 h-4" />
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </div>

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
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <User className="w-8 h-8 text-muted-foreground" /> Perfil
        </h1>
        
        {/* Mensagem de feedback global */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg border ${
            message.includes('sucesso') 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.includes('sucesso') ? (
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )}
        
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 