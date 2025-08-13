import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock } from 'lucide-react';

const DIAS_SEMANA = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
];

function horarioPadrao() {
  return DIAS_SEMANA.map(dia => ({ dia, periodos: [] }));
}

export default function ProviderScheduleForm() {
  const [horarios, setHorarios] = useState(horarioPadrao());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [provedorId, setProvedorId] = useState(null);
  const [now, setNow] = useState(new Date());
  const timezone = 'America/Belem'; // Pode ser dinâmico depois

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/provedores/', {
          headers: { Authorization: `Token ${token}` }
        });
        if (res.data && res.data.results && res.data.results.length > 0) {
          setProvedorId(res.data.results[0].id);
          let horariosData = res.data.results[0].horarios_atendimento;
          if (horariosData) {
            try {
              horariosData = typeof horariosData === 'string' ? JSON.parse(horariosData) : horariosData;
              setHorarios(horariosData);
            } catch {
              setHorarios(horarioPadrao());
            }
          } else {
            setHorarios(horarioPadrao());
          }
        }
      } catch (e) {
        setError('Erro ao carregar horários.');
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleAddPeriodo = (diaIdx) => {
    setHorarios(horarios => horarios.map((h, i) =>
      i === diaIdx ? { ...h, periodos: [...h.periodos, { inicio: '', fim: '' }] } : h
    ));
  };

  const handlePeriodoChange = (diaIdx, periodoIdx, campo, valor) => {
    setHorarios(horarios => horarios.map((h, i) =>
      i === diaIdx ? {
        ...h,
        periodos: h.periodos.map((p, j) =>
          j === periodoIdx ? { ...p, [campo]: valor } : p
        )
      } : h
    ));
  };

  const handleRemovePeriodo = (diaIdx, periodoIdx) => {
    setHorarios(horarios => horarios.map((h, i) =>
      i === diaIdx ? { ...h, periodos: h.periodos.filter((_, j) => j !== periodoIdx) } : h
    ));
  };

  const handleCopiarAcima = (diaIdx) => {
    if (diaIdx === 0) return;
    setHorarios(horarios => horarios.map((h, i) =>
      i === diaIdx ? { ...h, periodos: [...horarios[diaIdx - 1].periodos] } : h
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    if (!provedorId) {
      setError('Provedor não encontrado. Tente recarregar a página.');
      setSaving(false);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/provedores/${provedorId}/`, {
        horarios_atendimento: JSON.stringify(horarios)
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      setSuccess('Horários salvos com sucesso!');
    } catch (e) {
      setError('Erro ao salvar horários.');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-card text-card-foreground rounded-xl shadow border border-border mt-8 overflow-y-auto max-h-[80vh]">
      {/* Bloco de horário atual */}
      <div className="mb-6">
        <div className="font-semibold text-foreground">Horário atual</div>
        <div className="flex items-center gap-3 mt-1">
          <Clock className="w-6 h-6 text-primary" />
          <span className="text-2xl font-bold text-foreground">
            {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone })}
          </span>
          <span className="text-foreground text-base">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone })}
          </span>
          <span className="text-muted-foreground text-base">{timezone}</span>
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-6">Horários de Funcionamento</h2>
      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {success && <div className="text-green-600 dark:text-green-400 mb-2">{success}</div>}
          {error && <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>}
          <div className="mb-4 text-muted-foreground">
            Configure abaixo os dias e horários em que sua empresa estará aberta para atendimento.<br />
            <span className="text-xs text-muted-foreground">Importante: os horários levam em consideração o fuso horário do seu provedor.</span>
          </div>
          {horarios.map((dia, diaIdx) => (
            <div key={dia.dia} className="mb-6 border-b border-border pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg text-foreground">{dia.dia}</span>
                <div className="flex gap-2">
                  {diaIdx > 0 && (
                    <button type="button" className="text-xs px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 border border-border" onClick={() => handleCopiarAcima(diaIdx)}>
                      Copiar horário acima
                    </button>
                  )}
                  <button type="button" className="text-xs px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAddPeriodo(diaIdx)}>
                    + Novo período
                  </button>
                </div>
              </div>
              {dia.periodos.length === 0 && (
                <div className="text-muted-foreground text-sm ml-2">Loja fechada.</div>
              )}
              {dia.periodos.map((periodo, periodoIdx) => (
                <div key={periodoIdx} className="flex items-center gap-2 mb-2 ml-2">
                  <input
                    type="time"
                    value={periodo.inicio}
                    onChange={e => handlePeriodoChange(diaIdx, periodoIdx, 'inicio', e.target.value)}
                    className="input bg-background text-foreground border border-border rounded px-2 py-1"
                    required
                  />
                  <span className="text-muted-foreground">até</span>
                  <input
                    type="time"
                    value={periodo.fim}
                    onChange={e => handlePeriodoChange(diaIdx, periodoIdx, 'fim', e.target.value)}
                    className="input bg-background text-foreground border border-border rounded px-2 py-1"
                    required
                  />
                  <button type="button" className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRemovePeriodo(diaIdx, periodoIdx)}>
                    Remover
                  </button>
                  <button type="button" className="text-xs px-2 py-1 rounded bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center" onClick={() => handleAddPeriodo(diaIdx)} title="Adicionar novo período">
                    <span className="text-lg leading-none">+</span>
                  </button>
                </div>
              ))}
            </div>
          ))}
          <div className="flex justify-end">
            <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded font-medium hover:bg-primary/90 transition" disabled={saving || loading || !provedorId}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
} 