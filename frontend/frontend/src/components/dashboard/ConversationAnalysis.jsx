import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function ConversationAnalysis() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Períodos disponíveis
  const periods = {
    today: { label: 'Últimas 24 horas' },
    week: { label: 'Últimos 7 dias' },
    month: { label: 'Últimos 30 dias' },
    quarter: { label: 'Últimos 3 meses' }
  };

  // Buscar dados da API
  const fetchAnalysisData = async (period) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/conversations/analysis/?period=${period}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const apiData = await response.json();
        console.log('Dados da API:', apiData);
        
        // Transformar dados da API para o formato esperado pelo frontend
        const transformedData = {
          totalConversations: apiData.summary?.totalConversations || 0,
          channels: apiData.channelDistribution?.map(channel => ({
            name: channel.name,
            count: channel.value,
            percentage: `${Math.round((channel.value / (apiData.summary?.totalConversations || 1)) * 100)}%`,
            color: channel.color
          })) || [],
          dailyVolume: apiData.conversationsByDay?.map(day => ({
            date: day.date,
            volume: day.conversations
          })) || []
        };
        
        setAnalysisData(transformedData);
      } else {
        console.error('Erro ao buscar análise:', response.status);
        // Dados vazios em caso de erro
        setAnalysisData({
          totalConversations: 0,
          channels: [],
          dailyVolume: []
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados de análise:', error);
      // Dados vazios em caso de erro
      setAnalysisData({
        totalConversations: 0,
        channels: [],
        dailyVolume: []
      });
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchAnalysisData(selectedPeriod);
  }, [selectedPeriod]);

  const data = analysisData || {
    totalConversations: 0,
    channels: [],
    dailyVolume: []
  };

  return (
    <Card className="bg-[#1a1f2e] border-[#2d3748] text-white">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Análise de Conversas</h2>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Total de Conversas</span>
            <span className="text-3xl font-bold text-white">{data.totalConversations}</span>
          </div>
        </div>

        {/* Período Selecionado */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">Período Selecionado</label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48 bg-[#2d3748] border-[#4a5568] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#2d3748] border-[#4a5568]">
              {Object.entries(periods).map(([key, period]) => (
                <SelectItem key={key} value={key} className="text-white hover:bg-[#4a5568]">
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
          </div>
        ) : data.totalConversations === 0 && data.channels.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl text-gray-400 mb-2"></div>
              <p className="text-gray-400">Nenhum dado disponível</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversas por Canal */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Conversas por Canal</h3>
              
              {data.channels.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="text-2xl text-gray-400 mb-1">-</div>
                    <p className="text-gray-400 text-sm">Nenhum canal ativo</p>
                  </div>
                </div>
              ) : (
                /* Container com Pizza e Lista */
                <div className="flex items-start gap-4">
                  {/* Gráfico de Pizza Pequeno */}
                  <div className="flex-shrink-0">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie
                          data={data.channels}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={50}
                          paddingAngle={2}
                        >
                          {data.channels.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#2d3748',
                            border: '1px solid #4a5568',
                            borderRadius: '8px',
                            color: '#ffffff'
                          }}
                          formatter={(value, name) => [
                            `${value} conversas`,
                            name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Lista de Canais */}
                  <div className="flex-1 space-y-3">
                    {data.channels.map((channel, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: channel.color }}
                          />
                          <span className="text-gray-300">{channel.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{channel.count}</span>
                          <span className="text-gray-400 text-sm">({channel.percentage})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Volume Diário */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Volume Diário</h3>
              {data.dailyVolume.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <div className="text-2xl text-gray-400 mb-1">-</div>
                    <p className="text-gray-400 text-sm">Nenhum dado de volume</p>
                  </div>
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dailyVolume} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#2d3748',
                          border: '1px solid #4a5568',
                          borderRadius: '8px',
                          color: '#ffffff'
                        }}
                        formatter={(value, name) => [
                          `${value} conversas`,
                          'Volume'
                        ]}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <Bar 
                        dataKey="volume" 
                        fill="#10b981" 
                        radius={[2, 2, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}