import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const REDES = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
];

export default function ProviderDataForm() {
  const { provedorId } = useParams();
  const [form, setForm] = useState({
    nome: '',
    site_oficial: '',
    endereco: '',
    redes_sociais: {},
    id: null,
    nome_agente_ia: '',
    estilo_personalidade: '',
    modo_falar: '',
    uso_emojis: '',
    personalidade: '',
    email_contato: '',
    taxa_adesao: '',
    multa_cancelamento: '',
    tipo_conexao: '',
    prazo_instalacao: '',
    documentos_necessarios: '',
    planos_internet: '',
    planos_descricao: '',
  });
  const [personalidadeAvancadaEnabled, setPersonalidadeAvancadaEnabled] = useState(false);
  const [personalidadeAvancada, setPersonalidadeAvancada] = useState({
    vicios_linguagem: '',
    caracteristicas: '',
    principios: '',
    humor: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Extrair fetchData para fora do useEffect
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Buscar o provedor específico pelo ID
      const res = await axios.get(`/api/provedores/${provedorId}/`, {
        headers: { Authorization: `Token ${token}` }
      });
      
      if (res.data) {
        setForm({
          nome: res.data.nome || '',
          site_oficial: res.data.site_oficial || '',
          endereco: res.data.endereco || '',
          redes_sociais: res.data.redes_sociais || {},
          id: res.data.id,
          nome_agente_ia: res.data.nome_agente_ia || '',
          estilo_personalidade: res.data.estilo_personalidade || '',
          modo_falar: res.data.modo_falar || '',
          uso_emojis: res.data.uso_emojis || '',
          personalidade: res.data.personalidade || '',
          email_contato: res.data.email_contato || '',
          taxa_adesao: res.data.taxa_adesao || '',
          multa_cancelamento: res.data.multa_cancelamento || '',
          tipo_conexao: res.data.tipo_conexao || '',
          prazo_instalacao: res.data.prazo_instalacao || '',
          documentos_necessarios: res.data.documentos_necessarios || '',
          planos_internet: res.data.planos_internet || '',
          planos_descricao: res.data.planos_descricao || '',
        });
        
        // Carregar personalidade avançada se existir
        if (res.data.personalidade && typeof res.data.personalidade === 'object') {
          setPersonalidadeAvancada({
            vicios_linguagem: res.data.personalidade.vicios_linguagem || '',
            caracteristicas: res.data.personalidade.caracteristicas || '',
            principios: res.data.personalidade.principios || '',
            humor: res.data.personalidade.humor || ''
          });
          setPersonalidadeAvancadaEnabled(true);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados do provedor:', e);
      setError('Erro ao carregar dados do provedor.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (provedorId) {
      fetchData();
    }
  }, [provedorId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('redes_sociais_')) {
      const key = name.replace('redes_sociais_', '');
      setForm((prev) => ({ ...prev, redes_sociais: { ...prev.redes_sociais, [key]: value } }));
    } else if (name === 'personalidade') {
      setForm((prev) => ({ ...prev, personalidade: value }));
    } else if (name === 'email_contato') {
      setForm((prev) => ({ ...prev, email_contato: value }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRedeChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      redes_sociais: { ...prev.redes_sociais, [name]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const token = localStorage.getItem('token');
      
      // Preparar dados para envio
      const dataToSend = { ...form };
      
      // Incluir personalidade avançada se habilitada
      if (personalidadeAvancadaEnabled) {
        dataToSend.personalidade = personalidadeAvancada;
      } else {
        dataToSend.personalidade = null;
      }
      
      console.log('[DEBUG ProviderDataForm] Dados do formulário:', dataToSend);
      console.log('[DEBUG ProviderDataForm] Token:', token);
      
      if (form.id) {
        console.log('[DEBUG ProviderDataForm] Atualizando provedor existente');
        await axios.patch(`/api/provedores/${form.id}/`, dataToSend, {
          headers: { Authorization: `Token ${token}` }
        });
      } else {
        console.log('[DEBUG ProviderDataForm] Criando novo provedor');
        console.log('[DEBUG ProviderDataForm] Dados enviados:', dataToSend);
        const response = await axios.post('/api/provedores/', dataToSend, {
          headers: { Authorization: `Token ${token}` }
        });
        console.log('[DEBUG ProviderDataForm] Resposta da API:', response.data);
      }
      setSuccess('Dados salvos com sucesso!');
      await fetchData(); // Atualiza os dados após salvar
    } catch (e) {
      console.error('[DEBUG ProviderDataForm] Erro ao salvar:', e);
      console.error('[DEBUG ProviderDataForm] Resposta de erro:', e.response?.data);
      setError('Erro ao salvar dados.');
    }
    setSaving(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-card text-card-foreground rounded-xl shadow border border-border mt-8">
      <h2 className="text-2xl font-bold mb-6">Dados do Provedor</h2>
      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : (
        <div className="overflow-y-auto max-h-[80vh]">
          <form onSubmit={handleSubmit} className="space-y-6">
          {success && <div className="text-green-600 dark:text-green-400 mb-2">{success}</div>}
          {error && <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>}
          <div>
            <label className="block font-medium mb-1 text-foreground">Nome do Provedor</label>
            <input type="text" name="nome" value={form.nome} onChange={handleChange} className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground">Site Oficial</label>
            <input type="url" name="site_oficial" value={form.site_oficial} onChange={handleChange} className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground">Endereço</label>
            <input type="text" name="endereco" value={form.endereco} onChange={handleChange} className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground mb-2">Redes Sociais</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REDES.map(rede => (
                <div key={rede.key}>
                  <label className="block text-muted-foreground text-sm mb-1">{rede.label}</label>
                  <input
                    type="url"
                    name={`redes_sociais_${rede.key}`}
                    value={form.redes_sociais[rede.key] || ''}
                    onChange={handleRedeChange}
                    className="input w-full bg-background text-foreground border border-border rounded px-3 py-2"
                    placeholder={`Link do perfil no ${rede.label}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground">Nome do Agente IA</label>
            <input type="text" name="nome_agente_ia" value={form.nome_agente_ia || ''} onChange={handleChange} className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground">Estilo de Personalidade</label>
            <select name="estilo_personalidade" value={form.estilo_personalidade || ''} onChange={handleChange} className="input w-full bg-background text-foreground border border-border rounded px-3 py-2">
              <option value="">Selecione...</option>
              <option value="Formal">Formal</option>
              <option value="Descontraído">Descontraído</option>
              <option value="Educado">Educado</option>
              <option value="Brincalhão">Brincalhão</option>
              <option value="Objetivo">Objetivo</option>
            </select>
          </div>
          <div className="border border-border rounded-lg p-4 bg-card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">Personalidade avançada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Personalize o jeito de falar, o tom e mais traços de personalidade do seu atendente virtual para criar uma experiência única!
                </p>
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-700">
                  <strong>Atenção:</strong> Habilitar essa funcionalidade pode aumentar o número e tamanho das mensagens enviadas pela atendente.
                </div>
              </div>
              <div className="flex-shrink-0">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={personalidadeAvancadaEnabled}
                    onChange={(e) => setPersonalidadeAvancadaEnabled(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${personalidadeAvancadaEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${personalidadeAvancadaEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                  <span className="ml-2 text-sm text-foreground whitespace-nowrap">Habilitar personalidade avançada</span>
                </label>
              </div>
            </div>
            
            {personalidadeAvancadaEnabled && (
              <div className="space-y-4 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-sm">💬</span>
                      <label className="block font-medium ml-2 text-foreground">Vícios de linguagem</label>
                    </div>
                    <textarea
                      value={personalidadeAvancada.vicios_linguagem}
                      onChange={(e) => setPersonalidadeAvancada(prev => ({...prev, vicios_linguagem: e.target.value}))}
                      className="input w-full bg-background text-foreground border border-border rounded px-3 py-2 h-20 resize-none"
                      placeholder="Exemplo: Usa 'uai' frequentemente, fala de forma animada e calorosa"
                    />
                  </div>

                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-sm">😊</span>
                      <label className="block font-medium ml-2 text-foreground">Características</label>
                    </div>
                    <textarea
                      value={personalidadeAvancada.caracteristicas}
                      onChange={(e) => setPersonalidadeAvancada(prev => ({...prev, caracteristicas: e.target.value}))}
                      className="input w-full bg-background text-foreground border border-border rounded px-3 py-2 h-20 resize-none"
                      placeholder="Exemplo: Simpática, alegre, acolhedora, sempre pronta para ajudar"
                    />
                  </div>

                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-sm">🎯</span>
                      <label className="block font-medium ml-2 text-foreground">Princípios</label>
                    </div>
                    <textarea
                      value={personalidadeAvancada.principios}
                      onChange={(e) => setPersonalidadeAvancada(prev => ({...prev, principios: e.target.value}))}
                      className="input w-full bg-background text-foreground border border-border rounded px-3 py-2 h-20 resize-none"
                      placeholder="Exemplo: Valoriza a hospitalidade, a amizade e o bom atendimento"
                    />
                  </div>

                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-sm">😄</span>
                      <label className="block font-medium ml-2 text-foreground">Humor</label>
                    </div>
                    <textarea
                      value={personalidadeAvancada.humor}
                      onChange={(e) => setPersonalidadeAvancada(prev => ({...prev, humor: e.target.value}))}
                      className="input w-full bg-background text-foreground border border-border rounded px-3 py-2 h-20 resize-none"
                      placeholder="Exemplo: Bem-humorada, gosta de fazer piadas leves e trocadilhos"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground">Uso de Emojis</label>
            <select name="uso_emojis" value={form.uso_emojis || ''} onChange={handleChange} className="input w-full bg-background text-foreground border border-border rounded px-3 py-2">
              <option value="">Selecione...</option>
              <option value="sempre">Sempre</option>
              <option value="ocasionalmente">Ocasionalmente</option>
              <option value="nunca">Nunca</option>
            </select>
          </div>
          {/* Campo de telefones removido */}
          <div>
            <label className="block font-medium mb-1 text-foreground">E-mail de Contato <span className='text-muted-foreground'>(suporte financeiro e comercial)</span></label>
            <input type="email" name="email_contato" value={form.email_contato} onChange={handleChange} placeholder="Ex: contato@provedor.com.br" className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground">Taxa de Adesão</label>
            <input type="text" name="taxa_adesao" value={form.taxa_adesao} onChange={handleChange} className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" placeholder="Ex: R$ 100,00 ou Isento" />
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground">Multa de Cancelamento</label>
            <input type="text" name="multa_cancelamento" value={form.multa_cancelamento} onChange={handleChange} className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" placeholder="Ex: R$ 200,00 ou Proporcional ao tempo restante" />
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground">Tipo de Conexão</label>
            <input type="text" name="tipo_conexao" value={form.tipo_conexao} onChange={handleChange} className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" placeholder="Ex: Fibra Óptica, Rádio, Cabo" />
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground">Prazo de Instalação</label>
            <input type="text" name="prazo_instalacao" value={form.prazo_instalacao} onChange={handleChange} className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" placeholder="Ex: 3 dias úteis, 24h, até 7 dias" />
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground">Documentos Necessários para Cadastro</label>
            <textarea name="documentos_necessarios" value={form.documentos_necessarios} onChange={handleChange} className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" rows={2} placeholder="Ex: RG, CPF, comprovante de residência, contrato assinado" />
          </div>
          
          {/* Seção de Planos (substituindo Observações Adicionais) */}
          <div className="border border-border rounded-lg p-4 bg-background/50">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Planos Oferecidos</h3>
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1 text-foreground">Planos de Internet</label>
                <textarea 
                  name="planos_internet" 
                  value={form.planos_internet} 
                  onChange={handleChange} 
                  className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" 
                  rows={3} 
                  placeholder="Ex: 100 MEGAS - R$ 89,90, 200 MEGAS - R$ 129,90, 500 MEGAS - R$ 199,90, 1 GIGA - R$ 299,90"
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-foreground">Descrição Detalhada dos Planos</label>
                <textarea 
                  name="planos_descricao" 
                  value={form.planos_descricao} 
                  onChange={handleChange} 
                  className="input w-full bg-background text-foreground border border-border rounded px-3 py-2" 
                  rows={6} 
                  placeholder="Ex: 100 MEGAS - Plano básico ideal para navegação. Inclui: instalação gratuita, roteador incluso, suporte 8h/dia, sem fidelidade, cancelamento sem multa, velocidade garantida, sem limite de dados.

200 MEGAS - Plano intermediário para streaming. Inclui: Netflix incluso, Wi-Fi grátis, instalação em 3 dias, roteador Wi-Fi 5, suporte 12h/dia, fidelidade 6 meses, multa cancelamento: R$ 100,00.

500 MEGAS - Plano completo para família. Inclui: Netflix + HBO Max + Disney+, roteador Wi-Fi 6, instalação em 24h, suporte 24h, fidelidade 12 meses, IP fixo opcional, proteção antivírus, backup na nuvem."
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded font-medium hover:bg-primary/90 transition" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
        </div>
      )}
    </div>
  );
} 