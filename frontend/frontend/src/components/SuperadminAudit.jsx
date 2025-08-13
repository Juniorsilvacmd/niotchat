import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LogIn, LogOut, Edit, Trash2, PlusCircle, User, Eye } from 'lucide-react';

export default function SuperadminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/audit-logs/', {
          headers: { Authorization: `Token ${token}` }
        });
        if (Array.isArray(res.data)) {
          setLogs(res.data);
        } else if (res.data && Array.isArray(res.data.results)) {
          setLogs(res.data.results);
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
    fetchLogs();
  }, []);

  // Função para mapear ação para ícone
  const getActionIcon = (action) => {
    if (!action) return <Eye className="w-4 h-4 text-muted-foreground" />;
    const a = action.toLowerCase();
    if (a.includes('login')) return <LogIn className="w-4 h-4 text-blue-500" />;
    if (a.includes('logout')) return <LogOut className="w-4 h-4 text-gray-500" />;
    if (a.includes('criou') || a.includes('create')) return <PlusCircle className="w-4 h-4 text-green-500" />;
    if (a.includes('editou') || a.includes('update') || a.includes('edit')) return <Edit className="w-4 h-4 text-yellow-500" />;
    if (a.includes('removeu') || a.includes('delete') || a.includes('excluiu')) return <Trash2 className="w-4 h-4 text-red-500" />;
    if (a.includes('user') || a.includes('usuário')) return <User className="w-4 h-4 text-purple-500" />;
    return <Eye className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Auditoria do Sistema</h1>
      {loading && <div>Carregando logs...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {!loading && !error && (
        <div className="bg-card rounded-lg shadow overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Data/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">IP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 && (
                <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Nenhum evento registrado ainda.</td></tr>
              )}
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="px-4 py-3">{log.user}</td>
                  <td className="px-4 py-3">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3">{log.ip_address || '-'}</td>
                  <td className="px-4 py-3">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 