import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Search, Edit, Trash2, MoreVertical, Plus, Eye, Users, MessageCircle, TrendingUp, Database, Trash } from 'lucide-react';
import axios from 'axios';
import ReactDOM from 'react-dom';

export default function SuperadminProvedores() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addProvedorForm, setAddProvedorForm] = useState({
    nome: '',
    site_oficial: '',
    endereco: '',
    redes_sociais: {},
    nome_agente_ia: '',
    estilo_personalidade: '',
    modo_falar: '',
    uso_emojis: '',
    personalidade: '',
    email_contato: '',
    taxa_adesao: '',
    inclusos_plano: '',
    multa_cancelamento: '',
    tipo_conexao: '',
    prazo_instalacao: '',
    documentos_necessarios: '',
    observacoes: '',
  });
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [provedoresState, setProvedoresState] = useState([]);
  const [menuId, setMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuBtnRefs = useRef({});
  const [statsData, setStatsData] = useState({
    totalProvedores: 0,
    receitaMensal: 'R$ 0,00',
    totalUsuarios: 0,
    totalConversas: 0
  });
  
  // Estados para modais de limpeza
  const [showLimpezaModal, setShowLimpezaModal] = useState(false);
  const [provedorLimpeza, setProvedorLimpeza] = useState(null);
  const [loadingLimpeza, setLoadingLimpeza] = useState(false);
  const [limpezaResult, setLimpezaResult] = useState(null);

  const filteredProvedores = provedoresState.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.site_oficial?.toLowerCase().includes(search.toLowerCase())
  );

  // Buscar estatísticas detalhadas
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Buscar provedores
      const provedoresRes = await axios.get('/api/provedores/', {
        headers: { Authorization: `Token ${token}` }
      });
      const provedores = provedoresRes.data.results || provedoresRes.data;
      
      // Calcular totais dos provedores
      const totalUsuarios = provedores.reduce((sum, p) => sum + (p.users_count || 0), 0);
      const totalConversas = provedores.reduce((sum, p) => sum + (p.conversations_count || 0), 0);
      
      setStatsData({
        totalProvedores: provedores.length,
        receitaMensal: 'R$ 0,00', // Placeholder - pode ser calculado baseado em planos
        totalUsuarios: totalUsuarios,
        totalConversas: totalConversas
      });
      
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  };

  // Buscar provedores reais do backend ao carregar
  useEffect(() => {
    const fetchProvedores = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/provedores/', {
          headers: { Authorization: `Token ${token}` }
        });
        setProvedoresState(res.data.results || res.data);
      } catch (err) {
        console.error('Erro ao carregar provedores:', err);
        setProvedoresState([]);
      }
    };
    
    fetchProvedores();
    fetchStats();
  }, []);

  const handleAddProvedorChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddProvedorForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddProvedor = async (e) => {
    e.preventDefault();
    setLoadingAdd(true);
    setErrorMsg('');
    
    try {
      const token = localStorage.getItem('token');
      console.log('[DEBUG SuperadminProvedores] Criando novo provedor:', addProvedorForm);
      
      const response = await axios.post('/api/provedores/', addProvedorForm, {
        headers: { Authorization: `Token ${token}` }
      });
      
      console.log('[DEBUG SuperadminProvedores] Resposta da API:', response.data);
      
      // Atualizar lista após criar
      const res = await axios.get('/api/provedores/', {
        headers: { Authorization: `Token ${token}` }
      });
      setProvedoresState(res.data.results || res.data);
      
      // Atualizar estatísticas
      await fetchStats();
      
      setShowAddModal(false);
      setAddProvedorForm({
        nome: '',
        site_oficial: '',
        endereco: '',
        redes_sociais: {},
        nome_agente_ia: '',
        estilo_personalidade: '',
        modo_falar: '',
        uso_emojis: '',
        personalidade: '',
        email_contato: '',
        taxa_adesao: '',
        inclusos_plano: '',
        multa_cancelamento: '',
        tipo_conexao: '',
        prazo_instalacao: '',
        documentos_necessarios: '',
        observacoes: '',
      });
    } catch (err) {
      console.error('[DEBUG SuperadminProvedores] Erro ao criar provedor:', err);
      console.error('[DEBUG SuperadminProvedores] Resposta de erro:', err.response?.data);
      setErrorMsg('Erro ao criar provedor. Verifique os dados e tente novamente.');
    }
    setLoadingAdd(false);
  };

  const handleEditProvedor = (provedor) => {
    // Redirecionar para a página de edição do provedor
    window.location.href = `/app/accounts/${provedor.id}/dados-provedor`;
  };

  const handleAlterarStatus = async (provedorId, novoStatus) => {
    const statusLabels = {
      'ativo': 'Ativo',
      'suspenso': 'Suspenso'
    };
    
    if (!window.confirm(`Tem certeza que deseja alterar o status para "${statusLabels[novoStatus]}"?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/provedores/${provedorId}/`, {
        status: novoStatus
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Atualizar lista
      setProvedoresState(prev => prev.map(p => 
        p.id === provedorId ? { ...p, status: novoStatus } : p
      ));
      
      alert(`Status alterado para "${statusLabels[novoStatus]}" com sucesso!`);
      
    } catch (err) {
      alert('Erro ao alterar status do provedor!');
    }
  };

  const handleDeleteProvedor = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este provedor?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/provedores/${id}/`, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Atualizar lista após excluir
      const res = await axios.get('/api/provedores/', {
        headers: { Authorization: `Token ${token}` }
      });
      setProvedoresState(res.data.results || res.data);
      
      // Atualizar estatísticas
      await fetchStats();
    } catch (err) {
      alert('Erro ao excluir provedor!');
    }
  };
  
  // Função para abrir modal de limpeza
  const handleOpenLimpezaModal = (provedor) => {
    setProvedorLimpeza(provedor);
    setShowLimpezaModal(true);
    setMenuId(null); // Fechar menu de ações
  };
  
  // Função para executar limpeza
  const handleExecutarLimpeza = async (tipo) => {
    if (!provedorLimpeza) return;
    
    const confirmacao = tipo === 'banco' 
      ? `Tem certeza que deseja LIMPAR COMPLETAMENTE o banco de dados do provedor "${provedorLimpeza.nome}"?\n\n⚠️ ATENÇÃO: Esta ação removerá TODAS as conversas, mensagens e contatos deste provedor e NÃO PODE SER DESFEITA!`
      : `Tem certeza que deseja limpar o Redis do provedor "${provedorLimpeza.nome}"?\n\n⚠️ ATENÇÃO: Esta ação removerá todas as chaves de cache e memória deste provedor!`;
    
    if (!window.confirm(confirmacao)) return;
    
    setLoadingLimpeza(true);
    setLimpezaResult(null);
    
    try {
      const token = localStorage.getItem('token');
      const endpoint = tipo === 'banco' 
        ? `/api/provedores/${provedorLimpeza.id}/limpar_banco_dados/`
        : `/api/provedores/${provedorLimpeza.id}/limpar_redis/`;
      
      const response = await axios.post(endpoint, {}, {
        headers: { Authorization: `Token ${token}` }
      });
      
      setLimpezaResult({
        success: true,
        message: response.data.message,
        details: response.data
      });
      
      // Atualizar estatísticas após limpeza
      fetchStats();
      
    } catch (error) {
      setLimpezaResult({
        success: false,
        message: error.response?.data?.error || 'Erro ao executar limpeza',
        details: error.response?.data
      });
    } finally {
      setLoadingLimpeza(false);
    }
  };

  const handleClick = (e) => {
    if (menuId && !menuBtnRefs.current[menuId]?.contains(e.target)) {
      setMenuId(null);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [menuId]);

  const handleOpenMenu = (provedorId) => (e) => {
    e.stopPropagation();
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    
    // Calcular se o modal vai caber na tela
    const modalHeight = 200; // Altura estimada do modal
    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    let topPosition;
    if (spaceBelow < modalHeight && spaceAbove > modalHeight) {
      // Se não cabe embaixo, posiciona acima do botão
      topPosition = rect.top + window.scrollY - modalHeight - 10;
    } else {
      // Posiciona abaixo, mas mais para cima
      topPosition = rect.bottom + window.scrollY - 80;
    }
    
    setMenuPosition({
      top: topPosition,
      left: rect.left + window.scrollX - 200 // Move 200px para a esquerda
    });
    setMenuId(provedorId === menuId ? null : provedorId);
  };

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      {/* Header */}
      {/* Header elegante */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Wifi className="w-8 h-8 text-primary" />
          Gerenciamento de Provedores
        </h1>
        <p className="text-muted-foreground">Gerencie provedores de internet e seus dados de forma centralizada</p>
      </div>

      {/* Cards de estatísticas removidos */}

      {/* Busca e botão adicionar modernizado */}
      <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-slate-900/20 to-gray-900/20 px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-400" />
            Gerenciar Provedores
          </h3>
        </div>
        <div className="p-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar provedores por nome, slug ou domínio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
          <button 
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg" 
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4" /> Adicionar Provedor
          </button>
        </div>
      </div>

      {/* Modal de adicionar provedor */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#23272f] rounded-xl shadow-2xl p-8 w-full max-w-md relative border border-border">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl" onClick={() => setShowAddModal(false)}>&times;</button>
            <h2 className="text-2xl font-bold mb-6 text-white">Adicionar Provedor</h2>
            <form onSubmit={handleAddProvedor} className="space-y-5">
              <div>
                <label className="block font-medium mb-1 text-gray-200">Nome do Provedor *</label>
                <input 
                  type="text" 
                  name="nome" 
                  className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                  value={addProvedorForm.nome} 
                  onChange={handleAddProvedorChange} 
                  required 
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-200">Site Oficial</label>
                <input 
                  type="url" 
                  name="site_oficial" 
                  className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                  value={addProvedorForm.site_oficial} 
                  onChange={handleAddProvedorChange} 
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-200">Endereço</label>
                <input 
                  type="text" 
                  name="endereco" 
                  className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                  value={addProvedorForm.endereco} 
                  onChange={handleAddProvedorChange} 
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-200">E-mail de Contato</label>
                <input 
                  type="email" 
                  name="email_contato" 
                  className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                  value={addProvedorForm.email_contato} 
                  onChange={handleAddProvedorChange} 
                />
              </div>
              {errorMsg && <div className="text-red-400 text-sm mb-2">{errorMsg}</div>}
              <button
                type="submit"
                className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-primary/80 transition"
                disabled={loadingAdd}
              >
                {loadingAdd ? 'Adicionando...' : 'Adicionar Provedor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de provedores modernizada */}
      <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900/20 to-gray-900/20 px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            Lista de Provedores
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-center text-xs font-semibold text-foreground uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">PROVEDOR</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-foreground uppercase tracking-wider">CANAL</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-foreground uppercase tracking-wider">USUÁRIOS</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-foreground uppercase tracking-wider">CONVERSAS</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-foreground uppercase tracking-wider">STATUS</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-foreground uppercase tracking-wider">AÇÕES</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-border">
            {filteredProvedores.map(provedor => (
              <tr key={provedor.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 text-center align-middle">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    {provedor.id}
                  </span>
                </td>
                <td className="px-6 py-4 min-w-[220px] align-middle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-card-foreground">{provedor.nome}</div>
                      <div className="text-xs text-muted-foreground">{provedor.site_oficial || provedor.email_contato}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center align-middle">
                  {provedor.channels_count || 0}
                </td>
                <td className="px-6 py-4 text-center align-middle">
                  {provedor.users_count || 0}
                </td>
                <td className="px-6 py-4 text-center align-middle">
                  <span className="inline-flex items-center gap-1 justify-center w-full">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    {provedor.conversations_count?.toLocaleString('pt-BR') || 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-center align-middle">
                  <button
                    className={`px-3 py-1 rounded-full text-xs font-semibold focus:outline-none transition-colors duration-200 ${provedor.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const token = localStorage.getItem('token');
                        await axios.patch(`/api/provedores/${provedor.id}/`, { is_active: !provedor.is_active }, {
                          headers: { Authorization: `Token ${token}` }
                        });
                        // Atualizar lista após toggle
                        const res = await axios.get('/api/provedores/', {
                          headers: { Authorization: `Token ${token}` }
                        });
                        setProvedoresState(res.data.results || res.data);
                      } catch (err) {
                        alert('Erro ao alterar status do provedor!');
                      }
                    }}
                  >
                    {provedor.status === 'ativo' ? 'Ativo' : 'Suspenso'}
                  </button>
                </td>
                <td className="px-6 py-4 text-center align-middle relative" style={{overflow: 'visible'}}>
                  <button ref={el => (menuBtnRefs.current[provedor.id] = el)} className="p-1 hover:bg-muted rounded" onClick={handleOpenMenu(provedor.id)}>
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Menu de ações */}
      {menuId && menuBtnRefs.current[menuId] && ReactDOM.createPortal(
        <div
          className="bg-card border rounded shadow z-[9999] min-w-[170px] flex flex-col w-max fixed"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-muted text-sm" onClick={e => { e.stopPropagation(); handleEditProvedor(filteredProvedores.find(p => p.id === menuId)); setMenuId(null); }}>
            <Eye className="w-4 h-4" /> Ver Detalhes
          </button>
          <button className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-muted text-sm" onClick={e => { e.stopPropagation(); handleEditProvedor(filteredProvedores.find(p => p.id === menuId)); setMenuId(null); }}>
            <Edit className="w-4 h-4" /> Editar
          </button>
          <div className="border-t border-border my-1"></div>
          <button className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-orange-600 hover:bg-muted text-sm" onClick={e => { e.stopPropagation(); handleOpenLimpezaModal(filteredProvedores.find(p => p.id === menuId)); setMenuId(null); }}>
            <Database className="w-4 h-4" /> Limpeza de Dados
          </button>
          <button className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-red-600 hover:bg-muted text-sm" onClick={e => { e.stopPropagation(); handleDeleteProvedor(menuId); setMenuId(null); }}>
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
        </div>,
        document.body
      )}
      
      {/* Modal de Limpeza de Dados */}
      {showLimpezaModal && provedorLimpeza && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#23272f] rounded-xl shadow-2xl p-8 w-full max-w-lg relative border border-border">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl" onClick={() => { setShowLimpezaModal(false); setProvedorLimpeza(null); setLimpezaResult(null); }}>&times;</button>
            
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
              <Database className="w-6 h-6 text-orange-500" />
              Limpeza de Dados - {provedorLimpeza.nome}
            </h2>
            
            <div className="space-y-6">
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                <p className="text-orange-200 text-sm">
                  ⚠️ <strong>ATENÇÃO:</strong> As ações de limpeza são irreversíveis e podem afetar o funcionamento do sistema.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Limpeza do Banco de Dados */}
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-red-200 mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Banco de Dados
                  </h3>
                  <p className="text-red-300 text-xs mb-3">
                    Remove TODAS as conversas, mensagens e contatos deste provedor
                  </p>
                  <button
                    onClick={() => handleExecutarLimpeza('banco')}
                    disabled={loadingLimpeza}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingLimpeza ? 'Executando...' : 'Limpar Banco de Dados'}
                  </button>
                </div>
                
                {/* Limpeza do Redis */}
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-200 mb-2 flex items-center gap-2">
                    <Trash className="w-4 h-4" />
                    Cache Redis
                  </h3>
                  <p className="text-yellow-300 text-xs mb-3">
                    Remove todas as chaves de cache e memória deste provedor
                  </p>
                  <button
                    onClick={() => handleExecutarLimpeza('redis')}
                    disabled={loadingLimpeza}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingLimpeza ? 'Executando...' : 'Limpar Redis'}
                  </button>
                </div>
              </div>
              
              {/* Resultado da operação */}
              {limpezaResult && (
                <div className={`rounded-lg p-4 border ${
                  limpezaResult.success 
                    ? 'bg-green-900/20 border-green-500/30 text-green-200' 
                    : 'bg-red-900/20 border-red-500/30 text-red-200'
                }`}>
                  <h4 className="font-semibold mb-2">
                    {limpezaResult.success ? '✅ Sucesso!' : '❌ Erro!'}
                  </h4>
                  <p className="text-sm">{limpezaResult.message}</p>
                  {limpezaResult.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs opacity-70">Ver detalhes</summary>
                      <pre className="text-xs mt-2 opacity-70 overflow-auto">
                        {JSON.stringify(limpezaResult.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 