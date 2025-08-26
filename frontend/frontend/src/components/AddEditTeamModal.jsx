import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { X, Check, ChevronRight, ChevronLeft } from 'lucide-react';

const AddEditTeamModal = ({ isOpen, onClose, onSave, team }) => {
  console.log('AddEditTeamModal renderizado, isOpen:', isOpen);
  const [formData, setFormData] = useState({
    name: '',
    selectedMembers: []
  });

  const [allMembers, setAllMembers] = useState([]); // Lista fixa de todos os usuários
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [selectedItems, setSelectedItems] = useState([]);
  const [availableFilter, setAvailableFilter] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');

  // Buscar usuários do sistema
  useEffect(() => {
    console.log('Iniciando busca inicial de usuários...');
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        // Logs removidos por segurança
        console.log('URL da requisição:', '/api/users/');
        
        const response = await fetch('/api/users/', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro na resposta:', errorText);
          throw new Error(`Erro ao buscar usuários: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Dados brutos da API:', data);
        const users = data.results || data;
        console.log('Usuários recebidos da API:', users);
        
        // Formatar usuários para o formato esperado
        const formattedUsers = users.map(user => {
          const name = `${user.first_name || user.username} ${user.last_name || ''}`.trim() || user.username;
          console.log('Formatando usuário:', user, 'nome final:', name);
          return {
            id: user.id,
            name: name
          };
        });
        
        console.log('Usuários formatados:', formattedUsers);
        setAllMembers(formattedUsers); // Armazenar todos os usuários
      } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        // Fallback para dados de exemplo
        setAllMembers([
          { id: 1, name: 'Gabriel - Pedro Gabriel' },
          { id: 2, name: 'João Silva' },
          { id: 3, name: 'Maria Santos' }
        ]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    console.log('Team data:', team);
    if (team) {
      console.log('Team members:', team.members);
      console.log('Detalhes dos membros:', team.members?.map(m => ({ id: m.id, name: m.name, hasName: !!m.name })));
      
      // Formatar os membros da equipe para o formato esperado
      const formattedMembers = team.members?.map(member => ({
        id: member.user.id, // Usar o ID do usuário, não do TeamMember
        name: `${member.user.first_name || member.user.username} ${member.user.last_name || ''}`.trim() || member.user.username
      })) || [];
      
      console.log('Membros formatados:', formattedMembers);
      
      setFormData({
        name: team.name || '',
        selectedMembers: formattedMembers
      });
    } else {
      setFormData({
        name: '',
        selectedMembers: []
      });
    }
  }, [team]);

  // Calcular membros disponíveis dinamicamente
  const availableMembers = allMembers.filter(
    member => !formData.selectedMembers.some(selected => selected.id === member.id)
  );

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    console.log('handleSave chamado');
    if (!formData.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }
    
    if (formData.selectedMembers.length === 0) {
      alert('Pelo menos um membro deve ser selecionado');
      return;
    }
    
    console.log('Salvando equipe:', formData);
    onSave(formData);
  };

  console.log('Estado atual - allMembers:', allMembers);
  console.log('Estado atual - formData.selectedMembers:', formData.selectedMembers);
  console.log('Estado atual - availableMembers (calculado):', availableMembers);
  console.log('Estado atual - availableFilter:', availableFilter);
  console.log('Estado atual - selectedFilter:', selectedFilter);

  const filteredAvailable = availableMembers.filter(member =>
    member && member.name && member.name.toLowerCase().includes(availableFilter.toLowerCase())
  );

  const filteredSelected = formData.selectedMembers.filter(member =>
    member && member.name && member.name.toLowerCase().includes(selectedFilter.toLowerCase())
  );

  console.log('filteredAvailable:', filteredAvailable);
  console.log('filteredSelected:', filteredSelected);

  const toggleAvailableSelection = (member) => {
    setSelectedItems(prev => 
      prev.some(item => item.id === member.id)
        ? prev.filter(item => item.id !== member.id)
        : [...prev, member]
    );
  };

  const toggleSelectedSelection = (member) => {
    setSelectedItems(prev => 
      prev.some(item => item.id === member.id)
        ? prev.filter(item => item.id !== member.id)
        : [...prev, member]
    );
  };

  const moveToSelected = () => {
    const newSelected = [...formData.selectedMembers, ...selectedItems];
    setFormData(prev => ({ ...prev, selectedMembers: newSelected }));
    setSelectedItems([]);
  };

  const moveToAvailable = () => {
    const newSelected = formData.selectedMembers.filter(member => 
      !selectedItems.some(selected => selected.id === member.id)
    );
    setFormData(prev => ({ ...prev, selectedMembers: newSelected }));
    setSelectedItems([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose}></div>
      <div className="relative bg-background border border-border rounded-lg p-6 max-w-5xl w-full mx-8 mb-8 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">Adicionar Equipe</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* Nome */}
          <div>
            <Label htmlFor="name" className="text-foreground">Nome *</Label>
            <Input
              id="name"
              placeholder="Nome"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="text-foreground"
            />
          </div>

          {/* Membros */}
          <div>
            <Label className="text-foreground">Membros *</Label>

            <div className="grid grid-cols-3 gap-6 mt-2">
              {/* Não Selecionados */}
              <div className="border border-border rounded-lg overflow-hidden bg-muted/50">
                <div className="bg-blue-600/20 p-4">
                  <div className="font-medium mb-2 text-foreground">Não Selecionados</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {loadingUsers ? 'Carregando...' : `${availableMembers.length} agente(s)`}
                  </div>
                  <Input
                    placeholder="Filtro"
                    value={availableFilter}
                    onChange={(e) => setAvailableFilter(e.target.value)}
                    className="text-foreground"
                  />
                </div>
                <div className="p-4">
                  <div className="border border-border rounded h-32 overflow-y-auto bg-background">
                    {loadingUsers ? (
                      <div className="p-2 text-muted-foreground">Carregando usuários...</div>
                    ) : filteredAvailable.length === 0 ? (
                      <div className="p-2 text-muted-foreground">Nenhum usuário disponível</div>
                    ) : (
                      filteredAvailable.map((member) => {
                        const isSelected = selectedItems.some(item => item.id === member.id);
                        console.log('Renderizando usuário disponível:', member);
                        return (
                          <div
                            key={member.id}
                            className={`p-2 cursor-pointer hover:bg-muted text-foreground flex items-center justify-between ${
                              isSelected ? 'bg-accent border border-primary' : ''
                            }`}
                            onClick={() => toggleAvailableSelection(member)}
                          >
                            <span>{member.name || 'Nome não disponível'}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={moveToSelected}
                  disabled={selectedItems.filter(item => 
                    availableMembers.some(available => available.id === item.id)
                  ).length === 0}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={moveToAvailable}
                  disabled={selectedItems.filter(item => 
                    formData.selectedMembers.some(selected => selected.id === item.id)
                  ).length === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>

              {/* Selecionados */}
              <div className="border border-border rounded-lg overflow-hidden bg-muted/50">
                <div className="bg-blue-600/20 p-4">
                  <div className="font-medium mb-2 text-foreground">Selecionados</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {formData.selectedMembers.length === 0 ? 'Lista Vazia' : `${formData.selectedMembers.length} agente(s)`}
                  </div>
                  <Input
                    placeholder="Filtro"
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="text-foreground"
                  />
                </div>
                <div className="p-4">
                  <div className="border border-border rounded h-32 overflow-y-auto bg-background">
                    {filteredSelected.length === 0 ? (
                      <div className="p-2 text-muted-foreground">Nenhum membro selecionado</div>
                    ) : (
                      filteredSelected.map((member) => {
                        const isSelected = selectedItems.some(item => item.id === member.id);
                        console.log('Renderizando membro selecionado:', member);
                        return (
                          <div
                            key={member.id}
                            className={`p-2 cursor-pointer hover:bg-muted text-foreground flex items-center justify-between ${
                              isSelected ? 'bg-accent border border-primary' : ''
                            }`}
                            onClick={() => toggleSelectedSelection(member)}
                          >
                            <span>{member.name || 'Nome não disponível'}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddEditTeamModal; 