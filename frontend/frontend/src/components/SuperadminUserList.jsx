import React, { useEffect, useState, useRef } from 'react';
import { Users, Building, CheckCircle, XCircle, CircleDot, Circle, Plus, MoreVertical, Edit, Trash2, KeyRound, Power } from 'lucide-react';
import axios from 'axios';
import ReactDOM from 'react-dom';

export default function SuperadminUserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [provedores, setProvedores] = useState([]);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    user_type: 'agent',
    is_active: true,
    provedor_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [showMenuId, setShowMenuId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const menuBtnRefs = useRef({});
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/users/', {
          headers: { Authorization: `Token ${token}` }
        });
        setUsers(res.data.results || res.data);
      } catch (e) {
        setError('Erro ao buscar usuários.');
        setUsers([]);
      }
      setLoading(false);
    }
    fetchUsers();
  }, [success]);

  useEffect(() => {
    async function fetchProvedores() {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/provedores/', {
          headers: { Authorization: `Token ${token}` }
        });
        const provedoresData = res.data.results || res.data;
        setProvedores(provedoresData);
      } catch (e) {
        console.error('Erro ao buscar provedores:', e);
        setProvedores([]);
      }
    }
    if (showModal) fetchProvedores();
  }, [showModal]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      // Cria usuário
      const userRes = await axios.post('/api/users/', {
        username: form.username,
        email: form.email,
        password: form.password,
        user_type: form.user_type,
        is_active: form.is_active,
        provedor_id: form.provedor_id, // Incluir provedor_id para associação automática
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      // Não é necessário criar CompanyUser manualmente - o backend já faz a associação
      console.log('Usuário criado e associado ao provedor com sucesso!');
             setSuccess('Usuário criado com sucesso!');
       setShowModal(false);
       setForm({ username: '', email: '', password: '', user_type: 'agent', is_active: true, provedor_id: '' });
    } catch (e) {
      let msg = 'Erro ao criar usuário.';
      if (e.response && e.response.data) {
        if (typeof e.response.data === 'string') msg = e.response.data;
        else if (e.response.data.detail) msg = e.response.data.detail;
        else msg += ' ' + JSON.stringify(e.response.data);
      }
      setError(msg);
    }
    setSaving(false);
  };

  // Funções de ação
  const handleOpenMenu = (userId) => (e) => {
    e.stopPropagation();
    const btn = menuBtnRefs.current[userId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 160 // ajusta para alinhar à direita
      });
    }
    setShowMenuId(showMenuId === userId ? null : userId);
  };
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
    setShowMenuId(null);
  };
  const handleDeleteUser = async (user) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/users/${user.id}/`, {
        headers: { Authorization: `Token ${token}` }
      });
      setSuccess('Usuário excluído com sucesso!');
    } catch (e) {
      setError('Erro ao excluir usuário.');
    }
    setShowMenuId(null);
  };
  const handleToggleActive = async (user) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/users/${user.id}/`, { is_active: !user.is_active }, {
        headers: { Authorization: `Token ${token}` }
      });
      setSuccess('Status atualizado!');
    } catch (e) {
      setError('Erro ao atualizar status.');
    }
    setShowMenuId(null);
  };
  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setShowResetModal(true);
    setShowMenuId(null);
  };

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
              <Users className="w-8 h-8 mr-3" />
              Usuários do Sistema
            </h1>
            <p className="text-muted-foreground">Veja todos os usuários, provedores, status e último acesso</p>
          </div>
          <button
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded font-medium shadow hover:bg-primary/90"
            onClick={() => setShowModal(true)}
          >
            <Plus className="w-5 h-5" /> Criar Usuário
          </button>
        </div>
        {loading ? (
          <div className="text-center text-muted-foreground py-10">Carregando usuários...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-10">{error}</div>
        ) : (
          <div className="bg-card rounded-lg shadow p-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Usuário</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                                      <th className="px-4 py-2 text-left">Provedores</th>
                  <th className="px-4 py-2 text-center">Ativo</th>
                  <th className="px-4 py-2 text-center">Online</th>
                  <th className="px-4 py-2 text-center">Último acesso</th>
                  <th className="px-4 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted-foreground py-10">Nenhum usuário encontrado.</td>
                  </tr>
                )}
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-muted/50">
                    <td className="px-4 py-2 font-semibold">{user.username}</td>
                    <td className="px-4 py-2">{user.email || '-'}</td>
                    <td className="px-4 py-2">{user.user_type}</td>
                    <td className="px-4 py-2">
                      {(user.provedores_admin || []).length === 0 && (
                        <span className="text-gray-400 text-xs">Sem provedor</span>
                      )}
                      {(user.provedores_admin || []).map((p, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-blue-900/80 text-blue-100 rounded px-2 py-1 mr-1 text-xs font-semibold">
                          <Building className="w-3 h-3" /> {p.nome} (Admin)
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> Ativo</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" /> Inativo</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {user.is_online ? (
                        <span className="inline-flex items-center gap-1 text-green-600"><CircleDot className="w-4 h-4" /> Online</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400"><Circle className="w-4 h-4" /> Offline</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {user.last_seen ? new Date(user.last_seen).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-2 text-center relative">
                      <button ref={el => (menuBtnRefs.current[user.id] = el)} className="p-1 hover:bg-muted rounded" onClick={handleOpenMenu(user.id)}>
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Portal para menu de ações */}
            {showMenuId && menuBtnRefs.current[showMenuId] && ReactDOM.createPortal(
              <div
                className="bg-white border border-border rounded shadow-lg z-[9999] min-w-[160px] flex flex-col w-max fixed"
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={() => handleEditUser(users.find(u => u.id === showMenuId))}><Edit className="w-4 h-4" /> Editar</button>
                <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={() => handleResetPassword(users.find(u => u.id === showMenuId))}><KeyRound className="w-4 h-4" /> Redefinir Senha</button>
                <button className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-muted" onClick={() => handleToggleActive(users.find(u => u.id === showMenuId))}><Power className="w-4 h-4" /> {users.find(u => u.id === showMenuId)?.is_active ? 'Inativar' : 'Ativar'}</button>
                <button className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-muted" onClick={() => handleDeleteUser(users.find(u => u.id === showMenuId))}><Trash2 className="w-4 h-4" /> Excluir</button>
              </div>,
              document.body
            )}
          </div>
        )}

        {/* Modal de edição de usuário */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#23272f] rounded-xl shadow-2xl p-8 w-full max-w-md relative border border-border">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl" onClick={() => setShowEditModal(false)}>&times;</button>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white"><Edit /> Editar Usuário</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                setError('');
                try {
                  const token = localStorage.getItem('token');
                  await axios.patch(`/api/users/${selectedUser.id}/`, {
                    username: selectedUser.username,
                    email: selectedUser.email,
                    user_type: selectedUser.user_type,
                    is_active: selectedUser.is_active,
                  }, {
                    headers: { Authorization: `Token ${token}` }
                  });
                  setSuccess('Usuário atualizado com sucesso!');
                  setShowEditModal(false);
                } catch (e) {
                  setError('Erro ao atualizar usuário.');
                }
                setSaving(false);
              }} className="space-y-5">
                <div>
                  <label className="block font-medium mb-1 text-gray-200">Usuário</label>
                  <input type="text" value={selectedUser.username} onChange={e => setSelectedUser({ ...selectedUser, username: e.target.value })} className="input w-full bg-[#181b20] text-white border border-border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-gray-200">E-mail</label>
                  <input type="email" value={selectedUser.email} onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })} className="input w-full bg-[#181b20] text-white border border-border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-gray-200">Tipo</label>
                  <select value={selectedUser.user_type} onChange={e => setSelectedUser({ ...selectedUser, user_type: e.target.value })} className="input w-full bg-[#181b20] text-white border border-border rounded px-3 py-2">
                    <option value="superadmin">Superadmin</option>
                    <option value="admin">Administrador</option>
                    <option value="agent">Atendente</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedUser.is_active} onChange={e => setSelectedUser({ ...selectedUser, is_active: e.target.checked })} />
                  <label className="font-medium text-gray-200">Ativo</label>
                </div>
                <div>
                  <button type="submit" className="bg-primary text-white px-6 py-2 rounded font-medium w-full mt-2 hover:bg-primary/90 transition" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de redefinir senha */}
        {showResetModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#23272f] rounded-xl shadow-2xl p-8 w-full max-w-md relative border border-border">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl" onClick={() => setShowResetModal(false)}>&times;</button>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white"><KeyRound /> Redefinir Senha</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                setError('');
                try {
                  const token = localStorage.getItem('token');
                  await axios.patch(`/api/users/${selectedUser.id}/`, {
                    password: selectedUser.new_password,
                  }, {
                    headers: { Authorization: `Token ${token}` }
                  });
                  setSuccess('Senha redefinida com sucesso!');
                  setShowResetModal(false);
                } catch (e) {
                  setError('Erro ao redefinir senha.');
                }
                setSaving(false);
              }} className="space-y-5">
                <div>
                  <label className="block font-medium mb-1 text-gray-200">Nova Senha</label>
                  <input type="password" value={selectedUser.new_password || ''} onChange={e => setSelectedUser({ ...selectedUser, new_password: e.target.value })} className="input w-full bg-[#181b20] text-white border border-border rounded px-3 py-2" required />
                </div>
                <div>
                  <button type="submit" className="bg-primary text-white px-6 py-2 rounded font-medium w-full mt-2 hover:bg-primary/90 transition" disabled={saving}>
                    {saving ? 'Salvando...' : 'Redefinir Senha'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de criação de usuário */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#23272f] rounded-xl shadow-2xl p-8 w-full max-w-md relative border border-border">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl" onClick={() => setShowModal(false)}>&times;</button>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white"><Plus /> Criar Novo Usuário</h2>
              {error && <div className="text-red-400 mb-2">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block font-medium mb-1 text-gray-200">Usuário</label>
                  <input type="text" name="username" value={form.username} onChange={handleChange} className="input w-full bg-[#181b20] text-white border border-border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-gray-200">E-mail</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className="input w-full bg-[#181b20] text-white border border-border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-gray-200">Senha</label>
                  <input type="password" name="password" value={form.password} onChange={handleChange} className="input w-full bg-[#181b20] text-white border border-border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-gray-200">Tipo</label>
                  <select name="user_type" value={form.user_type} onChange={handleChange} className="input w-full bg-[#181b20] text-white border border-border rounded px-3 py-2">
                    <option value="superadmin">Superadmin</option>
                    <option value="admin">Administrador</option>
                    <option value="agent">Atendente</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-gray-200">Provedor</label>
                  <select name="provedor_id" value={form.provedor_id} onChange={handleChange} className="input w-full bg-[#181b20] text-white border border-border rounded px-3 py-2">
                    <option value="">Selecione...</option>
                    {provedores.map(provedor => (
                      <option key={provedor.id} value={provedor.id}>{provedor.nome}</option>
                    ))}
                    {provedores.length === 0 && (
                      <option disabled>Carregando provedores...</option>
                    )}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                  <label className="font-medium text-gray-200">Ativo</label>
                </div>
                <div>
                  <button type="submit" className="bg-primary text-white px-6 py-2 rounded font-medium w-full mt-2 hover:bg-primary/90 transition" disabled={saving}>
                    {saving ? 'Salvando...' : 'Criar Usuário'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 