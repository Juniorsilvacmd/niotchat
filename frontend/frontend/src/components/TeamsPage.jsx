import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import AddEditTeamModal from './AddEditTeamModal';

const TeamsPage = () => {
  console.log('TeamsPage está sendo renderizado');
  
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Buscar equipes do backend
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/teams/', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Erro ao buscar equipes');
        }
        
        const data = await response.json();
        setTeams(data.results || data);
      } catch (err) {
        console.error('Erro ao buscar equipes:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const handleAddTeam = () => {
    setEditingTeam(null);
    setIsModalOpen(true);
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const handleDeleteTeam = async (teamId) => {
    if (window.confirm('Tem certeza que deseja apagar esta equipe?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/teams/${teamId}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          setTeams(teams.filter(team => team.id !== teamId));
        } else {
          alert('Erro ao apagar equipe');
        }
      } catch (err) {
        console.error('Erro ao apagar equipe:', err);
        alert('Erro ao apagar equipe');
      }
    }
  };

  const handleSaveTeam = async (teamData) => {
    try {
      const token = localStorage.getItem('token');
      const teamPayload = {
        name: teamData.name,
        description: '',
        // Adicionar membros selecionados
        members: teamData.selectedMembers.map(member => member.id)
      };

      let response;
      if (editingTeam) {
        // Editar equipe existente
        response = await fetch(`/api/teams/${editingTeam.id}/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(teamPayload)
        });
      } else {
        // Criar nova equipe
        response = await fetch('/api/teams/', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(teamPayload)
        });
      }
      
      if (response.ok) {
        const savedTeam = await response.json();
        
        if (editingTeam) {
          setTeams(teams.map(team => 
            team.id === editingTeam.id ? savedTeam : team
          ));
        } else {
          setTeams([...teams, savedTeam]);
        }
        
        setIsModalOpen(false);
      } else {
        const errorData = await response.json();
        alert(`Erro ao salvar equipe: ${errorData.detail || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error('Erro ao salvar equipe:', err);
      alert('Erro ao salvar equipe');
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-background text-foreground min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando equipes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-background text-foreground min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">Erro: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background text-foreground min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações de Equipes</h1>
        <Button onClick={handleAddTeam} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-4">
        {teams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma equipe encontrada. Clique em "Adicionar" para criar uma nova equipe.
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="flex justify-between items-center p-4 border border-border rounded-lg bg-muted/50">
              <div className="flex items-center gap-4">
                <span className="text-foreground font-bold">#{team.id}</span>
                <div>
                  <div className="font-medium text-foreground">{team.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Membros: {team.members?.length || 0}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTeam(team)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTeam(team.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Apagar
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddEditTeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTeam}
        team={editingTeam}
      />
    </div>
  );
};

export default TeamsPage; 