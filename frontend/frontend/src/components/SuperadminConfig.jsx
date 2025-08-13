import React, { useEffect, useState } from 'react';
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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Configurações do Sistema</h1>
        {loading ? (
          <div className="text-center text-muted-foreground py-10">Carregando configurações...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-10">{error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow p-6 space-y-6">
            {success && <div className="text-green-600 font-medium">{success}</div>}
            
            {/* Configurações Gerais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Configurações Gerais</h3>
              <div>
                <label className="block font-medium mb-1">Nome do Sistema</label>
                <input type="text" name="site_name" value={config?.site_name || ''} onChange={handleChange} className="input w-full" />
              </div>
              <div>
                <label className="block font-medium mb-1">E-mail de Contato</label>
                <input type="email" name="contact_email" value={config?.contact_email || ''} onChange={handleChange} className="input w-full" />
              </div>
              <div>
                <label className="block font-medium mb-1">Idioma Padrão</label>
                <input type="text" name="default_language" value={config?.default_language || ''} onChange={handleChange} className="input w-full" />
              </div>
              <div>
                <label className="block font-medium mb-1">Fuso Horário</label>
                <input type="text" name="timezone" value={config?.timezone || ''} onChange={handleChange} className="input w-full" />
              </div>
            </div>

            {/* Configurações de Segurança */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Segurança e Limites</h3>
              <div>
                <label className="block font-medium mb-1">Permitir Cadastro Público</label>
                <input type="checkbox" name="allow_public_signup" checked={!!config?.allow_public_signup} onChange={handleChange} />
              </div>
              <div>
                <label className="block font-medium mb-1">Limite de Usuários por Empresa</label>
                <input type="number" name="max_users_per_company" value={config?.max_users_per_company || 0} onChange={handleChange} className="input w-full" />
              </div>
            </div>

            {/* Configurações da OpenAI */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Configurações da OpenAI</h3>
              <div>
                <label className="block font-medium mb-1">Chave da API OpenAI</label>
                <div className="relative">
                  <input 
                    type={showOpenAIKey ? "text" : "password"} 
                    name="openai_api_key" 
                    value={config?.openai_api_key || ''} 
                    onChange={handleChange} 
                    className="input w-full pr-10" 
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showOpenAIKey ? "🔒" : "👁️"}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Chave da API da OpenAI para geração de respostas automáticas. 
                  Se não fornecida, será usada a variável de ambiente OPENAI_API_KEY.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" className="bg-primary text-white px-6 py-2 rounded font-medium" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 