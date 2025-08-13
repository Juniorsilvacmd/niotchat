import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Users, Clock, AlertCircle, CheckCircle, Thermometer } from 'lucide-react';
import axios from 'axios';

const ConversationRecovery = ({ provedorId }) => {
  const [loading, setLoading] = useState(true);
  const [recoveryStats, setRecoveryStats] = useState({
    totalAttempts: 0,
    successfulRecoveries: 0,
    pendingRecoveries: 0,
    conversionRate: 0,
    averageResponseTime: '0min'
  });
  const [recoveryConversations, setRecoveryConversations] = useState([]);
  const [settings, setSettings] = useState({
    enabled: true,
    delayMinutes: 30,
    maxAttempts: 3,
    autoDiscount: false,
    discountPercentage: 10
  });

  useEffect(() => {
    fetchRecoveryData();
  }, [provedorId]);

  const fetchRecoveryData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/recovery/stats/${provedorId}/`, {
        headers: { Authorization: `Token ${token}` }
      });
      setRecoveryStats(res.data.stats);
      setRecoveryConversations(res.data.conversations);
    } catch (err) {
      console.error('Erro ao carregar dados de recuperação:', err);
      setRecoveryStats({
        totalAttempts: 0,
        successfulRecoveries: 0,
        pendingRecoveries: 0,
        conversionRate: 0,
        averageResponseTime: '0min'
      });
      setRecoveryConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/recovery/settings/${provedorId}/`, settings, {
        headers: { Authorization: `Token ${token}` }
      });
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      alert('Erro ao salvar configurações');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'recovered': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'recovered': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando recuperador...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Recuperador de conversas</h1>
        <p className="text-muted-foreground">
          Se um cliente parar de responder, o atendente virtual enviará uma mensagem para tentar recuperar a venda.
        </p>
      </div>

      {/* Termômetro de Vendas Recuperadas */}
      <div className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Termômetro de vendas recuperadas</h2>
        </div>
        <div className="flex items-center justify-center">
          <div className="relative w-[260px] h-[140px]">
            {/* Fundo do arco */}
            <svg width="260" height="140" viewBox="0 0 260 140" className="absolute top-0 left-0">
              <path
                d="M40 120 A90 90 0 0 1 220 120"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="18"
                strokeLinecap="round"
              />
              {/* Preenchimento colorido */}
              <path
                d="M40 120 A90 90 0 0 1 220 120"
                fill="none"
                stroke="#10b981"
                strokeWidth="18"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset={283 - (recoveryStats.conversionRate / 100) * 283}
                style={{ strokeDashoffset: 283 - (recoveryStats.conversionRate / 100) * 283, transition: 'stroke-dashoffset 0.8s' }}
              />
            </svg>
            {/* Número central */}
            <div className="absolute top-[55px] left-0 w-full flex flex-col items-center">
              <div className="text-4xl font-bold text-foreground">{recoveryStats.successfulRecoveries}</div>
              <div className="text-base text-muted-foreground">vendas recuperadas</div>
            </div>
            {/* Valor máximo à direita */}
            <div className="absolute top-[110px] right-0 text-base text-muted-foreground">
              {recoveryStats.totalAttempts}
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-muted-foreground">Tentativas</span>
          </div>
          <div className="text-2xl font-bold mt-2">{recoveryStats.totalAttempts}</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Recuperadas</span>
          </div>
          <div className="text-2xl font-bold mt-2">{recoveryStats.successfulRecoveries}</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Pendentes</span>
          </div>
          <div className="text-2xl font-bold mt-2">{recoveryStats.pendingRecoveries}</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
          </div>
          <div className="text-2xl font-bold mt-2">{recoveryStats.conversionRate}%</div>
        </div>
      </div>

      {/* Configurações */}
      <div className="bg-card rounded-lg border p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Configurações do Recuperador</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Ativar Recuperador</label>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleSettingsChange('enabled', e.target.checked)}
              className="rounded border-gray-300"
            />
          </div>
          <div></div>
          <div>
            <label className="block text-sm font-medium mb-2">Máximo de Tentativas</label>
            <input
              type="number"
              value={settings.maxAttempts}
              onChange={(e) => handleSettingsChange('maxAttempts', parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
              min="1"
              max="10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Delay (minutos)</label>
            <input
              type="number"
              value={settings.delayMinutes}
              onChange={(e) => handleSettingsChange('delayMinutes', parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
              min="5"
              max="1440"
            />
          </div>
        </div>
        <button
          onClick={saveSettings}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Salvar Configurações
        </button>
      </div>

      {/* Lista de Conversas em Recuperação */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Conversas em Recuperação</h3>
        
        {recoveryConversations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Nenhuma conversa em recuperação no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {recoveryConversations.map((conversation) => (
              <div key={conversation.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium">{conversation.contact.name}</div>
                      <div className="text-sm text-muted-foreground">{conversation.contact.phone}</div>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor(conversation.status)}`}>
                    {getStatusIcon(conversation.status)}
                    <span className="capitalize">{conversation.status}</span>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mb-2">
                  {conversation.lastMessage}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>Valor potencial: R$ {conversation.potentialValue}</div>
                  <div>Tentativas: {conversation.attempts}/{settings.maxAttempts}</div>
                  <div>Última tentativa: {new Date(conversation.lastAttempt).toLocaleString('pt-BR')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationRecovery; 