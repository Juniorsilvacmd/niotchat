import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, LogOut, Activity, Plus, Edit, Trash, MessageCircle, UserPlus, Settings, X } from "lucide-react";
import { format } from "date-fns";

export default function RecentActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivityData() {
      try {
        const token = localStorage.getItem('token');
        
        // Buscar logs de auditoria/atividade (mais dados para filtrar)
        const response = await fetch('/api/audit-logs/?limit=50', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const allActivities = data.results || data || [];
          
          // Filtrar atividades relevantes (incluindo mais tipos)
          const filteredActivities = allActivities.filter(activity => 
            ['login', 'logout', 'create', 'edit', 'delete', 'conversation_closed_agent', 'conversation_created', 'message_sent'].includes(activity.action?.toLowerCase())
          ).slice(0, 8); // Mostrar apenas 8 atividades
          
          setActivities(filteredActivities);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar atividades:', error);
        setActivities([]);
        setLoading(false);
      }
    }

    fetchActivityData();
  }, []);

  const getActivityIcon = (activity) => {
    const action = activity.action?.toLowerCase();
    const details = activity.details || '';
    
    switch (action) {
      case 'login':
        return <LogIn className="w-4 h-4 text-emerald-400" />;
      case 'logout':
        return <LogOut className="w-4 h-4 text-amber-400" />;
      case 'create':
        if (details.includes('Usuário criado')) {
          return <UserPlus className="w-4 h-4 text-blue-400" />;
        } else if (details.includes('Conversa')) {
          return <MessageCircle className="w-4 h-4 text-blue-400" />;
        }
        return <Plus className="w-4 h-4 text-blue-400" />;
      case 'edit':
        if (details.includes('Configuração')) {
          return <Settings className="w-4 h-4 text-yellow-400" />;
        }
        return <Edit className="w-4 h-4 text-yellow-400" />;
      case 'delete':
        return <Trash className="w-4 h-4 text-red-400" />;
      case 'conversation_closed_agent':
        return <X className="w-4 h-4 text-orange-400" />;
      case 'conversation_created':
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case 'message_sent':
        return <MessageCircle className="w-4 h-4 text-green-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActivityText = (activity) => {
    const action = activity.action?.toLowerCase();
    // Extrair nome do usuário (formato: "nome (tipo)")
    const userMatch = activity.user?.match(/^([^(]+)/);
    const userName = userMatch ? userMatch[1].trim() : 'Usuário';
    
    // Tentar extrair detalhes específicos da atividade
    const details = activity.details || '';
    
    switch (action) {
      case 'login':
        return `${userName} entrou no sistema`;
      case 'logout':
        return `${userName} saiu do sistema`;
      case 'create':
        // Tentar extrair o que foi criado dos detalhes
        if (details.includes('Usuário criado')) {
          const match = details.match(/Usuário criado: (\w+)/);
          const createdUser = match ? match[1] : 'usuário';
          return `${userName} criou o usuário ${createdUser}`;
        } else if (details.includes('Conversa criada')) {
          return `${userName} iniciou uma nova conversa`;
        } else if (details.includes('Contato criado')) {
          return `${userName} adicionou um novo contato`;
        }
        return `${userName} criou um item no sistema`;
      case 'edit':
        if (details.includes('Usuário editado')) {
          return `${userName} editou dados de usuário`;
        } else if (details.includes('Conversa editada')) {
          return `${userName} editou uma conversa`;
        } else if (details.includes('Configuração')) {
          return `${userName} alterou configurações`;
        }
        return `${userName} editou um item no sistema`;
      case 'delete':
        if (details.includes('Usuário removido')) {
          return `${userName} removeu um usuário`;
        } else if (details.includes('Conversa removida')) {
          return `${userName} removeu uma conversa`;
        }
        return `${userName} removeu um item do sistema`;
      case 'conversation_closed_agent':
        return `${userName} encerrou uma conversa`;
      case 'conversation_created':
        return `${userName} iniciou uma nova conversa`;
      case 'message_sent':
        return `${userName} enviou uma mensagem`;
      default:
        return `${userName} executou ação no sistema`;
    }
  };

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
          <Activity className="w-4 h-4 text-primary" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhuma atividade recente
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-2 rounded-md bg-muted border border-border">
                <div className="shrink-0">{getActivityIcon(activity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground">
                    {getActivityText(activity)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activity.timestamp || activity.created_at || activity.event_at
                      ? format(new Date(activity.timestamp || activity.created_at || activity.event_at), "dd/MM/yyyy HH:mm")
                      : "-"
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}