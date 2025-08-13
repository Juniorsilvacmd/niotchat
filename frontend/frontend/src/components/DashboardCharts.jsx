import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function DashboardCharts({ provedores, statsData }) {
  // Dados para o gráfico de linha - conversas por provedor
  const lineChartData = {
    labels: provedores.map(p => p.nome),
    datasets: [
      {
        label: 'Conversas',
        data: provedores.map(p => p.conversations_count || 0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Usuários',
        data: provedores.map(p => p.users_count || 0),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Conversas e Usuários por Provedor',
        color: '#ffffff',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#ffffff',
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#ffffff',
        },
      },
    },
  };

  // Dados para o gráfico de pizza - distribuição de provedores
  const pieChartData = {
    labels: provedores.map(p => p.nome),
    datasets: [
      {
        data: provedores.map(p => p.conversations_count || 0),
        backgroundColor: [
          '#3B82F6', // blue
          '#8B5CF6', // purple
          '#EF4444', // red
          '#F59E0B', // yellow
          '#10B981', // green
          '#F97316', // orange
          '#EC4899', // pink
          '#06B6D4', // cyan
        ],
        borderWidth: 2,
        borderColor: '#1f2937',
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#ffffff',
          padding: 20,
        },
      },
      title: {
        display: true,
        text: 'Distribuição de Conversas por Provedor',
        color: '#ffffff',
      },
    },
  };

  // Dados para gráfico de barras - canais por provedor
  const barChartData = {
    labels: provedores.map(p => p.nome),
    datasets: [
      {
        label: 'Canais',
        data: provedores.map(p => p.channels_count || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ffffff',
        },
      },
      title: {
        display: true,
        text: 'Canais por Provedor',
        color: '#ffffff',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#ffffff',
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#ffffff',
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Gráfico de linha */}
      <div className="bg-card rounded-lg p-6 shadow">
        <Line data={lineChartData} options={lineChartOptions} />
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de pizza */}
        <div className="bg-card rounded-lg p-6 shadow">
          <Pie data={pieChartData} options={pieChartOptions} />
        </div>

        {/* Gráfico de barras */}
        <div className="bg-card rounded-lg p-6 shadow">
          <Line data={barChartData} options={barChartOptions} />
        </div>
      </div>

      {/* Métricas resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Total de Provedores</h3>
          <p className="text-2xl font-bold text-card-foreground">{statsData.totalProvedores}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Total de Conversas</h3>
          <p className="text-2xl font-bold text-card-foreground">{statsData.totalConversas}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Total de Usuários</h3>
          <p className="text-2xl font-bold text-card-foreground">{statsData.totalUsuarios}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Receita Mensal</h3>
          <p className="text-2xl font-bold text-card-foreground">{statsData.receitaMensal}</p>
        </div>
      </div>
    </div>
  );
} 