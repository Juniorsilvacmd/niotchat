import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Wifi, Globe, Facebook } from 'lucide-react';
import axios from 'axios';

// Importar ícones específicos dos canais
import whatsappIcon from '../assets/whatsapp.png';
import gmailIcon from '../assets/gmail.png';
import instagramIcon from '../assets/instagram.png';
import telegramIcon from '../assets/telegram.png';

export default function SuperadminCanais() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [canais, setCanais] = useState([]);
  const [provedores, setProvedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [addCanalForm, setAddCanalForm] = useState({
    tipo: 'whatsapp',
    nome: '',
    ativo: true,
    provedor: '',
    // WhatsApp
    instance_id: '',
    api_key: '',
    // Telegram
    api_id: '',
    api_hash: '',
    app_title: '',
    short_name: '',
    verification_code: '',
    phone_number: '',
    // Email
    email: '',
    smtp_host: '',
    smtp_port: '',
    // Website
    url: '',
    // Extras
    dados_extras: {}
  });

  const tipoIcons = {
    whatsapp: <img src={whatsappIcon} alt="WhatsApp" className="w-5 h-5" />,
    whatsapp_beta: <img src={whatsappIcon} alt="WhatsApp Beta" className="w-5 h-5" />,
    telegram: <img src={telegramIcon} alt="Telegram" className="w-5 h-5" />,
    email: <img src={gmailIcon} alt="E-mail" className="w-5 h-5" />,
    website: <Globe className="w-5 h-5 text-purple-500" />,
    instagram: <img src={instagramIcon} alt="Instagram" className="w-5 h-5" />,
    facebook: <Facebook className="w-5 h-5 text-blue-600" />
  };

  const tipoLabels = {
    whatsapp: 'WhatsApp',
    whatsapp_beta: 'WhatsApp Beta',
    telegram: 'Telegram',
    email: 'E-mail',
    website: 'Website',
    instagram: 'Instagram',
    facebook: 'Facebook'
  };

  // Buscar canais e provedores
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Buscar canais
        const canaisRes = await axios.get('/api/canais/', {
          headers: { Authorization: `Token ${token}` }
        });
        setCanais(canaisRes.data.results || canaisRes.data);
        
        // Buscar provedores
        const provedoresRes = await axios.get('/api/provedores/', {
          headers: { Authorization: `Token ${token}` }
        });
        setProvedores(provedoresRes.data.results || provedoresRes.data);
        
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setErrorMsg('Erro ao carregar canais e provedores');
      }
    };
    
    fetchData();
  }, []);

  const handleAddCanalChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddCanalForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddCanal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/canais/', addCanalForm, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Adicionar novo canal à lista
      setCanais(prev => [...prev, response.data]);
      
      // Limpar formulário e fechar modal
      setAddCanalForm({
        tipo: 'whatsapp',
        nome: '',
        ativo: true,
        provedor: '',
        instance_id: '',
        api_key: '',
        api_id: '',
        api_hash: '',
        app_title: '',
        short_name: '',
        verification_code: '',
        phone_number: '',
        email: '',
        smtp_host: '',
        smtp_port: '',
        url: '',
        dados_extras: {}
      });
      setShowAddModal(false);
      
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Erro ao criar canal');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCanal = async (canalId) => {
    if (!window.confirm('Tem certeza que deseja excluir este canal?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/canais/${canalId}/`, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Remover canal da lista
      setCanais(prev => prev.filter(c => c.id !== canalId));
      
    } catch (err) {
      alert('Erro ao excluir canal!');
    }
  };

  const handleToggleStatus = async (canalId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/canais/${canalId}/`, { ativo: !currentStatus }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Atualizar status na lista
      setCanais(prev => prev.map(c => 
        c.id === canalId ? { ...c, ativo: !currentStatus } : c
      ));
      
    } catch (err) {
      alert('Erro ao alterar status do canal!');
    }
  };

  const filteredCanais = canais.filter(canal => {
    const searchLower = search.toLowerCase();
    // O provedor pode vir como objeto completo ou como ID
    const provedorId = typeof canal.provedor === 'object' ? canal.provedor.id : canal.provedor;
    const provedor = provedores.find(p => p.id === provedorId);
    return (
      canal.nome?.toLowerCase().includes(searchLower) ||
      tipoLabels[canal.tipo]?.toLowerCase().includes(searchLower) ||
      provedor?.nome?.toLowerCase().includes(searchLower) ||
      canal.email?.toLowerCase().includes(searchLower) ||
      canal.url?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Gerenciamento de Canais
        </h1>
        <p className="text-muted-foreground">Gerencie canais de comunicação dos provedores</p>
      </div>

      {/* Busca e botão adicionar */}
      <div className="bg-card rounded-lg p-4 mb-4 flex items-center gap-4 shadow">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar canais..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 rounded bg-background border w-full"
          />
        </div>
        <button 
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded font-medium text-sm" 
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4" /> Adicionar Canal
        </button>
      </div>

      {/* Modal de adicionar canal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#23272f] rounded-xl shadow-2xl p-8 w-full max-w-2xl relative border border-border max-h-[90vh] overflow-y-auto">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl" onClick={() => setShowAddModal(false)}>&times;</button>
            <h2 className="text-2xl font-bold mb-6 text-white">Adicionar Canal</h2>
            
            <form onSubmit={handleAddCanal} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1 text-gray-200">Tipo de Canal *</label>
                  <select 
                    name="tipo" 
                    className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                    value={addCanalForm.tipo} 
                    onChange={handleAddCanalChange} 
                    required 
                  >
                    {Object.entries(tipoLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block font-medium mb-1 text-gray-200">Provedor *</label>
                  <select 
                    name="provedor" 
                    className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                    value={addCanalForm.provedor} 
                    onChange={handleAddCanalChange} 
                    required 
                  >
                    <option value="">Selecione um provedor</option>
                    {provedores.map(provedor => (
                      <option key={provedor.id} value={provedor.id}>{provedor.nome}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block font-medium mb-1 text-gray-200">Nome do Canal</label>
                  <input 
                    type="text" 
                    name="nome" 
                    className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                    value={addCanalForm.nome} 
                    onChange={handleAddCanalChange} 
                  />
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    name="ativo" 
                    id="ativo"
                    className="mr-2" 
                    checked={addCanalForm.ativo} 
                    onChange={handleAddCanalChange} 
                  />
                  <label htmlFor="ativo" className="text-gray-200">Canal Ativo</label>
                </div>
              </div>

              {/* Campos específicos por tipo */}
              {addCanalForm.tipo === 'whatsapp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1 text-gray-200">Instance ID</label>
                    <input 
                      type="text" 
                      name="instance_id" 
                      className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                      value={addCanalForm.instance_id} 
                      onChange={handleAddCanalChange} 
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-200">API Key</label>
                    <input 
                      type="text" 
                      name="api_key" 
                      className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                      value={addCanalForm.api_key} 
                      onChange={handleAddCanalChange} 
                    />
                  </div>
                </div>
              )}

              {addCanalForm.tipo === 'telegram' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1 text-gray-200">API ID</label>
                    <input 
                      type="text" 
                      name="api_id" 
                      className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                      value={addCanalForm.api_id} 
                      onChange={handleAddCanalChange} 
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-200">API Hash</label>
                    <input 
                      type="text" 
                      name="api_hash" 
                      className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                      value={addCanalForm.api_hash} 
                      onChange={handleAddCanalChange} 
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-200">Phone Number</label>
                    <input 
                      type="text" 
                      name="phone_number" 
                      className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                      value={addCanalForm.phone_number} 
                      onChange={handleAddCanalChange} 
                    />
                  </div>
                </div>
              )}

              {addCanalForm.tipo === 'email' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1 text-gray-200">E-mail</label>
                    <input 
                      type="email" 
                      name="email" 
                      className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                      value={addCanalForm.email} 
                      onChange={handleAddCanalChange} 
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-200">SMTP Host</label>
                    <input 
                      type="text" 
                      name="smtp_host" 
                      className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                      value={addCanalForm.smtp_host} 
                      onChange={handleAddCanalChange} 
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-gray-200">SMTP Port</label>
                    <input 
                      type="text" 
                      name="smtp_port" 
                      className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                      value={addCanalForm.smtp_port} 
                      onChange={handleAddCanalChange} 
                    />
                  </div>
                </div>
              )}

              {addCanalForm.tipo === 'website' && (
                <div>
                  <label className="block font-medium mb-1 text-gray-200">URL</label>
                  <input 
                    type="url" 
                    name="url" 
                    className="w-full px-4 py-2 rounded bg-[#181b20] text-white border border-border" 
                    value={addCanalForm.url} 
                    onChange={handleAddCanalChange} 
                  />
                </div>
              )}

              {errorMsg && <div className="text-red-400 text-sm mb-2">{errorMsg}</div>}
              
              <button
                type="submit"
                className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-primary/80 transition"
                disabled={loading}
              >
                {loading ? 'Criando...' : 'Criar Canal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de canais */}
      <div className="bg-card rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold">CANAL</th>
              <th className="px-6 py-3 text-left text-xs font-semibold">PROVEDOR</th>
              <th className="px-6 py-3 text-center text-xs font-semibold">TIPO</th>
              <th className="px-6 py-3 text-center text-xs font-semibold">STATUS</th>
              <th className="px-6 py-3 text-center text-xs font-semibold">CRIADO EM</th>
              <th className="px-6 py-3 text-center text-xs font-semibold">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredCanais.map(canal => {
              // O provedor pode vir como objeto completo ou como ID
              const provedorId = typeof canal.provedor === 'object' ? canal.provedor.id : canal.provedor;
              const provedor = provedores.find(p => p.id === provedorId);
              return (
                <tr key={canal.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 min-w-[220px] align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center">
                        {tipoIcons[canal.tipo]}
                      </div>
                      <div>
                        <div className="font-semibold text-card-foreground">
                          {canal.nome || tipoLabels[canal.tipo]}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {canal.email || canal.url || canal.phone_number || 'Sem identificador'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-left align-middle">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{provedor?.nome || 'Provedor não encontrado'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center align-middle">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {tipoIcons[canal.tipo]}
                      <span className="text-blue-800">{tipoLabels[canal.tipo]}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center align-middle">
                    <button
                      className={`px-3 py-1 rounded-full text-xs font-semibold focus:outline-none transition-colors duration-200 ${canal.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleToggleStatus(canal.id, canal.ativo)}
                    >
                      {canal.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center align-middle text-sm text-muted-foreground">
                    {new Date(canal.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-center align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1 hover:bg-muted rounded text-blue-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-1 hover:bg-muted rounded text-red-600"
                        onClick={() => handleDeleteCanal(canal.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredCanais.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'Nenhum canal encontrado para esta busca.' : 'Nenhum canal cadastrado ainda.'}
          </div>
        )}
      </div>
    </div>
  );
} 