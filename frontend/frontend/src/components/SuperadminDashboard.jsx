import React, { useState, useEffect, useRef } from 'react';
import SuperadminSidebar from './SuperadminSidebar';
import { Users, MessageCircle, TrendingUp, UserPlus, Search, Edit, Trash2, MoreVertical, Plus } from 'lucide-react';
import SuperadminAudit from './SuperadminAudit';
import SuperadminUserList from './SuperadminUserList';
import SuperadminConfig from './SuperadminConfig';
import SuperadminAdminPanel from './SuperadminAdminPanel';
import SuperadminProvedores from './SuperadminProvedores';
import DashboardCharts from './DashboardCharts';
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
    totalConversas: 0
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
        
        setStatsData({
          totalProvedores: provedores.length,
          receitaMensal: 'R$ 0,00',
          totalUsuarios: totalUsuarios,
          totalConversas: totalConversas
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
        statusMenuRef.current &&
        !statusMenuRef.current.contains(e.target) &&
        !Object.values(statusBtnRefs.current).some(ref => ref && ref.contains(e.target))
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
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
                <MessageCircle className="w-8 h-8 mr-3" />
                Dashboard do Sistema
              </h1>
              <p className="text-muted-foreground">Visão geral do sistema e estatísticas</p>
            </div>
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-card rounded-lg p-6 flex flex-col gap-2 shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-600 bg-opacity-20"><MessageCircle className="w-7 h-7 text-white" /></div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total de Provedores</p>
                    <p className="text-2xl font-bold text-card-foreground">{statsData.totalProvedores}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-green-500 text-sm font-medium">0%</span>
                </div>
              </div>
              
              <div className="bg-card rounded-lg p-6 flex flex-col gap-2 shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-700 bg-opacity-20"><TrendingUp className="w-7 h-7 text-white" /></div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Receita Mensal</p>
                    <p className="text-2xl font-bold text-card-foreground">{statsData.receitaMensal}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-green-500 text-sm font-medium">0%</span>
                </div>
              </div>
              
              <div className="bg-card rounded-lg p-6 flex flex-col gap-2 shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-700 bg-opacity-20"><Users className="w-7 h-7 text-white" /></div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total de Usuários</p>
                    <p className="text-2xl font-bold text-card-foreground">{statsData.totalUsuarios}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-green-500 text-sm font-medium">0%</span>
                </div>
              </div>
              
              <div className="bg-card rounded-lg p-6 flex flex-col gap-2 shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-orange-600 bg-opacity-20"><MessageCircle className="w-7 h-7 text-white" /></div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total de Conversas</p>
                    <p className="text-2xl font-bold text-card-foreground">{statsData.totalConversas}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-green-500 text-sm font-medium">0%</span>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="mb-8">
              <DashboardCharts provedores={provedoresState} statsData={statsData} />
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
            {/* Modal de adicionar empresa */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-[#23272f] rounded-xl shadow-2xl p-8 w-full max-w-md relative border border-border">
                  <button className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl" onClick={() => setShowAddModal(false)}>&times;</button>
                  <h2 className="text-2xl font-bold mb-6 text-white">Adicionar Provedor</h2>
                  <form onSubmit={handleAddCompany} className="space-y-5">
                    <div>
                      <label className="block font-medium mb-1 text-gray-200">Nome</label>
                      <input type="text" name="name" className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" value={addCompanyForm.name} onChange={handleAddCompanyChange} required />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-gray-200">Slug</label>
                      <input type="text" name="slug" className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" value={addCompanyForm.slug} onChange={handleAddCompanyChange} required />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-gray-200">E-mail</label>
                      <input type="email" name="email" className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" value={addCompanyForm.email} onChange={handleAddCompanyChange} />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-gray-200">Telefone</label>
                      <input type="text" name="phone" className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" value={addCompanyForm.phone} onChange={handleAddCompanyChange} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" name="is_active" checked={addCompanyForm.is_active} onChange={handleAddCompanyChange} />
                      <label className="font-medium text-gray-200">Provedor ativo</label>
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
            {/* Tabela de empresas */}
            <div className="bg-card rounded-lg shadow overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold">PROVEDOR</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold">CANAIS</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold">USUÁRIOS</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold">CONVERSAS</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold">STATUS</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCompanies.map(company => (
                    <tr key={company.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 min-w-[220px] align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-card-foreground">{company.name}</div>
                            <div className="text-xs text-muted-foreground">{company.domain || company.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center align-middle">
                        <span className="inline-flex items-center gap-1 justify-center w-full">
                          <MessageCircle className="w-4 h-4 text-muted-foreground" />
                          {company.channels_count ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center align-middle">
                        <span className="inline-flex items-center gap-1 justify-center w-full">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {company.users_count ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center align-middle">
                        <span className="inline-flex items-center gap-1 justify-center w-full">
                          <MessageCircle className="w-4 h-4 text-muted-foreground" />
                          {company.conversations_count?.toLocaleString('pt-BR') || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center align-middle">
                        <button
                          className={`px-3 py-1 rounded-full text-xs font-semibold focus:outline-none transition-colors duration-200 ${company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const token = localStorage.getItem('token');
                              await axios.patch(`/api/companies/${company.id}/`, { is_active: !company.is_active }, {
                                headers: { Authorization: `Token ${token}` }
                              });
                              // Atualizar lista após toggle
                              const res = await axios.get('/api/companies/', {
                                headers: { Authorization: `Token ${token}` }
                              });
                              setCompaniesState(res.data.results || res.data);
                            } catch (err) {
                              alert('Erro ao alterar status da empresa!');
                            }
                          }}
                        >
                          {company.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center align-middle relative" style={{overflow: 'visible'}}>
                        <button ref={el => (menuBtnRefs.current[company.id] = el)} className="p-1 hover:bg-muted rounded" onClick={handleOpenMenu(company.id)}>
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        } />
        <Route path="canais" element={<div className="flex-1 p-6">Canais do sistema (em breve)</div>} />
        <Route path="auditoria" element={<SuperadminAudit />} />
        <Route path="usuarios-sistema" element={<SuperadminUserList />} />
        <Route path="mensagem" element={<div className="flex-1 p-6">Enviar mensagem aos admins (em breve)</div>} />
        <Route path="configuracoes" element={<SuperadminConfig />} />
        <Route path="painel-empresa" element={<div className="flex-1 p-6">Redirecionando para o painel de empresa...</div>} />
        <Route path="admin-geral" element={<SuperadminAdminPanel />} />
        <Route path="provedores" element={<SuperadminProvedores />} />
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