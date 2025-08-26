import React, { useEffect, useState } from 'react';
import { Settings, Save, Eye, EyeOff, Globe, Shield, Zap, Building } from 'lucide-react';
import axios from 'axios';

export default function SuperadminConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        console.log('Buscando configurações do sistema...');
        const res = await axios.get('/api/system-config/', {
          headers: { Authorization: `Token ${token}` }
        });
        console.log('Configurações recebidas:', res.data);
        setConfig(res.data);
      } catch (e) {
        console.error('Erro ao buscar configurações:', e);
        setError('Erro ao buscar configurações do sistema: ' + (e.response?.data?.detail || e.message));
      }
      setLoading(false);
    }
    fetchConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log('Campo alterado:', name, 'Valor:', value);
    setConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      console.log('Enviando configurações:', config);
      const res = await axios.put(`/api/system-config/1/`, config, {
        headers: { Authorization: `Token ${token}` }
      });
      console.log('Resposta do servidor:', res.data);
      setSuccess('Configurações salvas com sucesso!');
      // Atualizar o estado com a resposta do servidor
      setConfig(res.data);
    } catch (e) {
      console.error('Erro ao salvar configurações:', e);
      setError('Erro ao salvar configurações: ' + (e.response?.data?.detail || e.message));
    }
    setSaving(false);
  };

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            Configurações do Sistema
          </h1>
          <p className="text-muted-foreground">Gerencie as configurações globais do sistema de forma centralizada</p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando configurações...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-center">
                <p className="text-green-400 font-medium">{success}</p>
              </div>
            )}
            
            {/* Configurações Gerais */}
            <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 px-6 py-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-400" />
                  Configurações Gerais
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-2 text-foreground">Nome do Sistema</label>
                    <input 
                      type="text" 
                      name="site_name" 
                      value={config?.site_name || ''} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" 
                      placeholder="Nome do sistema"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-2 text-foreground">E-mail de Contato</label>
                    <input 
                      type="email" 
                      name="contact_email" 
                      value={config?.contact_email || ''} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" 
                      placeholder="contato@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-2 text-foreground">Idioma Padrão</label>
                    <select 
                      name="default_language" 
                      value={config?.default_language || 'pt-br'} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    >
                      <option value="pt-br">Português (Brasil)</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">pt-br</p>
                  </div>
                  <div>
                    <label className="block font-medium mb-2 text-foreground">Fuso Horário</label>
                    <select 
                      name="timezone" 
                      value={config?.timezone || 'America/Sao_Paulo'} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    >
                      <option value="America/Sao_Paulo">São Paulo</option>
                      <option value="America/New_York">New York</option>
                      <option value="Europe/London">London</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">America/Sao_Paulo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Segurança e Limites */}
            <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
              <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 px-6 py-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-400" />
                  Segurança e Limites
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      name="allow_public_signup" 
                      id="allow_public_signup"
                      checked={!!config?.allow_public_signup} 
                      onChange={handleChange} 
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <label htmlFor="allow_public_signup" className="font-medium text-foreground">
                      Permitir Cadastro Público
                    </label>
                  </div>
                  <div>
                    <label className="block font-medium mb-2 text-foreground">Limite de Usuários por Empresa</label>
                    <input 
                      type="number" 
                      name="max_users_per_company" 
                      value={config?.max_users_per_company || 10} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" 
                      min="1"
                      max="1000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Configurações da OpenAI */}
            <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
              <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 px-6 py-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-400" />
                  Configurações da OpenAI
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block font-medium mb-2 text-foreground">Chave da API OpenAI</label>
                  <div className="relative">
                    <input 
                      type={showOpenAIKey ? "text" : "password"} 
                      name="openai_api_key" 
                      value={config?.openai_api_key || ''} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 pr-12 rounded-lg bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" 
                      placeholder="sk-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showOpenAIKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Chave da API da OpenAI para geração de respostas automáticas. 
                    Se não fornecida, será usada a variável de ambiente OPENAI_API_KEY.
                  </p>
                </div>
              </div>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end pt-6">
              <button 
                type="submit" 
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg" 
                disabled={saving}
              >
                <Save className="w-5 h-5" />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 