import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { 
  MessageCircle, 
  Users, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import axios from 'axios';

const Dashboard = ({ provedorId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total_conversas: 0,
    conversas_abertas: 0,
    conversas_pendentes: 0,
    conversas_resolvidas: 0,
    conversas_em_andamento: 0,
    contatos_unicos: 0,
    mensagens_30_dias: 0,
    tempo_medio_resposta: '0min',
    tempo_primeira_resposta: '0min',
    taxa_resolucao: '0%',
    satisfacao_media: '0.0',
    midias_30_dias: 0,
    autoatendimentos_30_dias: 0,
    status_presenca: ''
  });
  const [canais, setCanais] = useState([]);
  const [atendentes, setAtendentes] = useState([]);
  const [atividades, setAtividades] = useState([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/dashboard/stats/`, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setStats(data.stats || {});
        setCanais(data.canais || []);
        setAtendentes(data.atendentes || []);
        setAtividades(data.atividades || []);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
        setError('Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();

    // WebSocket para atualizações em tempo real dos gráficos SSE/Uazapi
    let ws = null;
    
    if (provedorId) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${wsProtocol}://${window.location.host}/ws/painel/${provedorId}/`);
      
      ws.onopen = () => {
        console.log('# Debug logging removed for security WebSocket Dashboard: Conectado com sucesso');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Mensagens por dia
          if (data.type === 'graficos.mensagens') {
            setStats(prev => ({
              ...prev,
              mensagens_30_dias: data.total
            }));
          }
          // Atendimentos ativos
          if (data.type === 'graficos.atendimentos') {
            setStats(prev => ({
              ...prev,
              conversas_em_andamento: data.total
            }));
          }
          // Mídias recebidas
          if (data.type === 'graficos.midia') {
            setStats(prev => ({
              ...prev,
              midias_30_dias: data.total
            }));
          }
          // Autoatendimentos (IA)
          if (data.type === 'graficos.autoatendimento') {
            setStats(prev => ({
              ...prev,
              autoatendimentos_30_dias: data.total
            }));
          }
          // Status de presença
          if (data.type === 'graficos.presenca') {
            setStats(prev => ({
              ...prev,
              status_presenca: data.status
            }));
          }
        } catch (err) {
          console.error('Erro ao processar mensagem WebSocket:', err);
        }
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket erro:', err);
      };
      
      ws.onclose = (event) => {
        console.log('# Debug logging removed for security WebSocket Dashboard: Desconectado', event.code, event.reason);
      };
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('# Debug logging removed for security WebSocket Dashboard: Fechando conexão');
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [provedorId]);

  // Dados para gráficos baseados nos dados reais
  const conversationStatusData = [
    { name: 'Abertas', value: stats?.conversas_abertas || 0, color: '#10b981' },
    { name: 'Pendentes', value: stats?.conversas_pendentes || 0, color: '#f59e0b' },
    { name: 'Resolvidas', value: stats?.conversas_resolvidas || 0, color: '#6b7280' }
  ].filter(item => item.value > 0); // Filtrar apenas itens com valor > 0

  // Função para traduzir tipos de canal
  const translateChannelType = (channelType) => {
    const translations = {
      'whatsapp': 'WhatsApp',
      'email': 'Email',
      'telegram': 'Telegram',
      'webchat': 'Chat Web',
      'facebook': 'Facebook',
      'instagram': 'Instagram'
    };
    return translations[channelType] || channelType || 'Outros';
  };

  const channelData = (canais || [])
    .filter(canal => canal.total > 0) // Filtrar apenas canais com conversas
    .map(canal => ({
      name: translateChannelType(canal.inbox__channel_type),
      value: canal.total || 0,
      color: getChannelColor(canal.inbox__channel_type)
    }));

  const agentPerformanceData = (atendentes || []).map(atendente => ({
    name: atendente.name || 'Sem nome',
    conversations: atendente.conversations || 0,
    satisfaction: atendente.satisfaction || 0
  }));

  const statsCards = [
    {
      title: 'Conversas em Andamento',
      value: (stats?.conversas_em_andamento || 0).toLocaleString(),
      change: (stats?.conversas_em_andamento || 0) > 0 ? '+5%' : '0%',
      trend: (stats?.conversas_em_andamento || 0) > 0 ? 'up' : 'neutral',
      icon: MessageCircle,
      color: 'text-blue-500'
    },
    {
      title: 'Tempo de Primeira Resposta',
      value: stats?.tempo_primeira_resposta || '0min',
      change: (stats?.tempo_primeira_resposta || '0min') !== '0min' ? '-20%' : '0%',
      trend: (stats?.tempo_primeira_resposta || '0min') !== '0min' ? 'down' : 'neutral',
      icon: Clock,
      color: 'text-green-500'
    },
    {
      title: 'Satisfação Média',
      value: stats?.satisfacao_media || '0',
      change: parseFloat(stats?.satisfacao_media || '0') > 0 ? '+2%' : '0%',
      trend: parseFloat(stats?.satisfacao_media || '0') > 0 ? 'up' : 'neutral',
      icon: CheckCircle,
      color: 'text-purple-500'
    },
    {
      title: 'Taxa de Resolução',
      value: stats?.taxa_resolucao || '0%',
      change: (stats?.taxa_resolucao || '0%') !== '0%' ? '+3%' : '0%',
      trend: (stats?.taxa_resolucao || '0%') !== '0%' ? 'up' : 'neutral',
      icon: TrendingUp,
      color: 'text-orange-500'
    }
  ];

  function getChannelColor(channelType) {
    const colors = {
      'whatsapp': '#25d366',
      'email': '#3b82f6',
      'telegram': '#0088cc',
      'webchat': '#8b5cf6'
    };
    return colors[channelType] || '#6b7280';
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const displayLabel = data?.name || label || 'Item';
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-card-foreground font-medium">{`${displayLabel}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Carregando dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-red-500">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
              <p className="text-muted-foreground">Visão geral do desempenho do atendimento</p>
            </div>
            {stats.total_conversas > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Tempo Real</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <div key={index} className="niochat-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {stat.value}
                  </p>
                  <div className="flex items-center mt-2">
                    {stat.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : stat.trend === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    ) : (
                      <div className="w-4 h-4 mr-1"></div>
                    )}
                    <span className={`text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-500' : 
                      stat.trend === 'down' ? 'text-red-500' : 
                      'text-muted-foreground'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status das Conversas */}
          <div className="niochat-card p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Status das Conversas
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversationStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {conversationStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              {conversationStatusData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Canais de Atendimento */}
          <div className="niochat-card p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Canais de Atendimento
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {channelData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance dos Atendentes */}
        {agentPerformanceData.length > 0 && (
          <div className="niochat-card p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Performance dos Atendentes
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--card-foreground)'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="conversations" 
                    fill="var(--primary)" 
                    name="Conversas Atendidas"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Atividade Recente */}
        {atividades.length > 0 && (
          <div className="niochat-card p-6 mt-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Atividade Recente
            </h3>
            <div className="space-y-4">
              {atividades.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'conversation' ? 'bg-blue-500' :
                    activity.type === 'resolved' ? 'bg-green-500' :
                    activity.type === 'assignment' ? 'bg-orange-500' : 'bg-purple-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-card-foreground">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Mensagem quando não há atividades */}
        {atividades.length === 0 && (
          <div className="niochat-card p-6 mt-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Atividade Recente
            </h3>
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma atividade recente</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;