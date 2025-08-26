import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  MessageCircle, 
  Wifi, 
  Globe, 
  Calendar,
  DollarSign
} from 'lucide-react';

// Cores principais do sistema
const primaryColor = '#3b82f6'; // Azul principal
const secondaryColor = '#10b981'; // Verde
const accentColor = '#f59e0b'; // Laranja
const warningColor = '#ef4444'; // Vermelho
const infoColor = '#8b5cf6'; // Roxo
const cyanColor = '#06b6d4'; // Ciano

// Paleta de cores para gráficos
const chartColors = [
  primaryColor,
  secondaryColor,
  accentColor,
  warningColor,
  infoColor,
  cyanColor
];

export default function SuperadminStats({ provedores, statsData }) {
  // Dados para o gráfico de barras - provedores por status
  const statusData = [
    { name: 'Ativos', value: provedores.filter(p => p.is_active).length },
    { name: 'Inativos', value: provedores.filter(p => !p.is_active).length }
  ];

  // Dados para o gráfico de pizza - distribuição de usuários por provedor
  const usersDistributionData = provedores
    .map(p => ({
      name: p.nome,
      value: p.users_count || 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5 provedores

  // Dados para o gráfico de pizza - distribuição de conversas por provedor
  const conversationsDistributionData = provedores
    .map(p => ({
      name: p.nome,
      value: p.conversations_count || 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5 provedores

  // Dados para o gráfico de barras - canais por tipo
  const channelTypesData = [
    { name: 'WhatsApp', value: 44 },
    { name: 'Email', value: 13 },
    { name: 'Telegram', value: 18 },
    { name: 'Instagram', value: 15 },
    { name: 'Website', value: 10 }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-foreground">{`${label}`}</p>
          <p className="text-primary">{`${payload[0].name} : ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Gráficos de Pizza */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Usuários por Provedor */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Top Provedores por Usuários
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={usersDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {usersDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição de Conversas por Provedor */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-400" />
              Top Provedores por Conversas
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversationsDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {conversationsDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Barras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status dos Provedores */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-purple-400" />
              Status dos Provedores
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Canais por Tipo */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-400" />
              Canais por Tipo
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={channelTypesData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill={secondaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}