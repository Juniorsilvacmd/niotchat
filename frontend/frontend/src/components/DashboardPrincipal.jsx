import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { 
  MessageCircle, 
  Users, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  TrendingDown,
  Minus,
  Activity
} from 'lucide-react';
import MetricCard from './dashboard/MetricCard';
import ConversationsPieChart from './dashboard/ConversationsPieChart';
import ResponseTimeChart from './dashboard/ResponseTimeChart';
import ConversationAnalysis from './dashboard/ConversationAnalysis';

import AgentPerformanceTable from './dashboard/AgentPerformanceTable';
import RecentActivity from './dashboard/RecentActivity';

const DashboardPrincipal = ({ provedorId }) => {
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
  const [responseTimeData, setResponseTimeData] = useState([]);
  const [ws, setWs] = useState(null);


  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Buscar estatísticas gerais da API real
        const statsResponse = await fetch(`/api/dashboard/stats/`, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!statsResponse.ok) {
          throw new Error(`HTTP error! status: ${statsResponse.status}`);
        }
        
        const statsData = await statsResponse.json();
        setStats(statsData);

        // Buscar dados dos canais
        const canaisResponse = await fetch(`/api/canais/`, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (canaisResponse.ok) {
          const canaisData = await canaisResponse.json();
          setCanais(canaisData.results || canaisData || []);
        }

        // Buscar dados de tempo de resposta por hora
        const responseTimeResponse = await fetch(`/api/dashboard/response-time-hourly/`, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (responseTimeResponse.ok) {
          const responseTimeData = await responseTimeResponse.json();
          setResponseTimeData(responseTimeData);
        }

        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
        setError('Erro ao carregar dados do dashboard: ' + err.message);
        setLoading(false);
      }
    }

    if (provedorId) {
      fetchDashboardData();
    }
  }, [provedorId]);

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    if (!provedorId) return;

    const connectWebSocket = () => {
      const token = localStorage.getItem('token');
      // Usar URL relativa para WebSocket (será resolvida pelo proxy do Vite)
      const wsUrl = `ws://${window.location.host}/ws/conversas_dashboard/?token=${token}`;
      
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('WebSocket dashboard conectado');
        setWs(websocket);
      };
      
      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Atualizar estatísticas em tempo real
        if (data.type === 'dashboard_update') {
          setStats(prevStats => ({
            ...prevStats,
            ...data.stats
          }));
        }
      };
      
      websocket.onclose = () => {
        console.log('WebSocket dashboard desconectado');
        setWs(null);
        // Reconectar após 5 segundos
        setTimeout(connectWebSocket, 5000);
      };
      
      websocket.onerror = (error) => {
        console.error('Erro WebSocket dashboard:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [provedorId]);

  // Atualizar dados a cada 30 segundos
  useEffect(() => {
    if (!provedorId) return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/dashboard/stats/`, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [provedorId]);

  // Função para traduzir tipos de canal
  const getChannelDisplayName = (channelType) => {
    const channelNames = {
      'whatsapp': 'WhatsApp',
      'telegram': 'Telegram',
      'email': 'Email',
      'webchat': 'Chat Web',
      'facebook': 'Facebook',
      'instagram': 'Instagram'
    };
    return channelNames[channelType] || channelType?.charAt(0).toUpperCase() + channelType?.slice(1) || 'Outros';
  };

  // Remover channelData mockado - usar apenas dados reais da API

  // Dados reais do banco de dados
  const metrics = React.useMemo(() => {
    return {
      conversasAtivas: {
        value: (stats.conversas_abertas || 0) + (stats.conversas_pendentes || 0),
        change: '0%',
        trend: 'neutral'
      },
      tempoResposta: {
        value: stats.tempo_primeira_resposta || '0min',
        change: '0%',
        trend: 'neutral'
      },
      satisfacao: {
        value: stats.satisfacao_media || '0.0',
        change: '0%',
        trend: 'neutral'
      },
      taxaResolucao: {
        value: stats.taxa_resolucao || '0%',
        change: '0%',
        trend: 'neutral'
      }
    };
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-background min-h-screen">
      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Conversas em Andamento"
          value={metrics.conversasAtivas.value}
          change={metrics.conversasAtivas.change}
          trend={metrics.conversasAtivas.trend}
          icon={MessageCircle}
        />
        <MetricCard
          title="Tempo de Primeira Resposta"
          value={metrics.tempoResposta.value}
          change={metrics.tempoResposta.change}
          trend={metrics.tempoResposta.trend}
          icon={Clock}
        />
        <MetricCard
          title="Satisfação Média"
          value={metrics.satisfacao.value}
          change={metrics.satisfacao.change}
          trend={metrics.satisfacao.trend}
          icon={Users}
        />
        <MetricCard
          title="Taxa de Resolução"
          value={metrics.taxaResolucao.value}
          change={metrics.taxaResolucao.change}
          trend={metrics.taxaResolucao.trend}
          icon={CheckCircle}
        />
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Status das Conversas</h3>
            <ConversationsPieChart 
              data={[
                { name: 'Abertas', value: stats.conversas_abertas || 0 },
                { name: 'Pendentes', value: stats.conversas_pendentes || 0 },
                { name: 'Resolvidas', value: stats.conversas_resolvidas || 0 }
              ]}
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Canais de Atendimento</h3>
            <ConversationsPieChart 
              data={[
                { name: 'WhatsApp', value: (stats.canais?.find(c => c.inbox__channel_type === 'whatsapp')?.total || 0) },
                { name: 'Telegram', value: (stats.canais?.find(c => c.inbox__channel_type === 'telegram')?.total || 0) },
                { name: 'Email', value: (stats.canais?.find(c => c.inbox__channel_type === 'email')?.total || 0) },
                { name: 'Chat Web', value: (stats.canais?.find(c => c.inbox__channel_type === 'webchat')?.total || 0) }
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Análise de Conversas */}
      <ConversationAnalysis />

      {/* Tabelas e atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AgentPerformanceTable />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>


    </div>
  );
};

export default DashboardPrincipal;