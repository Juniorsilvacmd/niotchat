import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Shield,
  User,
  Crown,
  Building
} from 'lucide-react';
import axios from 'axios';
import ReactDOM from 'react-dom';

// Remover completamente o array de usuários mockados
// const users = [
//   {
//     id: 1,
//     name: 'João Silva',
//     email: 'joao@empresa1.com',
//     role: 'agent',
//     company: 'Empresa 1',
//     status: 'active',
//     lastLogin: '2 horas atrás',
//     avatar: null
//   },
//   {
//     id: 2,
//     name: 'Maria Santos',
//     email: 'maria@empresa1.com',
//     role: 'company_admin',
//     company: 'Empresa 1',
//     status: 'active',
//     lastLogin: '1 dia atrás',
//     avatar: null
//   },
//   {
//     id: 3,
//     name: 'Pedro Oliveira',
//     email: 'pedro@empresa2.com',
//     role: 'agent',
//     company: 'Empresa 2',
//     status: 'inactive',
//     lastLogin: '1 semana atrás',
//     avatar: null
//   },
//   {
//     id: 4,
//     name: 'Ana Costa',
//     email: 'ana@sistema.com',
//     role: 'superadmin',
//     company: 'Sistema',
//     status: 'active',
//     lastLogin: '30 min atrás',
//     avatar: null
//   }
// ];

const PERMISSIONS = [
  { key: 'view_ai_conversations', label: 'Ver atendimentos com IA' },
  { key: 'view_assigned_conversations', label: 'Ver apenas atendimentos atribuídos a mim' },
  { key: 'view_team_unassigned', label: 'Ver atendimentos não atribuídos da minha equipe' },
  { key: 'manage_contacts', label: 'Gerenciar contatos' },
  { key: 'manage_reports', label: 'Gerenciar relatórios' },
  { key: 'manage_knowledge_base', label: 'Gerenciar base de conhecimento' },
];

const getUserRole = () => {
  // Tenta pegar do localStorage (ajuste se receber via prop)
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.role || user?.user_type || 'agent';
  } catch {
    return 'agent';
  }
};

const fetchUsers = async (token) => {
  const res = await axios.get('/api/users/', {
    headers: { Authorization: `Token ${token}` }
  });
  // Corrigir para usar results (paginação DRF)
  const user = JSON.parse(localStorage.getItem('user'));
  const company = user?.company;
  let usersList = res.data.results || [];
  if (company) {
    usersList = usersList.filter(u =>
      (u.company_users || []).some(cu => cu.company && String(cu.company.id) === String(company))
    );
  }
  return usersList;
};

const UserManagement = ({ provedorId }) => {
  console.log('UserManagement: Componente montado, provedorId:', provedorId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [provedores, setProvedores] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMenuId, setShowMenuId] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [editUserPermissions, setEditUserPermissions] = useState([]);
  const userRole = getUserRole();
  const initialAddUserForm = {
    new_username: '',
    email: '',
    new_password: '',
    user_type: 'agent',
    provedor_id: provedorId || '', // Usar o provedorId atual automaticamente
    is_active: true,
    permissions: [],
  };
  const [addUserForm, setAddUserForm] = useState(initialAddUserForm);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [usersState, setUsersState] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Buscar usuários reais do backend ao carregar o componente
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/users/', {
          headers: { Authorization: `Token ${token}` }
        });
        // Corrigir para usar results (paginação DRF)
        const user = JSON.parse(localStorage.getItem('user'));
        const company = user?.company;
        let usersList = res.data.results || [];
        if (company) {
          usersList = usersList.filter(u =>
            (u.company_users || []).some(cu => cu.company && String(cu.company.id) === String(company))
          );
        }
        setUsersState(usersList);
      } catch (err) {
        setUsersState(Array.isArray([]) ? [] : []);
      }
    };

    const fetchProvedores = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('Token não encontrado');
          return;
        }
        
        console.log('Carregando provedores...');
        const response = await axios.get('/api/provedores/', {
          headers: { Authorization: `Token ${token}` }
        });
        
        const provedoresData = response.data.results || response.data;
        console.log('Provedores carregados:', provedoresData);
        setProvedores(provedoresData);
      } catch (error) {
        console.error('Erro ao carregar provedores:', error);
        // Em caso de erro, criar um provedor padrão para teste
        setProvedores([{ id: 1, nome: 'MEGA FIBRA' }]);
      }
    };

    fetchAllUsers();
    fetchProvedores();
  }, []);

  // Atualizar automaticamente o provedor_id quando o provedorId mudar
  useEffect(() => {
    if (provedorId) {
      setAddUserForm(prev => ({
        ...prev,
        provedor_id: provedorId
      }));
      console.log('Provedor ID atualizado automaticamente:', provedorId);
    }
  }, [provedorId]);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin': return Crown;
      case 'admin': return Shield;
      case 'agent': return User;
      default: return User;
    }
  };

  // Função para traduzir o papel
  const getRoleLabel = (role) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'agent': return 'Atendente';
      default: return 'Usuário';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'superadmin': return 'text-yellow-500';
      case 'admin': return 'text-blue-500';
      case 'agent': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'text-green-500' : 'text-red-500';
  };

  const handleAddUserChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddUserForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Atualiza permissões ao trocar papel
  const handleRoleChange = (e) => {
    const value = e.target.value;
    setAddUserForm((prev) => ({
      ...prev,
      user_type: value,
      permissions: value === 'admin' ? PERMISSIONS.map(p => p.key) : [],
    }));
  };

  // Função para salvar permissões
  const handleSaveUserPermissions = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/users/${selectedUser.id}/`, {
        permissions: editUserPermissions
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Atualizar a lista de usuários
      const updatedUsers = usersState.map(user => 
        user.id === selectedUser.id 
          ? { ...user, permissions: editUserPermissions }
          : user
      );
      setUsersState(updatedUsers);
      
      alert('Permissões salvas com sucesso!');
      handleCloseEditModal();
    } catch (err) {
      alert('Erro ao salvar permissões!');
    }
  };

  // Função para atualizar permissões
  const handlePermissionChange = (permissionKey, checked) => {
    if (checked) {
      setEditUserPermissions(prev => [...prev, permissionKey]);
    } else {
      setEditUserPermissions(prev => prev.filter(p => p !== permissionKey));
    }
  };

  // Função para atualizar permissões no modal de adicionar usuário
  const handleAddUserPermissionChange = (e) => {
    const { value, checked } = e.target;
    setAddUserForm((prev) => {
      let newPerms = prev.permissions || [];
      if (checked) {
        newPerms = [...newPerms, value];
      } else {
        newPerms = newPerms.filter(p => p !== value);
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoadingAdd(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/users/', {
        username: addUserForm.new_username,
        email: addUserForm.email,
        password: addUserForm.new_password,
        user_type: addUserForm.user_type,
        provedor_id: addUserForm.provedor_id,
        is_active: addUserForm.is_active,
        permissions: addUserForm.permissions
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      // Buscar lista atualizada após adicionar
      const usersList = await fetchUsers(token);
      setUsersState(usersList);
      setShowAddModal(false);
      setAddUserForm(initialAddUserForm);
      alert('Usuário adicionado com sucesso!');
    } catch (err) {
      if (err.response && err.response.data) {
        if (err.response.data.username) {
          setErrorMsg(err.response.data.username[0]);
        } else if (typeof err.response.data === 'string') {
          setErrorMsg(err.response.data);
        } else {
          setErrorMsg('Erro ao adicionar usuário!');
        }
      } else {
        setErrorMsg('Erro ao adicionar usuário!');
      }
    } finally {
      setLoadingAdd(false);
    }
  };

  const filteredUsers = usersState.filter(user => {
    const matchesSearch =
      (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.company || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.user_type === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditUserPermissions(user.permissions || []);
    setShowEditModal(true);
    setShowMenuId(null);
  };

  const handleDeleteUser = async (user) => {
    setShowMenuId(null);
    if (!window.confirm(`Tem certeza que deseja excluir o usuário: ${user.username || user.email || user.name}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/users/${user.id}/`, {
        headers: { Authorization: `Token ${token}` }
      });
      // Atualiza a lista de usuários
      setUsersState(usersState.filter(u => u.id !== user.id));
      alert('Usuário excluído com sucesso!');
    } catch (err) {
      alert('Erro ao excluir usuário!');
    }
  };

  const handleResetPassword = (user) => {
    setUserToReset(user);
    setShowResetModal(true);
    setShowMenuId(null);
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setUserToReset(null);
  };

  const handleToggleMenu = (userId) => {
    setShowMenuId(showMenuId === userId ? null : userId);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    setEditUserPermissions([]);
  };

  // Sempre resetar o formulário ao abrir o modal
  const handleOpenAddModal = async () => {
    setAddUserForm(initialAddUserForm);
    setShowAddModal(true);
    
    // SEMPRE forçar carregamento dos provedores quando abrir o modal
    console.log('# Debug logging removed for security Modal aberto - forçando carregamento de provedores...');
    try {
      const token = localStorage.getItem('token');
      console.log('# Debug logging removed for security Token encontrado:', token ? 'SIM' : 'NÃO');
      
      if (token) {
        console.log('# Debug logging removed for security Fazendo chamada para API...');
        const response = await axios.get('/api/provedores/', {
          headers: { Authorization: `Token ${token}` }
        });
        const provedoresData = response.data.results || response.data;
        console.log('# Debug logging removed for security Provedores carregados no modal:', provedoresData);
        setProvedores(provedoresData);
      } else {
        console.error('# Debug logging removed for security Token não encontrado!');
      }
    } catch (error) {
      console.error('# Debug logging removed for security Erro ao carregar provedores no modal:', error);
      // Fallback: criar provedor padrão
      setProvedores([{ id: 1, nome: 'MEGA FIBRA (Fallback)' }]);
    }
  };

  // Função para ativar/desativar usuário
  const handleToggleUserStatus = async (user) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/users/${user.id}/`, {
        is_active: !user.is_active
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Atualizar a lista de usuários
      const updatedUsers = usersState.map(u => 
        u.id === user.id 
          ? { ...u, is_active: !u.is_active }
          : u
      );
      setUsersState(updatedUsers);
      
      alert(`Usuário ${user.is_active ? 'desativado' : 'ativado'} com sucesso!`);
      handleCloseEditModal();
    } catch (err) {
      alert('Erro ao alterar status do usuário!');
    }
  };

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            <Users className="w-8 h-8 mr-3" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground">Gerencie usuários, permissões e acessos do sistema</p>
        </div>

        {/* Statistics - agora em cima */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          <div className="niochat-card p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold text-card-foreground">{usersState.length}</p>
              </div>
            </div>
          </div>

          <div className="niochat-card p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-500/20">
                <User className="w-6 h-6 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Atendentes</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {usersState.filter(u => u.user_type === 'agent').length}
                </p>
              </div>
            </div>
          </div>

          <div className="niochat-card p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-500/20">
                <Shield className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Administradores</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {usersState.filter(u => u.user_type === 'admin').length}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Filters and Actions */}
        <div className="niochat-card p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="niochat-input pl-10 w-full"
                />
              </div>

              {/* Role Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="niochat-input min-w-[150px]"
                >
                  <option value="all">Todos os Papéis</option>
                  <option value="superadmin">Super Admin</option>
                  <option value="admin">Admin da Empresa</option>
                  <option value="agent">Atendente</option>
                </select>
              </div>
            </div>

            {/* Add User Button */}
            <button
              onClick={handleOpenAddModal}
              className="niochat-button niochat-button-primary px-4 py-2 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Usuário</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="niochat-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Função
                  </th>
                  {/* Removido Empresa */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Último Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.user_type);
                  return (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mr-3">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-card-foreground">
                              {user.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <RoleIcon className={`w-4 h-4 mr-2 ${getRoleColor(user.user_type)}`} />
                          <span className="text-sm text-card-foreground">
                            {getRoleLabel(user.user_type)}
                          </span>
                        </div>
                      </td>
                      {/* Removido Empresa */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1 text-green-600">Ativo</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">Inativo</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                        <button
                          className="text-muted-foreground hover:text-card-foreground p-1 rounded"
                          onClick={() => handleToggleMenu(user.id)}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {showMenuId === user.id && (
                          <div
                            className="absolute z-50 w-44 bg-card border border-border rounded shadow-lg flex flex-col items-stretch"
                            style={{ left: '-30px', top: '40%', transform: 'translateY(-50%)' }}
                          >
                            <button
                              className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-b border-border flex items-center gap-2"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="inline w-4 h-4" /> Editar usuário
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 hover:bg-muted text-sm text-destructive border-b border-border flex items-center gap-2"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <Trash2 className="inline w-4 h-4" /> Excluir usuário
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 hover:bg-muted text-sm flex items-center gap-2"
                              onClick={() => handleResetPassword(user)}
                            >
                              <span className="inline-block w-4 h-4"># Debug logging removed for security</span> Redefinir senha
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 hover:bg-muted text-sm flex items-center gap-2"
                              onClick={() => handleToggleUserStatus(user)}
                            >
                              <span className="inline-block w-4 h-4">⚙️</span> {user.is_active ? 'Inativar acesso' : 'Reativar acesso'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                Nenhum usuário encontrado
              </h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros ou adicionar um novo usuário.
              </p>
            </div>
          )}
        </div>

        {/* Modal de edição de usuário */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card rounded-lg shadow-lg p-8 w-full max-w-lg relative">
              <button
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                onClick={handleCloseEditModal}
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-4">Editar Usuário</h2>
              <form className="space-y-4" onSubmit={handleSaveUserPermissions}>
                <div>
                  <label className="block text-sm font-medium mb-1">Nome</label>
                  <input type="text" className="niochat-input w-full" defaultValue={selectedUser.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">E-mail</label>
                  <input type="email" className="niochat-input w-full" defaultValue={selectedUser.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Permissões</label>
                  <div className="flex flex-col gap-2">
                    {PERMISSIONS.map(perm => (
                      <label key={perm.key} className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          value={perm.key}
                          checked={editUserPermissions.includes(perm.key)}
                          onChange={(e) => handlePermissionChange(perm.key, e.target.checked)}
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded font-bold ${selectedUser.is_active ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                    onClick={() => handleToggleUserStatus(selectedUser)}
                  >
                    {selectedUser.is_active ? 'Inativar acesso' : 'Reativar acesso'}
                  </button>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" className="niochat-button" onClick={handleCloseEditModal}>Cancelar</button>
                  <button type="submit" className="niochat-button niochat-button-primary">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de redefinir senha */}
        {showResetModal && userToReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card rounded-lg shadow-lg p-8 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                onClick={handleCloseResetModal}
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-4">Redefinir senha de {userToReset.name}</h2>
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); alert('Senha redefinida!'); handleCloseResetModal(); }}>
                <div>
                  <label className="block text-sm font-medium mb-1">Nova senha</label>
                  <input type="password" className="niochat-input w-full" required />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" className="niochat-button" onClick={handleCloseResetModal}>Cancelar</button>
                  <button type="submit" className="niochat-button niochat-button-primary">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#23272f] rounded-xl shadow-2xl p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto mx-2 border border-border">
              <button className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl" onClick={() => setShowAddModal(false)}>
                ×
              </button>
              <h2 className="text-2xl font-bold mb-6 text-white">Adicionar Usuário</h2>
              <form onSubmit={handleAddUser} className="space-y-4" autoComplete="off">
                <div>
                  <label className="block text-gray-200 text-sm font-bold mb-2">Usuário</label>
                  <input type="text" name="new_username" autoComplete="off" className="w-full px-4 py-2 rounded bg-background text-white border border-border" value={addUserForm.new_username} onChange={handleAddUserChange} required />
                </div>
                {errorMsg && (
                  <div className="text-red-400 text-sm mb-2">{errorMsg}</div>
                )}
                <div>
                  <label className="block text-gray-200 text-sm font-bold mb-2">E-mail</label>
                  <input type="email" name="email" autoComplete="off" className="w-full px-4 py-2 rounded bg-background text-white border border-border" value={addUserForm.email} onChange={handleAddUserChange} required />
                </div>
                <div>
                  <label className="block text-gray-200 text-sm font-bold mb-2">Senha</label>
                  <input type="password" name="new_password" autoComplete="off" className="w-full px-4 py-2 rounded bg-background text-white border border-border" value={addUserForm.new_password} onChange={handleAddUserChange} required />
                </div>
                <div>
                  <label className="block text-gray-200 text-sm font-bold mb-2">Papel</label>
                  <select
                    name="user_type"
                    className="w-full px-4 py-2 rounded bg-background text-white border border-border"
                    value={addUserForm.user_type}
                    onChange={handleRoleChange}
                    required
                  >
                    <option value="agent">Atendente</option>
                    <option value="admin">Admin da Empresa</option>
                    {userRole === 'superadmin' && <option value="superadmin">Super Admin</option>}
                  </select>
                </div>
                
                {/* Campo hidden para enviar o provedor_id automaticamente */}
                <input type="hidden" name="provedor_id" value={provedorId} />
                
                <div>
                  <label className="block text-gray-200 text-sm font-bold mb-2">Permissões</label>
                  <div className="flex flex-col gap-2">
                    {PERMISSIONS.map(perm => (
                      <label key={perm.key} className="flex items-center gap-2 text-gray-300">
                        <input
                          type="checkbox"
                          value={perm.key}
                          checked={addUserForm.permissions.includes(perm.key)}
                          onChange={handleAddUserPermissionChange}
                          disabled={addUserForm.user_type === 'admin'}
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="is_active" checked={addUserForm.is_active} onChange={handleAddUserChange} />
                  <label className="text-sm text-gray-200">Usuário ativo</label>
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-primary/80 transition"
                  disabled={loadingAdd}
                >
                  {loadingAdd ? 'Adicionando...' : 'Adicionar Usuário'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;

