import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ResponseTimeChart({ data }) {
  const chartData = data && data.length > 0 ? data : [];
  
  // Se não há dados, mostrar estado vazio
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm text-foreground">
            Tempo de Resposta (min)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <div className="text-4xl text-muted-foreground mb-2">-</div>
              <p className="text-muted-foreground">Nenhum dado disponível</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-sm text-foreground">
          Tempo de Resposta (min)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))" 
                tickLine={false} 
                axisLine={{stroke:"hsl(var(--border))"}} 
                fontSize={11}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                tickLine={false} 
                axisLine={{stroke:"hsl(var(--border))"}} 
                fontSize={11}
              />
              <Tooltip 
                cursor={{ fill: "hsl(var(--muted) / 0.1)" }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <defs>
                <linearGradient id="ncTempo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <Bar dataKey="tempo" fill="url(#ncTempo)" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}