import React, { useState, useEffect } from 'react';
import { Send, Users, Eye, EyeOff, CheckCircle, AlertCircle, Building, MessageCircle } from 'lucide-react';
import axios from 'axios';

export default function SuperadminMensagem() {
  const [provedores, setProvedores] = useState([]);
  const [selectedProvedores, setSelectedProvedores] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [assunto, setAssunto] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagensEnviadas, setMensagensEnviadas] = useState([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Buscar provedores disponíveis
  const fetchProvedores = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/provedores/', {
        headers: { Authorization: `Token ${token}` }
      });
      setProvedores(response.data.results || response.data);
    } catch (err) {
      console.error('Erro ao buscar provedores:', err);
      setError('Erro ao carregar provedores');
    }
  };

  // Buscar mensagens enviadas
  const fetchMensagensEnviadas = async () => {
    try {
      setLoadingMensagens(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/mensagens-sistema/', {
        headers: { Authorization: `Token ${token}` }
      });
      setMensagensEnviadas(response.data.results || response.data);
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
      setMensagensEnviadas([]);
    } finally {
      setLoadingMensagens(false);
    }
  };

  useEffect(() => {
    fetchProvedores();
    fetchMensagensEnviadas();
  }, []);

  // Selecionar/deselecionar provedor
  const toggleProvedor = (provedorId) => {
    setSelectedProvedores(prev => 
      prev.includes(provedorId) 
        ? prev.filter(id => id !== provedorId)
        : [...prev, provedorId]
    );
  };

  // Selecionar todos os provedores
  const selectAllProvedores = () => {
    setSelectedProvedores(provedores.map(p => p.id));
  };

  // Deselecionar todos os provedores
  const deselectAllProvedores = () => {
    setSelectedProvedores([]);
  };

  // Enviar mensagem
  const handleEnviarMensagem = async (e) => {
    e.preventDefault();
    
    if (!assunto.trim()) {
      setError('O assunto é obrigatório');
      return;
    }
    
    if (!mensagem.trim()) {
      setError('A mensagem é obrigatória');
      return;
    }
    
    if (selectedProvedores.length === 0) {
      setError('Selecione pelo menos um provedor');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/mensagens-sistema/', {
        assunto: assunto.trim(),
        mensagem: mensagem.trim(),
        provedores: selectedProvedores,
        tipo: 'notificacao'
      }, {
        headers: { Authorization: `Token ${token}` }
      });

      setSuccess('Mensagem enviada com sucesso!');
      setAssunto('');
      setMensagem('');
      setSelectedProvedores([]);
      
      // Atualizar lista de mensagens
      fetchMensagensEnviadas();
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Marcar mensagem como visualizada
  const handleMarcarVisualizada = async (mensagemId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/mensagens-sistema/${mensagemId}/marcar-visualizada/`, {}, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Atualizar lista de mensagens
      fetchMensagensEnviadas();
    } catch (err) {
      console.error('Erro ao marcar como visualizada:', err);
    }
  };

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-primary" />
          Sistema de Mensagens
        </h1>
        <p className="text-muted-foreground">
          Envie mensagens e notificações para os administradores dos provedores
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulário de Envio */}
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-400" />
              Enviar Nova Mensagem
            </h3>
          </div>
          
          <form onSubmit={handleEnviarMensagem} className="p-6 space-y-6">
            {/* Seleção de Provedores */}
            <div>
              <label className="block font-medium mb-3 text-foreground">
                Selecionar Provedores Destinatários
              </label>
              
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={selectAllProvedores}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Selecionar Todos
                </button>
                <button
                  type="button"
                  onClick={deselectAllProvedores}
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Desmarcar Todos
                </button>
              </div>
              
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 bg-background">
                {provedores.map(provedor => (
                  <label key={provedor.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProvedores.includes(provedor.id)}
                      onChange={() => toggleProvedor(provedor.id)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{provedor.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        ({provedor.users_count || 0} usuários)
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                {selectedProvedores.length} provedor(es) selecionado(s)
              </p>
            </div>

            {/* Assunto */}
            <div>
              <label className="block font-medium mb-2 text-foreground">
                Assunto *
              </label>
              <input
                type="text"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Digite o assunto da mensagem..."
                className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                required
              />
            </div>

            {/* Mensagem */}
            <div>
              <label className="block font-medium mb-2 text-foreground">
                Mensagem *
              </label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Digite sua mensagem aqui..."
                rows={6}
                className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                required
              />
            </div>

            {/* Botão Enviar */}
            <button
              type="submit"
              disabled={loading || selectedProvedores.length === 0}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Mensagem
                </>
              )}
            </button>

            {/* Mensagens de erro/sucesso */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-300 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-300 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Lista de Mensagens Enviadas */}
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-400" />
              Mensagens Enviadas
            </h3>
          </div>
          
          <div className="p-6">
            {loadingMensagens ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : mensagensEnviadas.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma mensagem enviada ainda</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {mensagensEnviadas.map(mensagem => (
                  <div key={mensagem.id} className="border border-border rounded-lg p-4 bg-background/50">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-foreground">{mensagem.assunto}</h4>
                      <span className="text-xs text-muted-foreground">
                        {new Date(mensagem.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {mensagem.mensagem}
                    </p>
                    
                    <div className="space-y-3">
                      {/* Estatísticas */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {mensagem.provedores_count || 0} provedor(es)
                        </span>
                        <span className="text-muted-foreground">
                          {mensagem.visualizacoes_count || 0} visualizada(s)
                        </span>
                      </div>
                      
                      {/* Lista de provedores com status */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground">Provedores:</p>
                        <div className="grid grid-cols-1 gap-2">
                          {mensagem.provedores_detalhados?.map(provedor => (
                            <div key={provedor.id} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {provedor.nome}
                              </span>
                              {provedor.visualizado ? (
                                <span className="text-green-500 flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  Confirmado
                                </span>
                              ) : (
                                <span className="text-orange-500 flex items-center gap-1">
                                  <EyeOff className="w-3 h-3" />
                                  Pendente
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Detalhes das visualizações */}
                      {mensagem.visualizacoes_detalhadas?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-foreground">Confirmado por:</p>
                          <div className="space-y-1">
                            {mensagem.visualizacoes_detalhadas.map((visualizacao, index) => (
                              <div key={index} className="text-xs text-green-500 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {visualizacao.provedor_nome} ({visualizacao.username})
                                <span className="text-muted-foreground ml-2">
                                  {new Date(visualizacao.timestamp).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 