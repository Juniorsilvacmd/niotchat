import React, { useEffect, useState } from 'react';
import { Eye, LogIn, LogOut, Edit, Trash2, PlusCircle, User, Filter, Download, BarChart3, Calendar, Search, RefreshCw, X, MessageSquare, Clock, Hash, Bot } from 'lucide-react';
import axios from 'axios';

export default function AuditLog({ provedorId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    action_type: '',
    date_from: '',
    date_to: '',
    user_id: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    page_size: 20
  });
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationDetails, setConversationDetails] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);

  useEffect(() => {
    if (provedorId) {
      fetchLogs();
      fetchStats();
    }
  }, [provedorId, filters, pagination.current]);

  async function fetchLogs() {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = {
        page: pagination.current,
        page_size: pagination.page_size,
        provedor_id: provedorId, // Filtrar por provedor específico
        conversation_closed: 'true', // Apenas conversas encerradas
        ...filters
      };
      
      const res = await axios.get('/api/audit-logs/', {
        headers: { Authorization: `Token ${token}` },
        params
      });
      
      if (res.data && Array.isArray(res.data.results)) {
        setLogs(res.data.results);
        setPagination(prev => ({
          ...prev,
          total: Math.ceil(res.data.count / pagination.page_size)
        }));
      } else if (Array.isArray(res.data)) {
        setLogs(res.data);
        setPagination(prev => ({ ...prev, total: 1 }));
      } else {
        setLogs([]);
        setError('Resposta inesperada da API.');
      }
    } catch (e) {
      if (e.response && e.response.data && e.response.data.detail) {
        setError('Erro: ' + e.response.data.detail);
      } else {
        setError('Erro ao buscar logs de auditoria.');
      }
      setLogs([]);
    }
    setLoading(false);
  }

  async function fetchStats() {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/audit-logs/conversation_stats/', {
        headers: { Authorization: `Token ${token}` },
        params: { provedor_id: provedorId }
      });
      setStats(res.data);
    } catch (e) {
      console.error('Erro ao buscar estatísticas:', e);
    }
  }

  async function fetchConversationDetails(conversationId) {
    setLoadingConversation(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/audit-logs/conversation_audit/?conversation_id=${conversationId}&provedor_id=${provedorId}`, {
        headers: { Authorization: `Token ${token}` }
      });
      
      if (res.data && res.data.results && res.data.results.length > 0) {
        setConversationDetails(res.data.results[0]);
      } else if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setConversationDetails(res.data[0]);
      }
    } catch (e) {
      console.error('Erro ao buscar detalhes da conversa:', e);
    }
    setLoadingConversation(false);
  }

  async function exportAuditLog() {
    try {
      const token = localStorage.getItem('token');
      const params = { 
        provedor_id: provedorId,
        conversation_closed: 'true',
        ...filters 
      };
      
      const res = await axios.get('/api/audit-logs/export_audit_log/', {
        headers: { Authorization: `Token ${token}` },
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `auditoria_conversas_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Erro ao exportar:', e);
      alert('Erro ao exportar logs de auditoria.');
    }
  }

  const getActionIcon = (action) => {
    if (!action) return <Eye className="w-4 h-4 text-muted-foreground" />;
    const a = action.toLowerCase();
    if (a.includes('conversation_closed_agent')) return <User className="w-4 h-4 text-green-600" />;
    if (a.includes('conversation_closed_ai')) return <Bot className="w-4 h-4 text-purple-600" />;
    if (a.includes('conversation_transferred')) return <MessageSquare className="w-4 h-4 text-blue-600" />;
    if (a.includes('conversation_assigned')) return <User className="w-4 h-4 text-yellow-600" />;
    return <Eye className="w-4 h-4 text-muted-foreground" />;
  };

  const getActionDisplay = (action) => {
    const actionMap = {
      'conversation_closed_agent': 'Agente',
      'conversation_closed_ai': 'IA',
      'conversation_transferred': 'Transferida',
      'conversation_assigned': 'Atribuída'
    };
    return actionMap[action] || action;
  };

  const getActionBadge = (action) => {
    const actionMap = {
      'conversation_closed_agent': 'bg-green-100 text-green-800',
      'conversation_closed_ai': 'bg-purple-100 text-purple-800',
      'conversation_transferred': 'bg-blue-100 text-blue-800',
      'conversation_assigned': 'bg-yellow-100 text-yellow-800'
    };
    return actionMap[action] || 'bg-gray-100 text-gray-800';
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      action_type: '',
      date_from: '',
      date_to: '',
      user_id: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const formatDuration = (duration) => {
    if (!duration) return '-';
    return duration;
  };

  const openConversationModal = (conversationId) => {
    setSelectedConversation(conversationId);
    fetchConversationDetails(conversationId);
  };

  const closeConversationModal = () => {
    setSelectedConversation(null);
    setConversationDetails(null);
  };

  if (!provedorId) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-center text-muted-foreground">
          ID do provedor não fornecido
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Eye className="w-7 h-7 text-muted-foreground" /> Auditoria do Sistema
            </h1>
            <p className="text-muted-foreground">
              Veja todas as conversas encerradas no sistema, incluindo quem as encerrou e detalhes.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button
              onClick={exportAuditLog}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={() => { fetchLogs(); fetchStats(); }}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">Total Encerradas</span>
              </div>
              <p className="text-2xl font-bold">{stats.total_closed || 0}</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Por Agentes</span>
              </div>
              <p className="text-2xl font-bold">{stats.closed_by_agent || 0}</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-muted-foreground">Por IA</span>
              </div>
              <p className="text-2xl font-bold">{stats.closed_by_ai || 0}</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Taxa IA</span>
              </div>
              <p className="text-2xl font-bold">
                {stats.percentage_ai_resolved ? `${stats.percentage_ai_resolved.toFixed(1)}%` : '0%'}
              </p>
            </div>
          </div>
        )}

        {/* Filtros */}
        {showFilters && (
          <div className="bg-card p-4 rounded-lg border mb-6">
            <h3 className="font-semibold mb-3">Filtros Avançados</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Ação</label>
                <select
                  value={filters.action_type}
                  onChange={(e) => handleFilterChange('action_type', e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="">Todas as ações</option>
                  <option value="conversation_closed_agent">Conversa Encerrada por Agente</option>
                  <option value="conversation_closed_ai">Conversa Encerrada por IA</option>
                  <option value="conversation_transferred">Conversa Transferida</option>
                  <option value="conversation_assigned">Conversa Atribuída</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data Início</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Tabela de Logs */}
        <div className="bg-card rounded-lg shadow overflow-x-auto">
          {loading && <div className="p-6 text-center">Carregando logs...</div>}
          {error && <div className="p-6 text-red-500 text-center">{error}</div>}
          {!loading && !error && (
            <>
              <table className="min-w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Ação</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Agente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Data/Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Plataforma</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Detalhes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Duração</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Eye className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-lg font-medium">Nenhuma conversa encerrada ainda.</p>
                        <p className="text-sm">As conversas encerradas aparecerão aqui quando houver atividades no sistema.</p>
                      </td>
                    </tr>
                  )}
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                            {getActionDisplay(log.action)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openConversationModal(log.conversation_id)}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          title="Clique para ver detalhes da conversa"
                        >
                          {log.contact_name || 'Cliente'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {typeof log.user === 'string' ? log.user.split(' (')[0] : log.user || 'Sistema'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {log.channel_type || 'WhatsApp'}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-sm space-y-1">
                          <div>{log.message_count || 0} mensagens</div>
                          {log.resolution_type && (
                            <div className="text-xs text-muted-foreground">
                              {log.resolution_type === 'ai_resolved' ? 'IA resolveu automaticamente' : log.resolution_type}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDuration(log.conversation_duration_formatted)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openConversationModal(log.conversation_id)}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title="Ver detalhes da conversa"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Paginação */}
              {pagination.total > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {pagination.current} de {pagination.total}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, current: Math.max(1, prev.current - 1) }))}
                      disabled={pagination.current === 1}
                      className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 disabled:opacity-50 rounded transition-colors"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, current: Math.min(prev.total, prev.current + 1) }))}
                      disabled={pagination.current === pagination.total}
                      className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 disabled:opacity-50 rounded transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal de Detalhes da Conversa */}
        {selectedConversation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Detalhes da Conversa #{selectedConversation}
                </h2>
                <button
                  onClick={closeConversationModal}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                {loadingConversation ? (
                  <div className="text-center py-8">Carregando detalhes...</div>
                ) : conversationDetails ? (
                  <div className="space-y-6">
                    {/* Informações da Conversa */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Informações da Conversa</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium">{conversationDetails.status_display}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duração:</span>
                            <span className="font-medium">{conversationDetails.duration}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Mensagens:</span>
                            <span className="font-medium">{conversationDetails.message_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Criada em:</span>
                            <span className="font-medium">
                              {new Date(conversationDetails.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Contato</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Nome:</span>
                            <span className="font-medium">{conversationDetails.contact?.name || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Telefone:</span>
                            <span className="font-medium">{conversationDetails.contact?.phone || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium">{conversationDetails.contact?.email || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Logs de Auditoria */}
                    {conversationDetails.audit_logs && conversationDetails.audit_logs.length > 0 && (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">Histórico de Auditoria</h3>
                        <div className="space-y-2">
                          {conversationDetails.audit_logs.map((log, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 bg-background rounded">
                              {getActionIcon(log.action)}
                              <div className="flex-1">
                                <div className="font-medium text-sm">{log.action_display}</div>
                                <div className="text-xs text-muted-foreground">
                                  {log.user} • {new Date(log.timestamp).toLocaleString('pt-BR')}
                                </div>
                              </div>
                              {log.resolution_type && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {log.resolution_type}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mensagens */}
                    {conversationDetails.messages && conversationDetails.messages.length > 0 && (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">Últimas Mensagens</h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {conversationDetails.messages.map((message, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg ${
                                message.is_from_customer
                                  ? 'bg-blue-100 ml-4'
                                  : 'bg-green-100 mr-4'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium">
                                  {message.is_from_customer ? 'Cliente' : 'Agente'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(message.created_at).toLocaleString('pt-BR')}
                                </span>
                              </div>
                              <div className="text-sm">{message.content}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Não foi possível carregar os detalhes da conversa.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 