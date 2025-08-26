import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MessageCircle, Send, XCircle, Edit2, Plus, Save, Globe } from 'lucide-react';

function StatusBadge({ status }) {
  let color = 'bg-yellow-500';
  let text = 'text-yellow-900';
  if (status === 'Conectado') { color = 'bg-green-500'; text = 'text-green-900'; }
  if (status === 'Desconectado') { color = 'bg-red-500'; text = 'text-red-900'; }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color} ${text}`}>
      {status}
    </span>
  );
}

function ChannelCard({ channel, onConnect, onDelete, onEdit, onDisconnect, onCheckStatus, onDeleteInstance }) {
  const isWhatsapp = channel.tipo === 'whatsapp' || channel.tipo === 'whatsapp_beta';
  
  // Usar state do backend (que vem como 'open', 'connected', etc) ou status do frontend
  const channelState = channel.state || channel.status;
  const isConnected = channelState === 'open' || channelState === 'connected' || channelState === 'Conectado';
  
  // Obter status do WhatsApp Beta se disponível
  const betaStatus = channel.tipo === 'whatsapp_beta' ? channel.betaStatus : null;
  const profilePic = (isConnected && (betaStatus?.instance?.profilePicUrl || channel.profile_pic)) || null;
  const profileName = betaStatus?.instance?.profileName;
  const status = betaStatus?.status || channelState;

  return (
    <div className="bg-[#23243a] p-6 rounded-xl shadow-lg border border-[#35365a] flex justify-between items-center relative">
      <div className="flex items-center gap-4">
        {channel.tipo === 'whatsapp_beta' ? (
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-purple-500">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <img src="/avatar-em-branco.png" alt="Avatar" className="w-full h-full object-cover" />
            )}
          </div>
        ) : channel.tipo === 'whatsapp' ? (
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-green-500">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <img src="/avatar-em-branco.png" alt="Avatar" className="w-full h-full object-cover" />
        )}
      </div>
        ) : channel.tipo === 'telegram' ? (
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <Send className="w-6 h-6 text-white" />
        </div>
        ) : (
          <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
        </div>
        )}
        <div>
          <div className="font-bold text-lg text-white capitalize">{channel.tipo === 'whatsapp_beta' ? 'WhatsApp Beta' : channel.tipo}</div>
          {/* Não mostrar nome do provedor nem profileName */}
          {/* {channel.nome && <div className="text-sm text-gray-400">{channel.nome}</div>} */}
          {/* {channel.provedor && <div className="text-xs text-purple-300">{channel.provedor.nome}</div>} */}
          {/* {channel.tipo === 'whatsapp_beta' && profileName && (
            <div className="text-xs text-purple-300">{profileName}</div>
          )} */}
        </div>
        </div>
      {/* Botão lixeira no canto direito absoluto */}
      <button
        onClick={() => onDeleteInstance(channel)}
        className="absolute top-2 right-2 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-red-600 hover:to-red-800 text-white p-1 rounded-full text-xs font-semibold shadow"
        title="Deletar Instância"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
      </button>
      <div className="flex items-center gap-2">
        <StatusBadge status={isConnected ? 'Conectado' : 'Desconectado'} />
        {/* Botão conectar/desconectar para WhatsApp */}
        {isWhatsapp && isConnected && (
          <button
            onClick={() => onDisconnect(channel.id)}
            className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white px-4 py-1 rounded-full text-xs font-semibold shadow transition ml-2"
          >
            Desconectar
          </button>
        )}
        {isWhatsapp && !isConnected && (
          <button
            onClick={() => onConnect(channel.id)}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-4 py-1 rounded-full text-xs font-semibold shadow ml-2"
          >
            Conectar
          </button>
          )}
        </div>
    </div>
  );
}

const ALL_CHANNEL_TYPES = [
  { tipo: 'whatsapp', label: 'WhatsApp' },
  { tipo: 'whatsapp_beta', label: 'WhatsApp Beta' },
  { tipo: 'telegram', label: 'Telegram' },
  { tipo: 'email', label: 'E-mail' },
  { tipo: 'website', label: 'Website' },
];

export default function Integrations({ provedorId }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Trocar o estado inicial e uso dos campos do SGP para os novos nomes:
  const [sgp, setSgp] = useState({ sgp_url: '', sgp_token: '', sgp_app: '' });
  const [uazapi, setUazapi] = useState({ whatsapp_url: '', whatsapp_token: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [adding, setAdding] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [instanceName, setInstanceName] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [formData, setFormData] = useState({ nome: '', email: '', url: '' });
  const [connectingId, setConnectingId] = useState(null);
  const [qrCard, setQrCard] = useState('');
  const [qrCardLoading, setQrCardLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  // Adicionar estados:
  const [showPairingMenu, setShowPairingMenu] = useState(false);
  const [pairingMethod, setPairingMethod] = useState(''); // 'qrcode' ou 'paircode'
  const [pendingConnectId, setPendingConnectId] = useState(null);
  const [pairingPhone, setPairingPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingResult, setPairingResult] = useState(null);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [whatsappBetaStatus, setWhatsappBetaStatus] = useState({});
  const [statusPolling, setStatusPolling] = useState({});

  // Função para parar polling - deve ser declarada antes dos useEffect que a usam
  const stopStatusPolling = useCallback((canalId) => {
    if (statusPolling[canalId]) {
      clearInterval(statusPolling[canalId]);
      setStatusPolling(prev => {
        const newPolling = { ...prev };
        delete newPolling[canalId];
        return newPolling;
      });
    }
  }, [statusPolling]);

  // Função para iniciar polling - também deve ser declarada antes dos useEffect
  const startStatusPolling = useCallback((canalId) => {
    if (statusPolling[canalId]) return; // Já está monitorando
    let lastStatus = null;
    const pollStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`/api/canais/${canalId}/whatsapp-beta-status/`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          const status = response.data;
          setWhatsappBetaStatus(prev => ({
            ...prev,
            [canalId]: status
          }));
          // Se conectou, salva status
          if (status.status === 'connected' && status.loggedIn) {
            lastStatus = 'connected';
          }
          // Se desconectou após estar conectado, exibe alerta
          if (lastStatus === 'connected' && (status.status === 'disconnected' || !status.loggedIn)) {
            // setWhatsappDisconnected(true); // Removido
            // setTimeout(() => setWhatsappDisconnected(false), 8000); // Removido
            lastStatus = 'disconnected';
          }
        }
      } catch (error) {
        // Se der 401, parar polling para evitar flood
        if (error?.response?.status === 401) {
          stopStatusPolling(canalId);
        }
        console.error('Erro ao monitorar status:', error);
      }
    };
    // Primeira verificação
    pollStatus();
    // Configurar polling a cada 30 segundos
    const interval = setInterval(pollStatus, 30000);
    setStatusPolling(prev => ({
      ...prev,
      [canalId]: interval
    }));
  }, [statusPolling, stopStatusPolling]);

  useEffect(() => {
    setLoading(true);
    setError('');
      const token = localStorage.getItem('token');
    console.log('Carregando canais...', { token: token ? 'presente' : 'ausente' });
    
    // Se não há token, mostrar erro
    if (!token) {
      console.error('Token não encontrado no localStorage');
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }
    
    axios.get('/api/canais/', {
          headers: { Authorization: `Token ${token}` }
    })
      .then(res => {
        console.log('Canais carregados:', res.data);
        setChannels(res.data.results || res.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Erro ao carregar canais:', error);
        setError('Erro ao carregar canais');
        setLoading(false);
      });

    if (provedorId) {
      axios.get(`/api/provedores/${provedorId}/`, {
        headers: { Authorization: `Token ${token}` }
      })
        .then(res => {
          setSgp(prev => {
            if (!prev.sgp_url && !prev.sgp_token && !prev.sgp_app) {
              return {
                sgp_url: res.data.sgp_url || '',
                sgp_token: res.data.sgp_token || '',
                sgp_app: res.data.sgp_app || ''
              };
            }
            return prev;
          });
          setUazapi(prev => {
            if (!prev.whatsapp_url && !prev.whatsapp_token) {
              return {
                whatsapp_url: res.data.whatsapp_url || '',
                whatsapp_token: res.data.whatsapp_token || ''
              };
            }
            return prev;
          });
        })
        .catch(() => {});
    }
  }, [provedorId]);

  useEffect(() => {
    if (!provedorId) return;
    
    let ws = null;
    
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new window.WebSocket(`${wsProtocol}://${window.location.host}/ws/painel/${provedorId}/`);
      
      ws.onopen = () => {
        console.log('# Debug logging removed for security WebSocket Integrations: Conectado com sucesso');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'whatsapp_beta_status' && data.canal_id) {
            setChannels(prevChannels => prevChannels.map(c => {
              if (c.id === data.canal_id) {
                return {
                  ...c,
                  state: data.status,
                  betaStatus: {
                    ...c.betaStatus,
                    status: data.status,
                    instance: data.instance,
                    connected: data.connected,
                    loggedIn: data.loggedIn
                  }
                };
              }
              return c;
            }));
          }
        } catch (e) { 
          console.error('Erro ao processar mensagem WebSocket:', e);
        }
      };
      
      ws.onclose = (event) => {
        console.log('# Debug logging removed for security WebSocket Integrations: Desconectado', event.code, event.reason);
      };
      
      ws.onerror = (error) => {
        console.error('# Debug logging removed for security WebSocket Integrations: Erro', error);
      };
      
    } catch (error) {
      console.error('Erro ao criar WebSocket:', error);
    }
    
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('# Debug logging removed for security WebSocket Integrations: Fechando conexão');
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [provedorId]);

  // Limpar polling quando componente for desmontado
  useEffect(() => {
    return () => {
      Object.keys(statusPolling).forEach(canalId => {
        stopStatusPolling(canalId);
      });
    };
  }, [statusPolling, stopStatusPolling]);

  // useEffect para fechar o QR Code automaticamente quando o canal conectar
  useEffect(() => {
    if (connectingId) {
      const canal = channels.find(c => c.id === connectingId);
      // Só fecha o modal e mostra sucesso se mudou para 'open'
      if (canal && (canal.state === 'open' || canal.state === 'connected')) {
        setConnectingId(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    }
  }, [channels, connectingId]);

  // useEffect para iniciar polling automático para canais WhatsApp Beta
  useEffect(() => {
    channels.forEach(channel => {
      if (channel.tipo === 'whatsapp_beta' && channel.dados_extras?.instance_id) {
        // Iniciar polling apenas se não estiver já ativo
        if (!statusPolling[channel.id]) {
          startStatusPolling(channel.id);
        }
      }
    });
  }, [channels, statusPolling, startStatusPolling]);

  useEffect(() => {
    let interval;
    if (connectingId) {
      interval = setInterval(() => {
      const token = localStorage.getItem('token');
        axios.get('/api/canais/', {
        headers: { Authorization: `Token ${token}` }
        }).then(res => {
          setChannels(Array.isArray(res.data) ? res.data : res.data.results || []);
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [connectingId]);

  const handleConnect = (id) => {
    const canal = channels.find(c => c.id === id);
    if (!canal || (canal.tipo !== 'whatsapp' && canal.tipo !== 'whatsapp_beta')) return;
    // Só bloquear se realmente estiver conectado
    const status = canal.state || canal.status;
    if (status === 'connected' || status === 'open' || status === 'Conectado') {
      setToast({ show: true, message: 'WhatsApp já conectado!', type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      return;
    }
    if (canal.tipo === 'whatsapp_beta') {
      setShowPairingMenu(true);
      setPendingConnectId(id);
      return;
    }
    // WhatsApp normal
    setConnectingId(id);
    setQrCard('');
    setQrCardLoading(true);
    const token = localStorage.getItem('token');
    axios.post('/api/canais/get_evolution_qr/', { instance_name: canal.nome }, {
      headers: { Authorization: `Token ${token}` }
    }).then(res => {
      const qr = res.data.base64 || res.data.qrcode || res.data.qrcode_url || '';
      setQrCard(qr);
      setQrCardLoading(false);
    }).catch(() => {
      setQrCardLoading(false);
      setToast({ show: true, message: 'Erro ao gerar QR Code', type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    });
  };

  // Nova função para buscar o método escolhido
  const handlePairingMethod = (method) => {
    setPairingMethod(method);
    setShowPairingMenu(false);
    if (method === 'paircode') {
      setShowPhoneInput(true);
      setPairingPhone('');
      setPairingResult(null);
    } else {
      setConnectingId(pendingConnectId);
      setQrCard('');
      setQrCardLoading(true);
      setShowPhoneInput(false);
      setPairingResult(null);
      // QR Code fluxo normal
      const canal = channels.find(c => c.id === pendingConnectId);
      const token = localStorage.getItem('token');
      axios.post('/api/canais/get_whatsapp_beta_qr/', { instance_name: canal.nome, method: 'qrcode' }, {
        headers: { Authorization: `Token ${token}` }
      }).then(res => {
        setQrCard(res.data.qrcode || '');
        setQrCardLoading(false);
      }).catch(() => {
        setQrCardLoading(false);
        setToast({ show: true, message: 'Erro ao gerar QR Code', type: 'error' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      });
    }
  };

  // Função para enviar o número e obter o código de pareamento
  const handlePairingPhoneSubmit = () => {
    if (!pairingPhone) return;
    setPairingLoading(true);
    setPairingResult(null);
    const canal = channels.find(c => c.id === pendingConnectId);
      const token = localStorage.getItem('token');
    axios.post('/api/canais/get_whatsapp_beta_qr/', { instance_name: canal.nome, method: 'paircode', phone: pairingPhone }, {
      headers: { Authorization: `Token ${token}` }
    }).then(res => {
      setPairingResult(res.data.paircode || res.data.message || 'Erro ao obter código de pareamento');
      setPairingLoading(false);
    }).catch(() => {
      setPairingResult('Erro ao obter código de pareamento');
      setPairingLoading(false);
    });
  };

  const handleDisconnect = (id) => {
    const canal = channels.find(c => c.id === id);
    if (!canal) return;
    const token = localStorage.getItem('token');
    if (canal.tipo === 'whatsapp_beta') {
      // Desconectar via endpoint especial
      axios.post(`/api/canais/${id}/desconectar-instancia/`, {}, {
        headers: { Authorization: `Token ${token}` }
      })
        .then(() => {
          // Atualizar canais do backend após desconectar
          axios.get('/api/canais/', {
            headers: { Authorization: `Token ${token}` }
          }).then(res2 => {
            setChannels(Array.isArray(res2.data) ? res2.data : res2.data.results || []);
          });
          setToast({ show: true, message: 'WhatsApp Beta desconectado com sucesso!', type: 'success' });
          setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
        })
        .catch(() => {
          setToast({ show: true, message: 'Erro ao desconectar WhatsApp Beta', type: 'error' });
        });
        return;
      }
    // WhatsApp normal (Evolution)
    setConnectingId(id);
    setQrCard('');
    setQrCardLoading(true);
    axios.post('/api/canais/logout_whatsapp/', { instance_name: canal.nome }, {
      headers: { Authorization: `Token ${token}` }
    })
      .then(() => {
        axios.get('/api/canais/', {
          headers: { Authorization: `Token ${token}` }
        }).then(res2 => {
          setChannels(Array.isArray(res2.data) ? res2.data : res2.data.results || []);
        });
        setQrCardLoading(false);
        setToast({ show: true, message: 'WhatsApp desconectado com sucesso!', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      })
      .catch(() => {
        setQrCardLoading(false);
        setToast({ show: true, message: 'Erro ao desconectar WhatsApp', type: 'error' });
      });
  };

  const handleDelete = (id) => {
    const token = localStorage.getItem('token');
    axios.delete(`/api/canais/${id}/`, {
        headers: { Authorization: `Token ${token}` }
    }).then(() => {
      setChannels(channels => channels.filter(c => c.id !== id));
    }).catch(() => {
      alert('Erro ao excluir canal');
    });
  };

  const handleEdit = (id) => {
    alert('Editar canal ' + id);
  };

  const handleAdd = () => {
      const token = localStorage.getItem('token');
    axios.get('/api/canais/disponiveis/', {
      headers: { Authorization: `Token ${token}` }
    }).then(res => {
      setAvailableTypes(res.data);
      setShowModal(true);
      setSelectedType(null);
      setInstanceName('');
      setQrCode('');
      setFormData({ nome: '', email: '', url: '' });
    });
  };

  const handleSelectType = (tipo) => {
    setSelectedType(tipo);
    setInstanceName('');
    setQrCode('');
    setFormData({ nome: '', email: '', url: '' });
  };

  const handleGenerateQr = () => {
    setQrLoading(true);
    const token = localStorage.getItem('token');
    axios.post('/api/canais/create_evolution_instance/', { instance_name: instanceName }, {
      headers: { Authorization: `Token ${token}` }
    }).then(() => {
      // Agora busca o QR Code
      axios.post('/api/canais/get_evolution_qr/', { instance_name: instanceName }, {
        headers: { Authorization: `Token ${token}` }
      }).then(res => {
        console.log('Resposta QRCode:', res.data);
        // Aceita base64, qrcode ou qrcode_url
        const qr = res.data.base64 || res.data.qrcode || res.data.qrcode_url || '';
        setQrCode(qr);
        setQrLoading(false);
      }).catch(() => {
        setQrLoading(false);
        alert('Erro ao gerar QR Code');
      });
    }).catch(() => {
      setQrLoading(false);
      alert('Erro ao criar instância');
    });
  };

  const handleSaveWhatsapp = () => {
    setAdding(true);
    const token = localStorage.getItem('token');
    axios.post('/api/canais/', { tipo: selectedType, nome: instanceName }, {
      headers: { Authorization: `Token ${token}` }
    }).then(() => {
      setShowModal(false);
      setAdding(false);
      setSelectedType(null);
      // Atualiza canais
      setLoading(true);
      axios.get('/api/canais/', {
        headers: { Authorization: `Token ${token}` }
      }).then(res => {
        setChannels(Array.isArray(res.data) ? res.data : res.data.results || []);
        setLoading(false);
      });
    }).catch(() => {
      setAdding(false);
      alert('Erro ao adicionar canal');
    });
  };

  const handleAddOtherChannel = () => {
    setAdding(true);
      const token = localStorage.getItem('token');
    axios.post('/api/canais/', { tipo: selectedType, ...formData }, {
      headers: { Authorization: `Token ${token}` }
    }).then(() => {
      setShowModal(false);
      setAdding(false);
      setSelectedType(null);
      // Atualiza canais
      setLoading(true);
      axios.get('/api/canais/', {
        headers: { Authorization: `Token ${token}` }
      }).then(res => {
        setChannels(Array.isArray(res.data) ? res.data : res.data.results || []);
        setLoading(false);
      });
    }).catch(() => {
      setAdding(false);
      alert('Erro ao adicionar canal');
    });
  };

  const handleSgpChange = (e) => {
    const { name, value } = e.target;
    setSgp(prev => ({ ...prev, [name]: value }));
  };

  const handleSgpSave = (e) => {
    e.preventDefault();
    setSaving(true);
      const token = localStorage.getItem('token');
    axios.patch(`/api/provedores/${provedorId}/`, sgp, {
      headers: { Authorization: `Token ${token}` }
    })
      .then(() => {
        setSaving(false);
        setSuccess('Dados do SGP salvos com sucesso!');
        setTimeout(() => setSuccess(''), 2000);
      })
      .catch(() => {
        setSaving(false);
        setSuccess('Erro ao salvar dados do SGP!');
        setTimeout(() => setSuccess(''), 2000);
      });
  };

  const handleUazapiChange = (e) => {
    const { name, value } = e.target;
    setUazapi(prev => ({ ...prev, [name]: value }));
  };

  const handleUazapiSave = (e) => {
    e.preventDefault();
    setSaving(true);
      const token = localStorage.getItem('token');
    axios.patch(`/api/provedores/${provedorId}/`, uazapi, {
      headers: { Authorization: `Token ${token}` }
    })
      .then(() => {
        setSaving(false);
        setSuccess('Dados do WhatsApp salvos com sucesso!');
        setTimeout(() => setSuccess(''), 2000);
      })
      .catch(() => {
        setSaving(false);
        setSuccess('Erro ao salvar dados do WhatsApp!');
        setTimeout(() => setSuccess(''), 2000);
      });
  };

  const handleCheckStatus = async (canalId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/canais/${canalId}/whatsapp-beta-status/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setStatusData(response.data);
        setShowStatusModal(true);
      } else {
        setToast({ show: true, message: response.data.error || 'Erro ao verificar status', type: 'error' });
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setToast({ show: true, message: 'Erro ao verificar status do WhatsApp Beta', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInstance = (channel) => {
    const token = localStorage.getItem('token');
    axios.delete(`/api/canais/${channel.id}/`, {
      headers: { Authorization: `Token ${token}` }
    })
      .then(() => {
        setChannels(channels => channels.filter(c => c.id !== channel.id));
        setToast({ show: true, message: 'Canal deletado com sucesso!', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      })
      .catch(() => {
        setToast({ show: true, message: 'Erro ao deletar canal', type: 'error' });
      });
  };

  const tiposConfigurados = channels.map(c => c.tipo);

  if (showPairingMenu) {
  return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-[#23243a] p-8 rounded-xl shadow-lg border border-[#35365a] w-full max-w-md text-center">
          <h3 className="text-xl font-bold text-white mb-6">Como deseja conectar?</h3>
          <button onClick={() => handlePairingMethod('qrcode')} className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow transition mb-4 w-full">QR Code</button>
          <button onClick={() => handlePairingMethod('paircode')} className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow transition w-full">Código de Pareamento</button>
          <button onClick={() => setShowPairingMenu(false)} className="mt-6 px-4 py-2 rounded bg-gray-700 text-white">Cancelar</button>
        </div>
      </div>
    );
  }

  // Renderização do modal de input de telefone para pareamento
  if (showPhoneInput) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-[#23243a] p-8 rounded-xl shadow-lg border border-[#35365a] w-full max-w-md text-center">
          <h3 className="text-xl font-bold text-white mb-6">Digite o número de telefone (com DDD)</h3>
          <input
            type="text"
            value={pairingPhone}
            onChange={e => setPairingPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="Ex: 11999999999"
            className="w-full px-4 py-2 rounded bg-background text-foreground focus:outline-none border border-border mb-4"
            maxLength={13}
          />
            <button 
            onClick={handlePairingPhoneSubmit}
            className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow transition w-full mb-2"
            disabled={!pairingPhone || pairingLoading}
            >
            {pairingLoading ? 'Enviando...' : 'Obter Código de Pareamento'}
            </button>
          {pairingResult && (
            <div className="mt-4 text-lg text-green-400 font-bold">{pairingResult}</div>
          )}
          <button onClick={() => { setShowPhoneInput(false); setPairingResult(null); }} className="mt-6 px-4 py-2 rounded bg-gray-700 text-white">Cancelar</button>
          </div>
              </div>
    );
  }

  return (
    <div className="p-8">
      {/* Linha com título à esquerda e botão à direita */}
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl font-bold text-white ml-2">Canais Configurados</h2>
              <button 
          onClick={handleAdd}
          className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow"
              >
          <Plus className="w-5 h-5" /> Adicionar Canal
              </button>
            </div>
      {loading && <div className="text-white">Carregando canais...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {!loading && !error && channels.length === 0 && (
        <div className="text-[#b0b0c3]">Nenhum canal configurado.</div>
      )}
      {/* GRID DOS CANAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
        {channels.map(channel => (
          <div key={channel.id} className="relative">
            <ChannelCard
              channel={channel}
              onConnect={handleConnect}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onDisconnect={handleDisconnect}
              onCheckStatus={handleCheckStatus}
              onDeleteInstance={handleDeleteInstance}
            />
            {/* QR Code para WhatsApp */}
            {connectingId === channel.id && qrCardLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl z-10">
                <span className="text-white">Gerando QR Code...</span>
                </div>
                          )}
            {connectingId === channel.id && qrCard && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80">
                <div className="flex flex-col items-center w-full max-w-md bg-[#23243a] rounded-xl shadow-2xl p-6">
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4 text-yellow-900 shadow-lg w-80 text-sm text-left">
                    <b className="block mb-1">Antes de conectar seu WhatsApp:</b>
                    Para evitar bloqueios, garanta que seu número esteja aquecido!<br />
                    Comece com mensagens manuais e interações reais.<br /><br />
                    <span className="inline-block mb-1">📌 <b>Dica:</b></span>
                    <span>
                      Use o WhatsApp de forma orgânica no início. Isso cria confiança e evita que seu número seja sinalizado.
                              </span>
                            </div>
                  {/* QR Code ou Código de Pareamento */}
                  {typeof qrCard === 'object' && (qrCard.qrcode || qrCard.paircode) ? (
                    <>
                      {qrCard.qrcode && (
                        <img src={qrCard.qrcode} alt="QR Code" className="w-48 h-48 mx-auto" />
                      )}
                      {qrCard.paircode && (
                        <div className="text-center mt-4">
                          <div className="bg-green-50 border border-green-300 rounded-lg p-6 mb-2 text-green-900 shadow-lg w-80 mx-auto">
                            <div className="text-2xl font-bold mb-2">{qrCard.paircode}</div>
                            <div className="text-sm">
                              Digite este código no WhatsApp:<br />
                              Configurações → Aparelhos conectados → Conectar um aparelho
                        </div>
                      </div>
                </div>
                          )}
                    </>
                  ) : qrCard.startsWith('data:image') || qrCard.startsWith('http') ? (
                    <img src={qrCard} alt="QR Code" className="w-48 h-48" />
                  ) : (
                    <img src={`data:image/png;base64,${qrCard}`} alt="QR Code" className="w-48 h-48" />
                  )}
                  <span className="text-green-400 mt-2">
                    {typeof qrCard === 'object' && qrCard.paircode ? 'Digite o código ou escaneie o QR Code no WhatsApp' : 'Escaneie o QR Code no WhatsApp'}
                            </span>
                  <button onClick={() => setConnectingId(null)} className="mt-4 px-4 py-2 rounded bg-gray-700 text-white">Fechar</button>
                </div>
                </div>
              )}
                        </div>
        ))}
                      </div>

      {/* MODAL DE ADICIONAR CANAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#23243a] p-8 rounded-xl shadow-lg border border-[#35365a] w-full max-w-md relative">
            {/* Botão fechar no topo direito */}
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 rounded hover:bg-[#2d2e4a] transition" title="Fechar">
              <XCircle className="w-5 h-5 text-red-400" />
                </button>
            <h3 className="text-xl font-bold text-white mb-6">Adicionar Canal</h3>
            {!selectedType ? (
              <div className="flex flex-col gap-4 mb-6">
                {availableTypes.map(opt => (
                            <button 
                    key={opt.tipo}
                    disabled={adding}
                    onClick={() => handleSelectType(opt.tipo)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border transition font-semibold text-lg bg-[#1a1b2e] text-white hover:bg-[#2d2e4a] ${adding ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>{opt.label}</span>
                    <span>Disponível</span>
                            </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {selectedType === 'whatsapp' || selectedType === 'whatsapp_beta' ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-bold text-white">Detalhes do Canal</h4>
                    </div>
                    <div className="flex flex-col">
                      <label htmlFor="instanceName" className="text-sm font-semibold text-white mb-1">Nome da Instância</label>
                      <input
                        type="text"
                        id="instanceName"
                        value={instanceName}
                        onChange={(e) => setInstanceName(e.target.value)}
                        className="bg-[#1a1b2e] border border-[#35365a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Meu WhatsApp"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                            <button 
                        onClick={() => setShowModal(false)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition"
                            >
                        Cancelar
                            </button>
                        <button 
                        onClick={handleSaveWhatsapp}
                        disabled={adding || !instanceName}
                        className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        {adding ? 'Adicionando...' : 'Adicionar Canal'}
                  </button>
                      </div>
                </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col">
                      <label htmlFor="nome" className="text-sm font-semibold text-white mb-1">Nome do Canal</label>
                  <input 
                        type="text"
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                        className="bg-[#1a1b2e] border border-[#35365a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Meu WhatsApp"
                    required 
                  />
            </div>
                    <div className="flex flex-col">
                      <label htmlFor="email" className="text-sm font-semibold text-white mb-1">E-mail (opcional)</label>
                  <input 
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-[#1a1b2e] border border-[#35365a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="exemplo@email.com"
                  />
            </div>
                    <div className="flex flex-col">
                      <label htmlFor="url" className="text-sm font-semibold text-white mb-1">URL (opcional)</label>
                  <input 
                        type="url"
                        id="url"
                        value={formData.url}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        className="bg-[#1a1b2e] border border-[#35365a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://exemplo.com"
                  />
                </div>
                    <div className="flex justify-end gap-2 mt-6">
                <button 
                        onClick={() => setShowModal(false)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition"
                      >
                        Cancelar
              </button>
                    <button 
                        onClick={handleAddOtherChannel}
                        disabled={adding}
                        className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {adding ? 'Adicionando...' : 'Adicionar Canal'}
                    </button>
                  </div>
              </div>
            )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE SUCESSO */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#23243a] p-8 rounded-xl shadow-lg border border-[#35365a] w-full max-w-md text-center">
            <h3 className="text-xl font-bold text-white mb-4">Sucesso!</h3>
            <p className="text-white mb-6">O canal foi adicionado com sucesso!</p>
            <button
              onClick={() => setShowSuccess(false)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition"
            >
              Fechar
            </button>
              </div>
                </div>
              )}
              
      {/* TOAST */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toast.message}
                  </div>
      )}

      {/* SGP CONFIGURATION */}
      <div className="mt-10 p-8 bg-[#23243a] rounded-xl shadow-lg border border-[#35365a]">
        <h3 className="text-xl font-bold text-white mb-6">Configurações do SGP</h3>
        <form onSubmit={handleSgpSave} className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label htmlFor="sgpUrl" className="text-sm font-semibold text-white mb-1">URL do SGP</label>
                    <input 
              type="url"
              id="sgpUrl"
              name="sgp_url"
              value={sgp.sgp_url}
              onChange={handleSgpChange}
              className="bg-[#1a1b2e] border border-[#35365a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://api.seu-sgp.com"
              required
                    />
                  </div>
          <div className="flex flex-col">
            <label htmlFor="sgpToken" className="text-sm font-semibold text-white mb-1">Token do SGP</label>
                    <input 
                      type="text" 
              id="sgpToken"
              name="sgp_token"
              value={sgp.sgp_token}
              onChange={handleSgpChange}
              className="bg-[#1a1b2e] border border-[#35365a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Seu token de acesso"
              required
                    />
                  </div>
          <div className="flex flex-col">
            <label htmlFor="sgpApp" className="text-sm font-semibold text-white mb-1">App do SGP</label>
                    <input 
                      type="text" 
              id="sgpApp"
              name="sgp_app"
              value={sgp.sgp_app}
              onChange={handleSgpChange}
              className="bg-[#1a1b2e] border border-[#35365a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: my-app-name"
              required
                    />
                  </div>
                <button 
                  type="submit" 
                  disabled={saving}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
            {saving ? 'Salvando...' : 'Salvar Configurações do SGP'}
                </button>
            </form>
        {success && (
          <div className="mt-4 text-green-400 text-sm">
            {success}
        </div>
      )}
            </div>

              {/* WhatsApp CONFIGURATION */}
        <div className="mt-10 p-8 bg-[#23243a] rounded-xl shadow-lg border border-[#35365a]">
          <h3 className="text-xl font-bold text-white mb-6">Configurações do WhatsApp</h3>
          <form onSubmit={handleUazapiSave} className="flex flex-col gap-4">
            <div className="flex flex-col">
              <label htmlFor="whatsappUrl" className="text-sm font-semibold text-white mb-1">URL da Instância</label>
              <input
                type="url"
                id="whatsappUrl"
                name="whatsapp_url"
                value={uazapi.whatsapp_url}
                onChange={handleUazapiChange}
                className="bg-[#1a1b2e] border border-[#35365a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://niochat.uazapi.com"
                required
              />
          </div>
            <div className="flex flex-col">
              <label htmlFor="whatsappToken" className="text-sm font-semibold text-white mb-1">Token da Instância</label>
              <input 
                type="text" 
                id="whatsappToken"
                name="whatsapp_token"
                value={uazapi.whatsapp_token}
                onChange={handleUazapiChange}
                className="bg-[1a1b2e] border border-[#35365a] text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Seu token de acesso"
                required
              />
            </div>
              <button 
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações do WhatsApp'}
              </button>
          </form>
          {success && (
            <div className="mt-4 text-green-400 text-sm">
              {success}
        </div>
      )}
        </div>
    </div>
  );
} 