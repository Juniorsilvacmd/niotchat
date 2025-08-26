import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function ConversationsPieChart({ data, title = "Distribuição" }) {
  // Usar apenas dados reais - sem fallback mockado
  const chartData = data && data.length > 0 ? data : [];
  // Paleta sincronizada com o tema (lê variáveis CSS)
  const css = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const getVar = (v, fb) => (css ? css.getPropertyValue(v).trim() : '') || fb;
  const palette = [
    getVar('--chart-1', '#3b82f6'),
    getVar('--chart-2', '#10b981'),
    getVar('--chart-3', '#f59e0b'),
    getVar('--chart-4', '#ef4444'),
    getVar('--chart-5', '#8b5cf6')
  ];
  const accent = getVar('--nc-accent', palette[0]);
  const muted = getVar('--nc-muted', '#94a3b8');

  const colorForName = (name, index) => {
    const n = (name || '').toLowerCase();
    
    // Cores para Status das Conversas
    if (n.includes('ativa') || n.includes('aberta')) return '#10b981'; // Verde
    if (n.includes('aguard') || n.includes('pendente')) return '#f59e0b'; // Laranja  
    if (n.includes('fech') || n.includes('resolvida')) return '#94a3b8'; // Cinza
    
    // Cores para Canais de Atendimento
    if (n.includes('whatsapp')) return '#10b981'; // Verde (WhatsApp)
    if (n.includes('telegram')) return '#06b6d4'; // Azul ciano (Telegram)
    if (n.includes('web')) return '#8b5cf6'; // Roxo (Web)
    if (n.includes('email')) return '#f59e0b'; // Laranja (Email)
    
    return palette[index % palette.length];
  };

  // Se não há dados ou array vazio, mostrar estado vazio
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl text-muted-foreground mb-2">-</div>
              <p className="text-muted-foreground">Nenhum dado disponível</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const themedData = chartData.map((item, idx) => ({
    ...item,
    color: item.color || colorForName(item.name, idx)
  }));
  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const top = chartData.reduce((acc, cur) => (cur.value > acc.value ? cur : acc), chartData[0] || { value: 0, name: '' });
  const topPercent = total ? Math.round((top.value / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={themedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              // Sem labels nas fatias para seguir o modelo
              label={false}
              outerRadius={110}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              stroke="none"
              strokeWidth={0}
            >
              {themedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #1f2a44',
                borderRadius: '8px',
                color: '#cbd5e1'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Rótulo central mostrando o total */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center leading-tight">
            <div className="text-2xl font-bold text-foreground">{total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-6 mt-4 justify-start">
        {themedData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            ></div>
            <span className="text-sm text-foreground font-medium">{item.name}</span>
            <span className="text-sm text-muted-foreground font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}