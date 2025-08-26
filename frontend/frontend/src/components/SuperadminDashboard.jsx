import React, { useState, useEffect, useRef } from 'react';
import SuperadminSidebar from './SuperadminSidebar';
import { Users, MessageCircle, TrendingUp, TrendingDown, UserPlus, Search, Edit, Trash2, MoreVertical, Plus, Wifi } from 'lucide-react';
import SuperadminAudit from './SuperadminAudit';
import SuperadminUserList from './SuperadminUserList';
import SuperadminConfig from './SuperadminConfig';
import SuperadminProvedores from './SuperadminProvedores';
import SuperadminCanais from './SuperadminCanais';
// import LimpezaRapida from './LimpezaRapida';
import DashboardCharts from './DashboardCharts';
import SuperadminMensagem from './SuperadminMensagem';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import ReactDOM from 'react-dom';

const planColors = {
  'Premium': 'bg-purple-100 text-purple-800',
  'Basic': 'bg-blue-100 text-blue-800',
  'Enterprise': 'bg-yellow-100 text-yellow-800',
};

export default function SuperadminDashboard({ onLogout }) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCompanyForm, setAddCompanyForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    is_active: true,
  });
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [companiesState, setCompaniesState] = useState([]); // Começa vazio
  const [provedoresState, setProvedoresState] = useState([]); // Estado para provedores
  const filteredCompanies = companiesState.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain?.toLowerCase().includes(search.toLowerCase())
  );
  const location = useLocation();
  const [menuId, setMenuId] = useState(null);
  const [statusMenuId, setStatusMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuBtnRefs = useRef({});
  const statusBtnRefs = useRef({});
  const [statsData, setStatsData] = useState({
    totalProvedores: 0,
    receitaMensal: 'R$ 0,00',
    totalUsuarios: 0,
    totalConversas: 0,
    // Dados para tendências
    tendencias: {
      provedores: { valor: 0, percentual: 0, direcao: 'up' },
      receita: { valor: 0, percentual: 0, direcao: 'up' },
      usuarios: { valor: 0, percentual: 0, direcao: 'up' },
      conversas: { valor: 0, percentual: 0, direcao: 'up' }
    }
  });

  // Buscar empresas reais do backend ao carregar
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/companies/', {
          headers: { Authorization: `Token ${token}` }
        });
        setCompaniesState(res.data.results || res.data);
      } catch (err) {
        setCompaniesState([]);
      }
    };
    fetchCompanies();
  }, []);

  // Função para calcular tendências (simulada por enquanto)
  const calcularTendencias = (valorAtual, valorAnterior = 0) => {
    if (valorAnterior === 0) return { valor: 0, percentual: 0, direcao: 'up' };
    
    const diferenca = valorAtual - valorAnterior;
    const percentual = Math.round((diferenca / valorAnterior) * 100);
    
    return {
      valor: Math.abs(diferenca),
      percentual: Math.abs(percentual),
      direcao: diferenca >= 0 ? 'up' : 'down'
    };
  };

  // Buscar provedores e estatísticas
  useEffect(() => {
    const fetchProvedoresAndStats = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Buscar provedores
        const provedoresRes = await axios.get('/api/provedores/', {
          headers: { Authorization: `Token ${token}` }
        });
        const provedores = provedoresRes.data.results || provedoresRes.data;
        setProvedoresState(provedores);
        
        // Calcular totais dos provedores
        const totalUsuarios = provedores.reduce((sum, p) => sum + (p.users_count || 0), 0);
        const totalConversas = provedores.reduce((sum, p) => sum + (p.conversations_count || 0), 0);
        
        // Simular dados anteriores para tendências (em produção, buscar do banco)
        const dadosAnteriores = {
          provedores: Math.max(0, provedores.length - 1), // Simular mudança
          usuarios: Math.max(0, totalUsuarios - 1),       // Simular mudança
          conversas: Math.max(0, totalConversas - 1)      // Simular mudança
        };
        
        setStatsData({
          totalProvedores: provedores.length,
          receitaMensal: 'R$ 0,00',
          totalUsuarios: totalUsuarios,
          totalConversas: totalConversas,
          tendencias: {
            provedores: calcularTendencias(provedores.length, dadosAnteriores.provedores),
            receita: { valor: 0, percentual: 0, direcao: 'up' }, // Sem dados de receita ainda
            usuarios: calcularTendencias(totalUsuarios, dadosAnteriores.usuarios),
            conversas: calcularTendencias(totalConversas, dadosAnteriores.conversas)
          }
        });
        
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };
    
    fetchProvedoresAndStats();
  }, []);

  const handleAddCompanyChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddCompanyForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    setLoadingAdd(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/companies/', addCompanyForm, {
        headers: { Authorization: `Token ${token}` }
      });
      // Atualizar lista após criar
      const res = await axios.get('/api/companies/', {
        headers: { Authorization: `Token ${token}` }
      });
      setCompaniesState(res.data.results || res.data);
      setShowAddModal(false);
      setAddCompanyForm({ name: '', slug: '', email: '', phone: '', is_active: true });
    } catch (err) {
      setErrorMsg('Erro ao criar empresa!');
    } finally {
      setLoadingAdd(false);
    }
  };

  // 1. Ajustar cabeçalho da tabela
  const handleEditCompany = (company) => {
    setMenuId(null);
    alert('Editar empresa: ' + company.name);
  };
  const handleDeleteCompany = (id) => {
    setMenuId(null);
    alert('Excluir empresa ID: ' + id);
  };
  const handleInactivateCompany = async (id) => {
    setStatusMenuId(null);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/companies/${id}/`, { is_active: false }, {
        headers: { Authorization: `Token ${token}` }
      });
      // Atualizar lista após inativar
      const res = await axios.get('/api/companies/', {
        headers: { Authorization: `Token ${token}` }
      });
      setCompaniesState(res.data.results || res.data);
      alert('Empresa inativada!');
    } catch (err) {
      alert('Erro ao inativar empresa!');
    }
  };
  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClick = (e) => {
      // Fecha menu de ações normalmente
      setMenuId(null);
      // Fecha menu de status só se clicar fora do botão/menu
      if (
        Object.values(statusBtnRefs.current).some(ref => ref && ref.contains(e.target))
      ) {
        setStatusMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Função para abrir menu e calcular posição
  const handleOpenMenu = (companyId) => (e) => {
    e.stopPropagation();
    const btn = menuBtnRefs.current[companyId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 160 // ajusta para alinhar à direita
      });
    }
    setMenuId(companyId === menuId ? null : companyId);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Routes>
        <Route path="dashboard" element={
          <div className="flex-1 p-6 bg-background overflow-y-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-primary" />
                Dashboard do Sistema
              </h1>
              <p className="text-muted-foreground">Visão geral do sistema e estatísticas em tempo real</p>
            </div>
            
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 px-5 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Wifi className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Provedores</p>
                        <p className="text-xl font-bold text-foreground">{statsData.totalProvedores}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {statsData.tendencias.provedores.direcao === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        statsData.tendencias.provedores.direcao === 'up' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {statsData.tendencias.provedores.direcao === 'up' ? '+' : '-'}{statsData.tendencias.provedores.percentual}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 bg-card/50">
                  <p className="text-xs text-muted-foreground">Total no Sistema</p>
                </div>
              </div>
              
              <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 px-5 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <TrendingUp className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Receita</p>
                        <p className="text-xl font-bold text-foreground">{statsData.receitaMensal}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {statsData.tendencias.receita.direcao === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        statsData.tendencias.receita.direcao === 'up' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {statsData.tendencias.receita.direcao === 'up' ? '+' : '-'}{statsData.tendencias.receita.percentual}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 bg-card/50">
                  <p className="text-xs text-muted-foreground">Receita Mensal</p>
                </div>
              </div>
              
              <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="bg-gradient-to-r from-purple-900/30 to-violet-900/30 px-5 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <Users className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Usuários</p>
                        <p className="text-xl font-bold text-foreground">{statsData.totalUsuarios}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {statsData.tendencias.usuarios.direcao === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        statsData.tendencias.usuarios.direcao === 'up' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {statsData.tendencias.usuarios.direcao === 'up' ? '+' : '-'}{statsData.tendencias.usuarios.percentual}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 bg-card/50">
                  <p className="text-xs text-muted-foreground">Total de Usuários</p>
                </div>
              </div>
              
              <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 px-5 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/20">
                        <MessageCircle className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Conversas</p>
                        <p className="text-xl font-bold text-foreground">{statsData.totalConversas?.toLocaleString('pt-BR') || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {statsData.tendencias.conversas.direcao === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        statsData.tendencias.conversas.direcao === 'up' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {statsData.tendencias.conversas.direcao === 'up' ? '+' : '-'}{statsData.tendencias.conversas.percentual}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 bg-card/50">
                  <p className="text-xs text-muted-foreground">Total de Conversas</p>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="mb-8">
              <DashboardCharts />
            </div>
            
            {/* Seção de Provedores */}

            
            {/* Modal de adicionar empresa */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-[#23272f] rounded-xl shadow-2xl p-8 w-full max-w-md relative border border-border">
                  <button className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl" onClick={() => setShowAddModal(false)}>&times;</button>
                  <h2 className="text-2xl font-bold mb-6 text-white">Adicionar Provedor</h2>
                  <form onSubmit={handleAddCompany} className="space-y-5">
                    <div>
                      <label className="block font-medium mb-1 text-gray-200">Nome</label>
                      <input type="text" name="name" className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary transition" value={addCompanyForm.name} onChange={handleAddCompanyChange} required />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-gray-200">Slug</label>
                      <input type="text" name="slug" className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary transition" value={addCompanyForm.slug} onChange={handleAddCompanyChange} required />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-gray-200">E-mail</label>
                      <input type="email" name="email" className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary transition" value={addCompanyForm.email} onChange={handleAddCompanyChange} />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-gray-200">Telefone</label>
                      <input type="text" name="phone" className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary transition" value={addCompanyForm.phone} onChange={handleAddCompanyChange} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" name="is_active" checked={addCompanyForm.is_active} onChange={handleAddCompanyChange} className="rounded text-primary focus:ring-primary" />
                      <label className="font-medium text-gray-200">Provedor ativo</label>
                    </div>
                    {errorMsg && <div className="text-red-400 text-sm mb-2">{errorMsg}</div>}
                    <button
                      type="submit"
                      className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-primary/80 transition flex items-center justify-center"
                      disabled={loadingAdd}
                    >
                      {loadingAdd ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adicionando...
                        </>
                      ) : 'Adicionar Provedor'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        } />
        <Route path="canais" element={<SuperadminCanais />} />
        <Route path="auditoria" element={<SuperadminAudit />} />
        <Route path="usuarios-sistema" element={<SuperadminUserList />} />
        <Route path="mensagem" element={<SuperadminMensagem />} />
        <Route path="configuracoes" element={<SuperadminConfig />} />
        <Route path="painel-empresa" element={<div className="flex-1 p-6">Redirecionando para o painel de empresa...</div>} />
        <Route path="provedores" element={<SuperadminProvedores />} />
        <Route path="configuracoes" element={<SuperadminConfig />} />
        {/* <Route path="limpeza-rapida" element={<LimpezaRapida />} /> */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
      {menuId && menuBtnRefs.current[menuId] && ReactDOM.createPortal(
        <div
          className="bg-card border rounded shadow z-[9999] min-w-[140px] flex flex-col w-max fixed"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={e => { e.stopPropagation(); handleEditCompany(filteredCompanies.find(c => c.id === menuId)); setMenuId(null); }}>
            <Edit className="w-4 h-4" /> Editar
          </button>
          <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-muted" onClick={e => { e.stopPropagation(); handleDeleteCompany(menuId); setMenuId(null); }}>
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}