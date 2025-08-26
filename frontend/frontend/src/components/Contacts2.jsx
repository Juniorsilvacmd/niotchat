import React, { useState, useEffect } from 'react';
import { MoreVertical, CheckCircle, AlertCircle, Tag, Mail, Phone, User, ChevronDown, Download, Plus, X, MessageCircle, Globe } from 'lucide-react';
import { Badge } from './ui/badge';
import axios from 'axios';
import whatsappIcon from '../assets/whatsapp.png';
import telegramIcon from '../assets/telegram.png';
import gmailIcon from '../assets/gmail.png';
import instagramIcon from '../assets/instagram.png';

const actions = [
  { value: '', label: '--------' },
  { value: 'edit', label: 'Editar' },
  { value: 'delete', label: 'Excluir' }
];

export default function Contacts() {
  const [selected, setSelected] = useState([]);
  const [action, setAction] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [novoContato, setNovoContato] = useState({ nome: '', telefone: '+55', canal: 'WhatsApp', email: '' });
  const [contatos, setContatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchContacts() {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/contacts/', {
          headers: { Authorization: `Token ${token}` }
        });
        
        const contactsData = res.data.results || res.data;
        setContatos(contactsData);
      } catch (err) {
        console.error('Erro ao carregar contatos:', err);
        setError('Erro ao carregar contatos');
        setContatos([]);
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, []);

  // Função para limpar telefone (remover @s.whatsapp.net)
  const cleanPhone = (phone) => {
    if (!phone) return '';
    return phone.replace('@s.whatsapp.net', '').replace('@lid', '');
  };

  // Função para exportar CSV
  const exportCSV = () => {
    if (contatos.length === 0) {
      alert('Não há contatos para exportar');
      return;
    }
    
    const header = ['Nome', 'Email', 'Telefone', 'Canal', 'Último Contato', 'Status'];
    const rows = contatos.map(c => [
      c.name || '',
      c.email || '',
      cleanPhone(c.phone || ''),
      c.inbox?.channel_type || '',
      c.updated_at ? new Date(c.updated_at).toLocaleDateString('pt-BR') : '',
      'Ativo' // Status padrão
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contatos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Função para adicionar novo contato
  const handleNovoContato = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Mapear os campos do frontend para o formato esperado pelo backend
      const contactData = {
        name: novoContato.nome,
        phone: novoContato.telefone,
        email: novoContato.email || '' // Email opcional
      };
      
      const res = await axios.post('/api/contacts/', contactData, {
        headers: { Authorization: `Token ${token}` }
      });
      
      setContatos(prev => [...prev, res.data]);
      setShowModal(false);
      setNovoContato({ nome: '', telefone: '+55', canal: 'WhatsApp', email: '' });
    } catch (err) {
      console.error('Erro ao criar contato:', err);
      alert('Erro ao criar contato: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Função para editar contato
  const handleEditContact = async (e) => {
    e.preventDefault();
    if (!editingContact) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/contacts/${editingContact.id}/`, {
        name: editingContact.name,
        email: editingContact.email,
        phone: editingContact.phone,
        additional_attributes: {
          sender_lid: editingContact.sender_lid
        }
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Atualizar lista de contatos
      setContatos(prev => prev.map(c => 
        c.id === editingContact.id ? {
          ...c,
          name: editingContact.name,
          email: editingContact.email,
          phone: editingContact.phone,
          additional_attributes: {
            ...c.additional_attributes,
            sender_lid: editingContact.sender_lid
          }
        } : c
      ));
      
      setShowEditModal(false);
      setEditingContact(null);
      setMessage('Contato atualizado com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Erro ao atualizar contato:', err);
      setMessage('Erro ao atualizar contato. Tente novamente.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Função para excluir contatos selecionados
  const handleDeleteContacts = async () => {
    if (selected.length === 0) {
      alert('Selecione pelo menos um contato para excluir.');
      return;
    }
    if (!window.confirm('Tem certeza que deseja excluir os contatos selecionados?')) return;
    try {
      const token = localStorage.getItem('token');
      for (const id of selected) {
        await axios.delete(`/api/contacts/${id}/`, {
          headers: { Authorization: `Token ${token}` }
        });
      }
      setContatos(prev => prev.filter(c => !selected.includes(c.id)));
      setSelected([]);
      setMessage('Contatos excluídos com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Erro ao excluir contatos.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Função para abrir modal de edição
  const openEditModal = (contato) => {
    setEditingContact({
      id: contato.id,
      name: contato.name || '',
      email: contato.email || '',
      phone: contato.phone || '',
      sender_lid: contato.additional_attributes?.sender_lid || ''
    });
    setShowEditModal(true);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };
  
  const selectAll = () => {
    if (selected.length === contatos.length) setSelected([]);
    else setSelected(contatos.map(c => c.id));
  };

  // Componente do canal com logo
  const CanalDisplay = ({ canal }) => {
    if (canal === 'whatsapp') {
      return (
        <div className="flex flex-col items-center gap-1">
          <img src={whatsappIcon} alt="WhatsApp" className="w-6 h-6" />
          <span className="text-xs text-muted-foreground">WhatsApp</span>
        </div>
      );
    }
    
    if (canal === 'telegram') {
      return (
        <div className="flex flex-col items-center gap-1">
          <img src={telegramIcon} alt="Telegram" className="w-6 h-6" />
          <span className="text-xs text-muted-foreground">Telegram</span>
        </div>
      );
    }
    
    if (canal === 'email') {
      return (
        <div className="flex flex-col items-center gap-1">
          <img src={gmailIcon} alt="Gmail" className="w-6 h-6" />
          <span className="text-xs text-muted-foreground">Gmail</span>
        </div>
      );
    }
    
    if (canal === 'webchat') {
      return (
        <div className="flex flex-col items-center gap-1">
          <Globe className="w-6 h-6 text-cyan-500" />
          <span className="text-xs text-muted-foreground">Web</span>
        </div>
      );
    }
    
    if (canal === 'instagram') {
      return (
        <div className="flex flex-col items-center gap-1">
          <img src={instagramIcon} alt="Instagram" className="w-6 h-6" />
          <span className="text-xs text-muted-foreground">Instagram</span>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center gap-1">
        <MessageCircle className="w-6 h-6 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Outro</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando contatos...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Barra de ações */}
      <div className="flex items-center mb-4 gap-2">
        <select
          className="border rounded px-2 py-1 text-sm bg-background"
          value={action}
          onChange={e => {
            setAction(e.target.value);
            if (e.target.value === 'delete') handleDeleteContacts();
          }}
        >
          {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <button className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-medium">Ir</button>
        <span className="ml-2 text-xs text-muted-foreground">{selected.length} de {contatos.length} selecionado(s)</span>
        <div className="flex-1" />
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"><Plus className="w-4 h-4" /> Novo Contato</button>
        <button onClick={exportCSV} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"><Download className="w-4 h-4" /> Exportar CSV</button>
        <label className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium cursor-pointer">
          <Download className="w-4 h-4 rotate-180" /> Importar CSV
          <input type="file" accept=".csv" className="hidden" onChange={() => alert('Funcionalidade em desenvolvimento')}/>
        </label>
      </div>
      
      {/* Modal Novo Contato */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button onClick={() => setShowModal(false)} className="absolute top-2 right-2 text-muted-foreground"><X /></button>
            <h2 className="text-lg font-bold mb-4">Novo Contato</h2>
            <form onSubmit={handleNovoContato} className="flex flex-col gap-3">
              <label className="text-sm font-medium">Nome
                <input required className="mt-1 w-full border rounded px-2 py-1 bg-background" value={novoContato.nome} onChange={e => setNovoContato({ ...novoContato, nome: e.target.value })} />
              </label>
              <label className="text-sm font-medium">Telefone
                <input required className="mt-1 w-full border rounded px-2 py-1 bg-background" value={novoContato.telefone} onChange={e => setNovoContato({ ...novoContato, telefone: e.target.value })} placeholder="+55..." />
              </label>
              <label className="text-sm font-medium">Email (opcional)
                <input type="email" className="mt-1 w-full border rounded px-2 py-1 bg-background" value={novoContato.email} onChange={e => setNovoContato({ ...novoContato, email: e.target.value })} placeholder="email@exemplo.com" />
              </label>
              <label className="text-sm font-medium">Canal
                <select className="mt-1 w-full border rounded px-2 py-1 bg-background" value={novoContato.canal} onChange={e => setNovoContato({ ...novoContato, canal: e.target.value })}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="email">Email</option>
                  <option value="webchat">Web Site</option>
                </select>
              </label>
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium mt-2">Salvar</button>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal Editar Contato */}
      {showEditModal && editingContact && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button onClick={() => setShowEditModal(false)} className="absolute top-2 right-2 text-muted-foreground"><X /></button>
            <h2 className="text-lg font-bold mb-4">Editar Contato</h2>
            <form onSubmit={handleEditContact} className="flex flex-col gap-3">
              <label className="text-sm font-medium">Nome
                <input required className="mt-1 w-full border rounded px-2 py-1 bg-background" value={editingContact.name} onChange={e => setEditingContact({ ...editingContact, name: e.target.value })} />
              </label>
              <label className="text-sm font-medium">Email
                <input className="mt-1 w-full border rounded px-2 py-1 bg-background" value={editingContact.email} onChange={e => setEditingContact({ ...editingContact, email: e.target.value })} />
              </label>
              <label className="text-sm font-medium">Telefone
                <input className="mt-1 w-full border rounded px-2 py-1 bg-background" value={editingContact.phone} onChange={e => setEditingContact({ ...editingContact, phone: e.target.value })} />
              </label>
              <label className="text-sm font-medium">Sender LID
                <input className="mt-1 w-full border rounded px-2 py-1 bg-background" value={editingContact.sender_lid} onChange={e => setEditingContact({ ...editingContact, sender_lid: e.target.value })} placeholder="249666566365270@lid" />
              </label>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium mt-2">Salvar Edição</button>
            </form>
          </div>
        </div>
      )}

      {message && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {message}
        </div>
      )}
      
      {/* Tabela de contatos */}
      <div className="overflow-x-auto rounded-lg shadow bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 w-12">
                <input 
                  type="checkbox" 
                  checked={selected.length === contatos.length && contatos.length > 0} 
                  onChange={selectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">CONTATO</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider w-24">CANAL</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">ÚLTIMO CONTATO</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">STATUS</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contatos.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum contato encontrado
                </td>
              </tr>
            ) : (
              contatos.map(contato => (
                <tr key={contato.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      checked={selected.includes(contato.id)} 
                      onChange={() => toggleSelect(contato.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                        {contato.avatar ? (
                          <img src={contato.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          (contato.name || 'C').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-card-foreground truncate">
                          {contato.name || 'Contato'}
                        </div>
                        {contato.email && (
                          <div className="text-xs text-muted-foreground truncate">
                            {contato.email}
                          </div>
                        )}
                        {contato.phone && (
                          <div className="text-xs text-muted-foreground truncate">
                            {cleanPhone(contato.phone)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <CanalDisplay canal={contato.inbox?.channel_type || ''} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {contato.updated_at ? new Date(contato.updated_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Ativo
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <button
                        onClick={() => openEditModal(contato)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Editar contato"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 