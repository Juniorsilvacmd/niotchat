import React, { useState } from 'react';
import { 
  Building, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Users,
  MessageCircle,
  Calendar,
  MoreVertical,
  Settings,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const CompanyManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const companies = [
    {
      id: 1,
      name: 'TechCorp Solutions',
      domain: 'techcorp.com',
      plan: 'Premium',
      users: 25,
      conversations: 1234,
      status: 'active',
      createdAt: '2024-01-15',
      lastActivity: '2 horas atrás',
      monthlyRevenue: 299.99,
      growth: '+12%'
    },
    {
      id: 2,
      name: 'StartupXYZ',
      domain: 'startupxyz.com',
      plan: 'Basic',
      users: 5,
      conversations: 456,
      status: 'active',
      createdAt: '2024-02-20',
      lastActivity: '1 dia atrás',
      monthlyRevenue: 99.99,
      growth: '+8%'
    },
    {
      id: 3,
      name: 'Enterprise Inc',
      domain: 'enterprise.com',
      plan: 'Enterprise',
      users: 100,
      conversations: 5678,
      status: 'active',
      createdAt: '2023-12-01',
      lastActivity: '30 min atrás',
      monthlyRevenue: 999.99,
      growth: '+25%'
    },
    {
      id: 4,
      name: 'Small Business Co',
      domain: 'smallbiz.com',
      plan: 'Basic',
      users: 3,
      conversations: 123,
      status: 'suspended',
      createdAt: '2024-03-10',
      lastActivity: '1 semana atrás',
      monthlyRevenue: 99.99,
      growth: '-5%'
    }
  ];

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'Basic': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Premium': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Enterprise': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'trial': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = companies.reduce((sum, company) => sum + company.monthlyRevenue, 0);
  const totalUsers = companies.reduce((sum, company) => sum + company.users, 0);
  const totalConversations = companies.reduce((sum, company) => sum + company.conversations, 0);

  return (
    <div className="flex-1 p-6 bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            <Building className="w-8 h-8 mr-3" />
            Gerenciamento de Empresas
          </h1>
          <p className="text-muted-foreground">Gerencie empresas clientes e seus planos de assinatura</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="niochat-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total de Empresas
                </p>
                <p className="text-2xl font-bold text-card-foreground">
                  {companies.length}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm font-medium text-green-500">+15%</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Building className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="niochat-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Receita Mensal
                </p>
                <p className="text-2xl font-bold text-card-foreground">
                  R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm font-medium text-green-500">+22%</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/20">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="niochat-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total de Usuários
                </p>
                <p className="text-2xl font-bold text-card-foreground">
                  {totalUsers}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm font-medium text-green-500">+18%</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/20">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="niochat-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total de Conversas
                </p>
                <p className="text-2xl font-bold text-card-foreground">
                  {totalConversations.toLocaleString('pt-BR')}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm font-medium text-green-500">+35%</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/20">
                <MessageCircle className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="niochat-card p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar empresas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="niochat-input pl-10 w-full"
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="niochat-button niochat-button-primary px-4 py-2 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Empresa</span>
            </button>
          </div>
        </div>

        {/* Companies Table */}
        <div className="niochat-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Usuários
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Conversas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Receita
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mr-3">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-card-foreground">
                            {company.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {company.domain}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanColor(company.plan)}`}>
                        {company.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm text-card-foreground">
                          {company.users}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm text-card-foreground">
                          {company.conversations.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-card-foreground">
                          R$ {company.monthlyRevenue.toFixed(2)}
                        </div>
                        <div className={`text-xs flex items-center ${
                          company.growth.startsWith('+') ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {company.growth.startsWith('+') ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {company.growth}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(company.status)}`}>
                        {company.status === 'active' ? 'Ativo' : 
                         company.status === 'suspended' ? 'Suspenso' : 'Teste'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="text-muted-foreground hover:text-primary p-1 rounded">
                          <Settings className="w-4 h-4" />
                        </button>
                        <button className="text-muted-foreground hover:text-primary p-1 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-muted-foreground hover:text-destructive p-1 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="text-muted-foreground hover:text-card-foreground p-1 rounded">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCompanies.length === 0 && (
            <div className="text-center py-12">
              <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                Nenhuma empresa encontrada
              </h3>
              <p className="text-muted-foreground">
                Tente ajustar a busca ou adicionar uma nova empresa.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyManagement;

