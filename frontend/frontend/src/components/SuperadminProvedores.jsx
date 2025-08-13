import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Search, Edit, Trash2, MoreVertical, Plus, Eye, Users, MessageCircle, TrendingUp } from 'lucide-react';
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
    window.location.href = `/app/accounts/${provedor.id}/settings`;
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
    setMenuPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    });
    setMenuId(provedorId === menuId ? null : provedorId);
  };

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
          <Wifi className="w-8 h-8 mr-3" />
          Gerenciamento de Provedores
        </h1>
        <p className="text-muted-foreground">Gerencie provedores de internet e seus dados</p>
      </div>

      {/* Busca e botão adicionar */}
      <div className="bg-card rounded-lg p-4 mb-4 flex items-center gap-4 shadow">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar provedores..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 rounded bg-background border w-full"
          />
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded font-medium text-sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" /> Adicionar Provedor
        </button>
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

      {/* Tabela de provedores */}
      <div className="bg-card rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold">PROVEDOR</th>
              <th className="px-6 py-3 text-center text-xs font-semibold">CANAL</th>
              <th className="px-6 py-3 text-center text-xs font-semibold">USUÁRIOS</th>
              <th className="px-6 py-3 text-center text-xs font-semibold">CONVERSAS</th>
              <th className="px-6 py-3 text-center text-xs font-semibold">STATUS</th>
              <th className="px-6 py-3 text-center text-xs font-semibold">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredProvedores.map(provedor => (
              <tr key={provedor.id} className="hover:bg-muted/50">
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
                    {provedor.is_active !== false ? 'Ativo' : 'Inativo'}
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

      {/* Menu de ações */}
      {menuId && menuBtnRefs.current[menuId] && ReactDOM.createPortal(
        <div
          className="bg-card border rounded shadow z-[9999] min-w-[140px] flex flex-col w-max fixed"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={e => { e.stopPropagation(); handleEditProvedor(filteredProvedores.find(p => p.id === menuId)); setMenuId(null); }}>
            <Eye className="w-4 h-4" /> Ver Detalhes
          </button>
          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={e => { e.stopPropagation(); handleEditProvedor(filteredProvedores.find(p => p.id === menuId)); setMenuId(null); }}>
            <Edit className="w-4 h-4" /> Editar
          </button>
          <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-muted" onClick={e => { e.stopPropagation(); handleDeleteProvedor(menuId); setMenuId(null); }}>
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
        </div>,
        document.body
      )}
    </div>
  );
} 