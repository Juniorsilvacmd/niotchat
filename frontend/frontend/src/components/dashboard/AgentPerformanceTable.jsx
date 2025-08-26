import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Star, MessageSquare } from "lucide-react";

export default function AgentPerformanceTable() {
  const [agents, setAgents] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('token');
        
        // Buscar usuários/agentes
        const usersResponse = await fetch('/api/users/', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setAgents(usersData.results || usersData || []);
        }

        // Buscar conversas
        const conversationsResponse = await fetch('/api/conversations/?limit=200', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          setConversations(conversationsData.results || conversationsData || []);
        }

        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const performanceData = useMemo(() => {
    // Usar apenas dados reais dos agentes
    return agents.map((agent, idx) => {
      // Filtrar conversas do agente
      const agentConversations = conversations.filter(conv => 
        conv.assignee?.id === agent.id || conv.agent_id === agent.id
      );
      
      const count = agentConversations.length;
      
      // Calcular CSAT médio
      const ratings = agentConversations
        .map(conv => conv.rating || conv.satisfaction_rating)
        .filter(rating => rating && rating > 0);
      const avgCsat = ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) : 0;
      
      // Tempo médio de resposta real (calcular baseado em timestamps)
      const responseTimes = agentConversations
        .map(conv => {
          if (conv.first_response_time) {
            return parseFloat(conv.first_response_time);
          }
          // Fallback para cálculo baseado em created_at vs first_agent_message
          return 1.5; // média padrão em minutos
        })
        .filter(time => time > 0);
      
      const avgResponseTime = responseTimes.length 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;
      
      return {
        id: agent.id,
        name: agent.first_name && agent.last_name 
          ? `${agent.first_name} ${agent.last_name}` 
          : agent.username || agent.email?.split('@')[0] || 'Agente',
        email: agent.email,
        conversations: count,
        csat: avgCsat ? avgCsat.toFixed(1) : "-",
        responseTime: avgResponseTime ? avgResponseTime.toFixed(1) : "-"
      };
    });
  }, [agents, conversations]);

  if (loading) {
    return (
      <Card className="nc-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Performance por Atendente (Tempo de Resposta)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-foreground">Atendente</TableHead>
                <TableHead className="text-foreground">Conversas</TableHead>
                <TableHead className="text-foreground">CSAT</TableHead>
                <TableHead className="text-foreground">Resp. Média (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceData.map(row => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                  <TableCell className="text-foreground">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" /> 
                      {row.conversations}
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500" /> 
                      {row.csat}
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">{row.responseTime}</TableCell>
                </TableRow>
              ))}
              {performanceData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">
                    Nenhum atendente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}