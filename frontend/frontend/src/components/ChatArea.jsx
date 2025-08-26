import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  Paperclip, 
  Smile, 
  User, 
  MessageCircle,
  Globe,
  ChevronDown,
  UserCheck,
  CheckCircle2,
  ArrowRightLeft,
  Mic,
  MicOff,
  Square
} from 'lucide-react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from './ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import whatsappIcon from '../assets/whatsapp.png';
import telegramIcon from '../assets/telegram.png';
import gmailIcon from '../assets/gmail.png';
import instagramIcon from '../assets/instagram.png';
import CustomAudioPlayer from './ui/CustomAudioPlayer';

const ChatArea = ({ conversation, onConversationClose, onConversationUpdate }) => {
  const navigate = useNavigate();
  
  // Verificação de segurança para evitar erros
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <h3 className="text-lg font-medium mb-2">Nenhuma conversa selecionada</h3>
          <p>Selecione uma conversa da lista para começar</p>
        </div>
      </div>
    );
  }
  
  if (!conversation.contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <h3 className="text-lg font-medium mb-2">Conversa inválida</h3>
          <p>Esta conversa não possui informações de contato válidas</p>
        </div>
      </div>
    );
  }
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const [loadingProfilePic, setLoadingProfilePic] = useState(false);
  const [showResolverDropdown, setShowResolverDropdown] = useState(false);
  const [showTransferDropdown, setShowTransferDropdown] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentsStatus, setAgentsStatus] = useState({});
  const [profilePicture, setProfilePicture] = useState(null);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const dropdownRef = useRef(null);
  
  // Estados para visualização de mídia
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // Estados para reações e exclusão
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  
  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  
  // Estados para reprodução de áudio
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioProgress, setAudioProgress] = useState({});
  const audioRefs = useRef({});

  // # Debug logging removed for security ESTADO PARA CONTROLE DE MENSAGENS PENDENTES
  const [pendingMessages, setPendingMessages] = useState(new Set());

  // Função para processar conteúdo da mensagem (parsear JSON se necessário)
  const processMessageContent = (content, isFromCustomer = false) => {
    if (!content || typeof content !== 'string') {
      return content;
    }
    
    // Se parece ser JSON, tentar parsear
    if (content.trim().startsWith('{')) {
      try {
        // Primeiro, tentar parsear como está
        const parsed = JSON.parse(content);
        if (parsed.text) {
          return parsed.text;
        }
      } catch (e) {
        // Se falhou, tentar converter aspas simples para duplas
        try {
          const contentWithDoubleQuotes = content.replace(/'/g, '"');
          const parsed = JSON.parse(contentWithDoubleQuotes);
          if (parsed.text) {
            return parsed.text;
          }
        } catch (e2) {
          // Se ambos falharem, retornar o conteúdo original
        }
      }
    }
    
    return content;
  };

  // # Debug logging removed for security FUNÇÃO PARA LIMPAR MENSAGENS DUPLICADAS
  const cleanDuplicateMessages = (messages) => {
    const uniqueMessages = [];
    const seenIds = new Set();
    
    messages.forEach(msg => {
      // # Debug logging removed for security CORRIGIDO: Permitir TODAS as mensagens com ID válido
      if (msg.id && !seenIds.has(msg.id)) {
        seenIds.add(msg.id);
        uniqueMessages.push(msg);
      } 
      // # Debug logging removed for security CORRIGIDO: Permitir mensagens temporárias SEM ID apenas
      else if (!msg.id && (msg.isTemporary || msg.is_sending)) {
        // Verificar duplicatas por conteúdo e timestamp apenas para temporárias
        const isDuplicate = uniqueMessages.some(existingMsg => {
          if (!existingMsg.isTemporary && !existingMsg.is_sending) return false;
          const timeDiff = Math.abs(new Date(existingMsg.created_at) - new Date(msg.created_at));
          return existingMsg.content === msg.content && 
                 existingMsg.is_from_customer === msg.is_from_customer &&
                 timeDiff < 1000; // 1 segundo de tolerância
        });
        
        if (!isDuplicate) {
          uniqueMessages.push(msg);
        }
      }
      // # Debug logging removed for security NOVO: Fallback para mensagens sem ID que não são temporárias (casos raros)
      else if (!msg.id && !msg.isTemporary && !msg.is_sending) {
        // Verificar se já existe uma mensagem igual por conteúdo e timestamp
        const isDuplicate = uniqueMessages.some(existingMsg => {
          const timeDiff = Math.abs(new Date(existingMsg.created_at) - new Date(msg.created_at));
          return existingMsg.content === msg.content && 
                 existingMsg.is_from_customer === msg.is_from_customer &&
                 timeDiff < 2000; // 2 segundos de tolerância para mensagens sem ID
        });
        
        if (!isDuplicate) {
          uniqueMessages.push(msg);
        }
      }
    });
    
    return uniqueMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  };

  // Função para renderizar ícone do canal
  const getChannelIcon = (channelType) => {
    switch (channelType) {
      case 'whatsapp':
        return <img src={whatsappIcon} alt="WhatsApp" className="w-3 h-3" />;
      case 'telegram':
        return <img src={telegramIcon} alt="Telegram" className="w-3 h-3" />;
      case 'email':
        return <img src={gmailIcon} alt="Gmail" className="w-3 h-3" />;
      case 'instagram':
        return <img src={instagramIcon} alt="Instagram" className="w-3 h-3" />;
      case 'webchat':
        return <Globe className="w-3 h-3 text-cyan-500" />;
      default:
        return <MessageCircle className="w-3 h-3 text-muted-foreground" />;
    }
  };

  // Função para buscar mensagens
  const fetchMessages = async () => {
    if (!conversation) return;
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      // Buscar TODAS as mensagens da conversa (sem limite)
      const res = await axios.get(`/api/messages/?conversation=${conversation.id}&page_size=5000&ordering=created_at`, {
        headers: { Authorization: `Token ${token}` }
      });
      
      const messages = res.data.results || res.data;
      // Processar todas as mensagens sem filtros desnecessários
      const processedMessages = messages.map(msg => {
        let processedContent = processMessageContent(msg.content, msg.is_from_customer);
        
        // # Debug logging removed for security Remover assinatura do agente se presente
        if (processedContent && processedContent.match(/\*.*disse:\*\n/) && !msg.is_from_customer) {
          processedContent = processedContent.replace(/\*.*disse:\*\n/, '');
        }
        
        return {
          ...msg,
          content: processedContent
        };
      });
      
      // Debug removido - funcionando corretamente
      
      setMessages(processedMessages);
    } catch (err) {
      setError('Erro ao carregar mensagens.');
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      setLoading(false);
    }
  };

  // Buscar mensagens ao abrir conversa
  useEffect(() => {
    fetchMessages();
  }, [conversation?.id]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowResolverDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Monitorar status dos usuários via polling (já que WebSocket pode não estar disponível)
  useEffect(() => {
    const updateStatus = async () => {
      if (showTransferDropdown && agents.length > 0) {
        const token = localStorage.getItem('token');
        try {
          const response = await axios.get('/api/users/status/', {
            headers: { Authorization: `Token ${token}` }
          });
          
          if (response.data && response.data.users) {
            const statusUpdates = {};
            response.data.users.forEach(user => {
              statusUpdates[user.id] = user.is_online;
            });
            setAgentsStatus(prev => ({ ...prev, ...statusUpdates }));
            console.log('Status dos usuários atualizado via polling:', statusUpdates);
          }
        } catch (error) {
          console.error('Erro ao buscar status dos usuários:', error);
        }
      }
    };

    // Atualizar status a cada 10 segundos quando o modal estiver aberto
    const interval = setInterval(updateStatus, 10000);
    
    // Atualizar imediatamente quando o modal abrir
    if (showTransferDropdown) {
      updateStatus();
    }

    return () => {
      clearInterval(interval);
    };
  }, [showTransferDropdown, agents]);

  // # Debug logging removed for security WebSocket CORRIGIDO - Melhor controle de duplicatas
  useEffect(() => {
    if (!conversation) return;

    const connectWebSocket = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${wsProtocol}://${window.location.host}/ws/conversations/${conversation.id}/`;
      console.log('# Debug logging removed for security ChatArea conectando WebSocket:', wsUrl);
      const ws = new window.WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('# Debug logging removed for security ChatArea WebSocket conectado');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 ChatArea WebSocket recebeu:', data);
          
          if (data.type === 'message' || data.type === 'chat_message' || data.type === 'message_created') {
            if (data.message) {
              setMessages(currentMessages => {
                // # Debug logging removed for security Verificação mais robusta de duplicatas
                const messageExists = currentMessages.some(m => m.id === data.message.id);
                
                if (!messageExists) {
                  let processedContent = processMessageContent(data.message.content, data.message.is_from_customer);
                  
                  // # Debug logging removed for security Remover assinatura do agente se presente (WebSocket)
                  if (processedContent && processedContent.match(/\*.*disse:\*\n/) && !data.message.is_from_customer) {
                    processedContent = processedContent.replace(/\*.*disse:\*\n/, '');
                  }
                  
                  const processedMessage = {
                    ...data.message,
                    content: processedContent
                  };
                  
                  // # Debug logging removed for security Remover das mensagens pendentes se existir
                  setPendingMessages(prev => {
                    const newSet = new Set(prev);
                    // Remover a mensagem original (sem assinatura) das pendentes
                    const originalContent = processedMessage.content.replace(/\*.*disse:\*\n/, '');
                    newSet.delete(originalContent);
                    return newSet;
                  });
                  
                  // # Debug logging removed for security Remover mensagens temporárias relacionadas
                  const filteredMessages = currentMessages.filter(m => {
                    // Remover mensagens temporárias com conteúdo similar
                    if (m.isTemporary || m.is_sending) {
                      const originalContent = processedMessage.content.replace(/\*.*disse:\*\n/, '');
                      return !(m.content === originalContent && 
                              m.is_from_customer === processedMessage.is_from_customer);
                    }
                    return true;
                  });
                  
                  return [...filteredMessages, processedMessage].sort((a, b) => 
                    new Date(a.created_at) - new Date(b.created_at)
                  );
                }
                return currentMessages;
              });
            }
          }
          
          if (data.type === 'conversation_updated') {
            console.log('# Debug logging removed for security Conversa atualizada via WebSocket');
            if (onConversationUpdate) {
              onConversationUpdate(data.conversation || conversation);
            }
          }
          
          // Listener para eventos de encerramento de conversa
          if (data.type === 'conversation_event') {
            console.log('📨 ChatArea recebeu evento de conversa:', data);
            
            if (data.event_type === 'conversation_closed' || data.event_type === 'conversation_ended') {
              console.log('🔒 Conversa encerrada via WebSocket');
              
              // Atualizar estado da conversa
              if (onConversationUpdate) {
                onConversationUpdate({
                  ...conversation,
                  status: 'closed',
                  closed_at: data.timestamp
                });
              }
              
              // Notificar usuário
              if (onConversationClose) {
                onConversationClose();
              }
              
              // Limpar mensagens e estado
              setMessages([]);
              setMessage('');
              setLoading(false);
              setError('');
            }
            
                      // Listener para atribuição de conversa
          if (data.event_type === 'conversation_assigned') {
            console.log('👤 Conversa atribuída via WebSocket');
            
            if (onConversationUpdate) {
              onConversationUpdate({
                ...conversation,
                assignee_id: data.data.assignee_id
              });
            }
          }
          
          // Listener para mudanças de provedor (isolamento multi-tenant)
          if (data.event_type === 'provedor_changed') {
            console.log('🏢 Mudança de provedor detectada via WebSocket');
            
            // Verificar se a conversa atual pertence ao provedor correto
            if (data.data.provedor_id !== conversation?.contact?.provedor?.id) {
              console.log('⚠️ Conversa não pertence ao provedor atual, redirecionando...');
              
              // Redirecionar para lista de conversas
              if (onConversationClose) {
                onConversationClose();
              }
              
              // Limpar estado
              setMessages([]);
              setMessage('');
              setLoading(false);
              setError('');
            }
          }
          }
          
        } catch (error) {
          console.error('# Debug logging removed for security Erro ao processar mensagem WebSocket ChatArea:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('# Debug logging removed for security Erro no WebSocket ChatArea:', error);
      };
      
      ws.onclose = (event) => {
        console.log('# Debug logging removed for security WebSocket ChatArea desconectado:', event.code, event.reason);
        if (conversation && conversation.id) {
          setTimeout(connectWebSocket, 3000);
        }
      };
    };

    connectWebSocket();
    
    return () => {
      console.log('# Debug logging removed for security Fechando WebSocket');
      if (wsRef.current) {
        if (wsRef.current.heartbeatInterval) {
          clearInterval(wsRef.current.heartbeatInterval);
        }
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close(1000);
        }
        wsRef.current = null;
      }
    };
  }, [conversation]);

  // # Debug logging removed for security LIMPEZA AUTOMÁTICA DE MENSAGENS TEMPORÁRIAS
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setMessages(currentMessages => {
        const now = Date.now();
        return currentMessages.filter(msg => {
          if (msg.isTemporary || msg.is_sending) {
            const messageAge = now - new Date(msg.created_at).getTime();
            return messageAge <= 15000; // Manter por no máximo 15 segundos
          }
          return true;
        });
      });
    }, 5000); // Executar a cada 5 segundos
    
    // Sistema de refresh automático para evitar cache desatualizado
    const refreshInterval = setInterval(() => {
      if (conversation && conversation.id) {
        console.log('🔄 Refresh automático de conversa para evitar cache desatualizado');
        
        // Recarregar mensagens da conversa
        fetchMessages();
        
        // Verificar se a conversa ainda está ativa
        checkConversationStatus();
      }
    }, 30000); // Refresh a cada 30 segundos

    return () => {
      clearInterval(cleanupInterval);
      clearInterval(refreshInterval);
    };
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // # Debug logging removed for security handleSendMessage CORRIGIDO - SEM mensagem temporária
  const handleSendMessage = async () => {
    if (!message.trim() || !conversation) return;
    setError('');
    const token = localStorage.getItem('token');
    
    // # Debug logging removed for security Marcar mensagem como pendente para evitar duplicatas
    const messageKey = message.trim();
    if (pendingMessages.has(messageKey)) {
      console.log('🚫 Mensagem já está sendo enviada, ignorando...');
      return;
    }
    
    setPendingMessages(prev => new Set(prev).add(messageKey));
    
    try {
      // Buscar informações do usuário atual para adicionar assinatura
      const userResponse = await axios.get('/api/auth/me/', {
        headers: { Authorization: `Token ${token}` }
      });
      
      const currentUser = userResponse.data;
      const userName = currentUser.first_name || currentUser.username || 'Usuário';
      
      // Formatar mensagem com nome do usuário para enviar ao WhatsApp
      const formattedMessage = `*${userName} disse:*\n${message}`;
      
      // # Debug logging removed for security NÃO adicionar mensagem temporária - deixar o WebSocket fazer isso
      
      // Preparar payload para envio
      const payload = {
        conversation_id: conversation.id,
        content: formattedMessage
      };
      
      // Adicionar informações de resposta se estiver respondendo a uma mensagem
      if (replyingToMessage) {
        const replyId = replyingToMessage.additional_attributes?.external_id || replyingToMessage.id;
        payload.reply_to_message_id = replyId;
        payload.reply_to_content = replyingToMessage.content;
        console.log('DEBUG: Enviando resposta para mensagem:', {
          original_id: replyingToMessage.id,
          external_id: replyingToMessage.additional_attributes?.external_id,
          reply_id: replyId,
          content: replyingToMessage.content
        });
      }
      
      // Enviar mensagem formatada para o WhatsApp
      const response = await axios.post('/api/messages/send_text/', payload, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // # Debug logging removed for security Se o WebSocket não funcionar, adicionar mensagem do response
      setTimeout(() => {
        if (pendingMessages.has(messageKey)) {
          console.log('⏰ WebSocket não recebeu mensagem, adicionando do response...');
          if (response.data && response.data.id) {
            const processedMessage = {
              ...response.data,
              content: processMessageContent(response.data.content, response.data.is_from_customer)
            };
            
            setMessages(currentMessages => {
              const messageExists = currentMessages.some(m => m.id === response.data.id);
              if (!messageExists) {
                return [...currentMessages, processedMessage].sort((a, b) => 
                  new Date(a.created_at) - new Date(b.created_at)
                );
              }
              return currentMessages;
            });
          }
          
          // Remover das pendentes
          setPendingMessages(prev => {
            const newSet = new Set(prev);
            newSet.delete(messageKey);
            return newSet;
          });
        }
      }, 2000); // Aguardar 2 segundos pelo WebSocket
      
      setMessage('');
      setReplyingToMessage(null);
      
    } catch (e) {
      console.error('# Debug logging removed for security Erro ao enviar mensagem:', e);
      setError('Erro ao enviar mensagem.');
      
      // # Debug logging removed for security Remover das pendentes em caso de erro
      setPendingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageKey);
        return newSet;
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Funções para gravação de áudio
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia não é suportado neste navegador');
      }
      
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('ngrok');
      
      if (!isSecure) {
        throw new Error('Gravação de áudio requer HTTPS. Use HTTPS ou localhost para gravar áudio.');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      
      if (error.name === 'NotAllowedError') {
        setError('Permissão de microfone negada. Clique no ícone do microfone na barra de endereços para permitir.');
      } else if (error.name === 'NotFoundError') {
        setError('Nenhum microfone encontrado. Verifique se há um microfone conectado.');
      } else if (error.message.includes('getUserMedia não é suportado')) {
        setError('Gravação de áudio não é suportada neste navegador. Tente usar HTTPS ou um navegador mais recente.');
      } else if (error.message.includes('requer HTTPS')) {
        setError('Gravação de áudio requer HTTPS. Use HTTPS ou localhost para gravar áudio.');
      } else if (error.name === 'NotSupportedError') {
        setError('Este navegador não suporta gravação de áudio. Tente usar Chrome, Firefox ou Edge.');
      } else {
        setError('Erro ao acessar microfone. Verifique as permissões ou tente usar HTTPS.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const sendAudioMessage = async () => {
    if (!audioBlob || !conversation) return;
    
    if (sendingMedia) {
      console.log('🚫 Já está enviando áudio, ignorando...');
      return;
    }
    
    try {
      console.log('🎙️ Iniciando envio de áudio PTT...');
      
      const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, {
        type: 'audio/webm'
      });
      
      console.log('🎙️ Dados do áudio:', {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type
      });
      
      const maxSize = 16 * 1024 * 1024;
      if (audioFile.size > maxSize) {
        setError('Áudio muito grande. Tamanho máximo: 16MB');
        return;
      }
      
      if (audioBlob.size === 0) {
        setError('Áudio inválido. Tente gravar novamente.');
        return;
      }
      
      console.log('# Debug logging removed for security Validações passaram, enviando áudio...');
      
      const finalMediaType = 'ptt';
      console.log(`🎙️ Usando media_type: ${finalMediaType}`);
      
      if (finalMediaType !== 'ptt') {
        console.error('# Debug logging removed for security ERRO: media_type não é PTT!');
        setError('Erro interno: tipo de mídia inválido');
        return;
      }
      
      await handleSendMedia(audioFile, finalMediaType, null);
      
      console.log('# Debug logging removed for security Áudio enviado com sucesso!');
      
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('# Debug logging removed for security Erro ao enviar áudio:', error);
      setError('Erro ao enviar áudio: ' + error.message);
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playAudio = (messageId, audioUrl) => {
    console.log('🎵 Reproduzindo áudio:', { messageId, audioUrl });
    
    if (playingAudio && playingAudio !== messageId) {
      const prevAudio = audioRefs.current[playingAudio];
      if (prevAudio) {
        prevAudio.pause();
        prevAudio.currentTime = 0;
      }
    }
    
    let audio = audioRefs.current[messageId];
    if (!audio) {
      audio = new Audio(audioUrl);
      audioRefs.current[messageId] = audio;
      
      audio.addEventListener('timeupdate', () => {
        const progress = (audio.currentTime / audio.duration) * 100;
        setAudioProgress(prev => ({ ...prev, [messageId]: progress }));
      });
      
      audio.addEventListener('ended', () => {
        setPlayingAudio(null);
        setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Erro ao reproduzir áudio:', e);
        setPlayingAudio(null);
      });
    }
    
    audio.play().then(() => {
      setPlayingAudio(messageId);
    }).catch(e => {
      console.error('Erro ao reproduzir áudio:', e);
    });
  };
  
  const pauseAudio = (messageId) => {
    const audio = audioRefs.current[messageId];
    if (audio) {
      audio.pause();
      setPlayingAudio(null);
    }
  };

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
      audioRefs.current = {};
    };
  }, [audioUrl]);

  // # Debug logging removed for security handleSendMedia CORRIGIDO - SEM mensagem temporária
  const handleSendMedia = async (file, mediaType, caption = '') => {
    if (!conversation) return;
    
    if (sendingMedia) {
      console.log('🚫 Já está enviando mídia, ignorando...');
      return;
    }
    
    setError('');
    setSendingMedia(true);
    const token = localStorage.getItem('token');
    
    console.log('📤 Iniciando envio de mídia:', {
      fileName: file.name,
      fileSize: file.size,
      mediaType,
      caption,
      conversationId: conversation.id
    });
    
    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Arquivo muito grande. Tamanho máximo: 16MB');
      setSendingMedia(false);
      return;
    }
    
    // Validar tipo de arquivo
    const allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
      audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm'],
      ptt: ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
      myaudio: ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    
    if (!allowedTypes[mediaType]?.includes(file.type)) {
      console.warn('⚠️ Tipo de arquivo não reconhecido:', file.type);
    }
    
    try {
      // # Debug logging removed for security NÃO adicionar mensagem de "enviando..." - deixar o WebSocket fazer isso
      
      // Buscar informações do usuário atual se houver caption (exceto para PTT)
      let formattedCaption = caption;
      if (caption && mediaType !== 'ptt') {
        const userResponse = await axios.get('/api/auth/me/', {
          headers: { Authorization: `Token ${token}` }
        });
        
        const currentUser = userResponse.data;
        const userName = currentUser.first_name || currentUser.username || 'Usuário';
        formattedCaption = `*${userName} disse:*\n${caption}`;
      }
      
      const formData = new FormData();
      formData.append('conversation_id', conversation.id);
      formData.append('media_type', mediaType);
      formData.append('file', file);
      // Para PTT (mensagens de voz), não enviar caption
      if (formattedCaption && mediaType !== 'ptt') {
        formData.append('caption', formattedCaption);
      }
      
      console.log('📤 Enviando mídia para o backend...');
      console.log('📦 FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (key === 'file') {
          console.log(`   - ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`   - ${key}: ${value}`);
        }
      }
      
      // Enviar mídia com caption formatado para o WhatsApp
      const response = await axios.post('/api/messages/send_media/', formData, {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('# Debug logging removed for security Mídia enviada com sucesso:', response.data);
      
      // # Debug logging removed for security Se o WebSocket não funcionar, adicionar mensagem do response
      setTimeout(() => {
        if (response.data && response.data.id) {
          setMessages(currentMessages => {
            const messageExists = currentMessages.some(m => m.id === response.data.id);
            if (!messageExists) {
              console.log('⏰ WebSocket não recebeu mídia, adicionando do response...');
              return [...currentMessages, response.data].sort((a, b) => 
                new Date(a.created_at) - new Date(b.created_at)
              );
            }
            return currentMessages;
          });
        }
      }, 2000); // Aguardar 2 segundos pelo WebSocket
      
    } catch (e) {
      console.error('# Debug logging removed for security Erro ao enviar mídia:', e);
      console.error('# Debug logging removed for security Detalhes do erro:', e.response?.data);
      setError('Erro ao enviar mídia: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSendingMedia(false);
    }
  };

  // Função para atribuir conversa para o usuário atual
  const handleAssignToMe = async () => {
    if (!conversation) return;
    
    const token = localStorage.getItem('token');
    try {
      // Primeiro, buscar o usuário atual
      const userResponse = await axios.get('/api/auth/me/', {
        headers: { Authorization: `Token ${token}` }
      });
      
      const currentUser = userResponse.data;
      console.log('Usuário atual:', currentUser);
      
      // Atualizar a conversa com o usuário atual como assignee
      const response = await axios.patch(`/api/conversations/${conversation.id}/`, {
        assignee: currentUser.id
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      console.log('Conversa atribuída com sucesso:', response.data);
      setShowResolverDropdown(false);
      
      // Aguardar um pouco antes de recarregar para garantir que a atualização foi processada
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Erro ao atribuir conversa:', error);
      console.error('Detalhes do erro:', error.response?.data);
      alert('Erro ao atribuir conversa. Tente novamente.');
    }
  };

  // Função para encerrar conversa
  const handleCloseConversation = async () => {
    if (!conversation) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await axios.patch(`/api/conversations/${conversation.id}/`, {
        status: 'closed'
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      console.log('Conversa encerrada com sucesso:', response.data);
      setShowResolverDropdown(false);
      
      // Limpar conversa selecionada do localStorage
      localStorage.removeItem('selectedConversation');
      
      // Chamar callback para fechar a conversa
      if (onConversationClose) {
        onConversationClose();
      }
      
      // Notificar atualização da conversa para recarregar a lista
      if (onConversationUpdate) {
        onConversationUpdate();
      }
      
      // Fallback: navegar de volta para a lista de conversas
      if (!onConversationClose) {
        const provedorId = conversation.inbox?.provedor?.id || '';
        navigate(`/app/accounts/${provedorId}/conversations`);
      }
    } catch (error) {
      console.error('Erro ao encerrar conversa:', error);
      console.error('Detalhes do erro:', error.response?.data);
      alert('Erro ao encerrar conversa. Tente novamente.');
    }
  };

  // Função para buscar atendentes do provedor
  const fetchAgents = async () => {
    if (!conversation) return;
    
    const token = localStorage.getItem('token');
    setLoadingAgents(true);
    
    try {
      // Usar a mesma lógica do ConversasDashboard
      const response = await axios.get('/api/users/?provedor=me', { 
        headers: { Authorization: `Token ${token}` } 
      });
      
      const agents = response.data.results || response.data;
      console.log('Agentes encontrados:', agents);
      setAgents(agents);
      
      // Buscar status atual dos usuários
      await fetchUsersStatus(agents, token);
      
      setShowTransferDropdown(true);
    } catch (error) {
      console.error('Erro ao buscar atendentes:', error);
      setAgents([]);
    } finally {
      setLoadingAgents(false);
    }
  };

  // Função para buscar status atual dos usuários
  const fetchUsersStatus = async (users, token) => {
    try {
      // Buscar status atual dos usuários
      console.log('Buscando status dos usuários...');
      const statusResponse = await axios.get('/api/users/status/', {
        headers: { Authorization: `Token ${token}` }
      });
      
      console.log('Resposta do status:', statusResponse.data);
      
      if (statusResponse.data && statusResponse.data.users) {
        const statusUpdates = {};
        statusResponse.data.users.forEach(user => {
          statusUpdates[user.id] = user.is_online;
        });
        setAgentsStatus(prev => ({ ...prev, ...statusUpdates }));
        console.log('Status dos usuários atualizado:', statusUpdates);
      }
    } catch (error) {
      console.error('Erro ao buscar status dos usuários:', error);
      // Se não conseguir buscar status, usar o status do backend
      const statusUpdates = {};
      users.forEach(user => {
        statusUpdates[user.id] = user.is_online;
      });
      setAgentsStatus(prev => ({ ...prev, ...statusUpdates }));
    }
  };

  // Função para atualizar status dos agentes em tempo real
  const updateAgentStatus = (agentId, isOnline) => {
    setAgentsStatus(prev => ({
      ...prev,
      [agentId]: isOnline
    }));
  };

  // Função para transferir conversa
  const handleTransferConversation = async () => {
    setShowResolverDropdown(false);
    await fetchAgents();
  };

  // Função para transferir para um agente específico
  const handleTransferToAgent = async (agentId) => {
    if (!conversation) return;
    
    const token = localStorage.getItem('token');
    const url = `/api/conversations/${conversation.id}/transfer/`;
    
    console.log('# Debug logging removed for security DEBUG: URL de transferência:', url);
    console.log('# Debug logging removed for security DEBUG: Axios baseURL:', axios.defaults.baseURL);
    console.log('# Debug logging removed for security DEBUG: URL completa:', axios.defaults.baseURL + url);
    
    try {
      // Usar o mesmo endpoint do ConversasDashboard
      const response = await axios.post(url, { 
        user_id: agentId 
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      console.log('Conversa transferida com sucesso!');
      alert('Transferido com sucesso!');
      setShowTransferDropdown(false);
      
      // Atualizar a interface em vez de recarregar a página
      if (response.data.success) {
        const updatedConversation = {
          ...conversation,
          status: 'pending',
          assignee: null
        };
        if (onConversationUpdate) {
          onConversationUpdate(updatedConversation);
        }
        setShowTransferDropdown(false);
      }
      
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      console.error('# Debug logging removed for security DEBUG: URL que falhou:', url);
      console.error('# Debug logging removed for security DEBUG: Axios baseURL atual:', axios.defaults.baseURL);
      alert('Erro ao transferir atendimento.');
    }
  };

  const fetchProfilePicture = async (silent = false) => {
    if (!conversation || !conversation.contact) {
      return;
    }
    
    setLoadingProfilePic(true);
    const token = localStorage.getItem('token');
    
    try {
      // Determinar o tipo de integração baseado no canal
      // Para todas as conversas WhatsApp, usar Uazapi (que está funcionando)
      const integrationType = (conversation.inbox?.channel_type === 'whatsapp' || 
                              conversation.inbox?.channel_type === 'whatsapp_beta') ? 'uazapi' : 'evolution';
      
      // Para Uazapi, usar a instância configurada no provedor
      // Para Evolution, usar a instância do canal
      let instanceName;
      if (integrationType === 'uazapi') {
        // Para Uazapi, usar uma instância padrão ou buscar do provedor
        instanceName = 'teste-niochat'; // Instância padrão da Uazapi
      } else {
        // Para Evolution, usar a instância do canal
        instanceName = conversation.inbox?.settings?.evolution_instance || 
                      conversation.inbox?.settings?.instance || 
                      conversation.inbox?.name?.replace('WhatsApp ', '');
      }
      
      console.log(`# Debug logging removed for security Buscando foto via ${integrationType}, instância: ${instanceName}`);
      console.log(`# Debug logging removed for security Channel type: ${conversation.inbox?.channel_type}`);
      
      const response = await axios.post('/api/canais/get_whatsapp_profile_picture/', {
        phone: conversation.contact.phone,
        instance_name: instanceName,
        integration_type: integrationType
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      if (response.data.success) {
        if (!silent) {
          alert('Foto do perfil atualizada com sucesso! Recarregue a página para ver a mudança.');
        }
      } else {
        if (!silent) {
          alert('Não foi possível obter a foto do perfil: ' + response.data.error);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar foto do perfil:', error);
      if (!silent) {
        alert('Erro ao buscar foto do perfil. Verifique o console para mais detalhes.');
      }
    } finally {
      setLoadingProfilePic(false);
    }
  };

  // Função para enviar reação
  const sendReaction = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem('token');
      
      // Chamar endpoint do backend para enviar reação
      const response = await axios.post('/api/messages/react/', {
        message_id: messageId,
        emoji: emoji
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      if (response.data.success) {
        console.log('Reação enviada com sucesso');
        setShowReactionPicker(false);
        setSelectedMessageForReaction(null);
        
        console.log('# Debug logging removed for security Processando mensagem após reação...');
        
        // Atualizar a mensagem localmente com a resposta do backend
        const updatedMessage = response.data.updated_message;
        
        // Processar o conteúdo da mensagem atualizada
        const processedMessage = {
          ...updatedMessage,
          content: processMessageContent(updatedMessage.content, updatedMessage.is_from_customer)
        };
        
        // Atualizar no estado local
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === messageId ? processedMessage : msg
          )
        );
      } else {
        alert('Erro ao enviar reação: ' + (response.data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao enviar reação:', error);
      
      let errorMessage = 'Erro ao enviar reação';
      if (error.response?.status === 401) {
        errorMessage = 'Erro de autenticação. Faça login novamente.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Mensagem não encontrada.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Dados inválidos.';
      } else {
        errorMessage = error.response?.data?.error || error.message;
      }
      
      alert(errorMessage);
    }
  };

  // Função para apagar mensagem
  const deleteMessage = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('# Debug logging removed for security DEBUG: Tentando excluir mensagem:', messageId);
      console.log('# Debug logging removed for security DEBUG: Token:', token ? 'Presente' : 'Ausente');
      
      // Chamar endpoint do backend para deletar mensagem
      const response = await axios.post('/api/messages/delete_message/', {
        message_id: messageId
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      console.log('# Debug logging removed for security DEBUG: Resposta do servidor:', response.status, response.data);
      
      if (response.data.success) {
        console.log('Mensagem apagada com sucesso');
        setShowDeleteConfirm(false);
        setMessageToDelete(null);
        
        // Atualizar a mensagem localmente com a resposta do backend
        const updatedMessage = response.data.updated_message;
        
        // Processar o conteúdo da mensagem atualizada
        const processedMessage = {
          ...updatedMessage,
          content: processMessageContent(updatedMessage.content, updatedMessage.is_from_customer)
        };
        
        // Atualizar no estado local
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === messageId ? processedMessage : msg
          )
        );
      } else {
        alert('Erro ao apagar mensagem: ' + (response.data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('# Debug logging removed for security DEBUG: Erro completo:', error);
      console.error('# Debug logging removed for security DEBUG: Status:', error.response?.status);
      console.error('# Debug logging removed for security DEBUG: Data:', error.response?.data);
      console.error('# Debug logging removed for security DEBUG: URL:', error.config?.url);
      
      let errorMessage = 'Erro ao apagar mensagem';
      if (error.response?.status === 401) {
        errorMessage = 'Erro de autenticação. Faça login novamente.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Mensagem não encontrada.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Dados inválidos.';
      } else {
        errorMessage = error.response?.data?.error || error.message;
      }
      
      alert(errorMessage);
    }
  };

  // Função para abrir seletor de reação
  const openReactionPicker = (message) => {
    setSelectedMessageForReaction(message);
    setShowReactionPicker(true);
  };

  // Função para responder a uma mensagem
  const handleReplyToMessage = (message) => {
    setReplyingToMessage(message);
    // Focar no input de mensagem
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
      messageInput.focus();
    }
  };

  // Função para cancelar resposta
  const cancelReply = () => {
    setReplyingToMessage(null);
  };

  // Função para confirmar exclusão
  const confirmDelete = (message) => {
    setMessageToDelete(message);
    setShowDeleteConfirm(true);
  };

  // Função para determinar se uma mensagem é grande (estilo WhatsApp)
  const isLargeMessage = (content) => {
    if (!content) return false;
    
    // Considerar mensagem grande se:
    // 1. Tem mais de 100 caracteres
    // 2. Tem mais de 3 linhas
    // 3. Contém quebras de linha
    const charCount = content.length;
    const lineCount = content.split('\n').length;
    const hasLineBreaks = content.includes('\n');
    
    return charCount > 100 || lineCount > 3 || hasLineBreaks;
  };

  // Função para determinar o alinhamento da mensagem
  const getMessageAlignment = (msg, content) => {
    const isCustomer = msg.is_from_customer;
    
    // TODAS as mensagens do sistema (IA ou atendente) ficam do lado direito
    if (!isCustomer) {
      return 'justify-end';
    }
    
    // Mensagens do cliente ficam do lado esquerdo
    return 'justify-start';
  };

  // Função para determinar a ordem da mensagem
  const getMessageOrder = (msg, content) => {
    const isCustomer = msg.is_from_customer;
    
    // TODAS as mensagens do sistema (IA ou atendente) usam ordem 2 (direita)
    if (!isCustomer) {
      return 'order-2';
    }
    
    // Mensagens do cliente usam ordem 1 (esquerda)
    return 'order-1';
  };

  // # Debug logging removed for security USAR LIMPEZA DE DUPLICATAS NO RENDER
  const uniqueMessages = cleanDuplicateMessages(messages);
  
  // Limpeza de duplicatas funcionando corretamente

  // Função para lidar com upload de arquivo
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Determinar tipo de mídia baseado no tipo do arquivo
    let mediaType = 'document'; // Padrão
    
    if (file.type.startsWith('image/')) {
      mediaType = 'image';
    } else if (file.type.startsWith('video/')) {
      mediaType = 'video';
    } else if (file.type.startsWith('audio/')) {
      mediaType = 'audio';
    }
    
    // Enviar arquivo
    handleSendMedia(file, mediaType);
    
    // Limpar input
    event.target.value = '';
  };

  // Função para abrir modal de imagem
  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header da conversa */}
      <div className="border-b border-border p-4 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
            <div className="relative">
              {conversation.contact?.avatar ? (
                  <img 
                    src={conversation.contact.avatar} 
                  alt={conversation.contact.name || 'Avatar'}
                  className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm ${conversation.contact?.avatar ? 'hidden' : 'flex'}`}
              >
                {(conversation.contact?.name || conversation.contact?.phone || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-foreground">
                  {conversation.contact?.name || conversation.contact?.phone || 'Contato sem nome'}
                </h3>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  {getChannelIcon(conversation.inbox?.channel_type)}
                  <span className="capitalize">
                    {conversation.inbox?.channel_type === 'whatsapp' ? 'WhatsApp' : 
                     conversation.inbox?.channel_type === 'telegram' ? 'Telegram' :
                     conversation.inbox?.channel_type === 'email' ? 'Email' :
                     conversation.inbox?.channel_type === 'instagram' ? 'Instagram' :
                     conversation.inbox?.channel_type === 'webchat' ? 'Web Chat' :
                     conversation.inbox?.channel_type || 'Chat'}
                  </span>
                </div>
              </div>
              {conversation.contact?.phone && (
                <p className="text-sm text-muted-foreground">{conversation.contact.phone}</p>
              )}
              </div>
            </div>
            
          <div className="flex items-center space-x-2">
            {/* Botão para buscar foto do perfil */}
            {conversation.inbox?.channel_type === 'whatsapp' && (
              <button
                onClick={() => fetchProfilePicture(false)}
                disabled={loadingProfilePic}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                title="Atualizar foto do perfil"
              >
                {loadingProfilePic ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </button>
            )}
            
            {/* Dropdown de ações */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowResolverDropdown(!showResolverDropdown)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                title="Ações da conversa"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showResolverDropdown && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-10">
                        <button 
                          onClick={handleAssignToMe}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center space-x-2"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Atribuir para mim</span>
                        </button>
                        <button 
                          onClick={handleTransferConversation}
                    disabled={loadingAgents}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center space-x-2 disabled:opacity-50"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                    <span>{loadingAgents ? 'Carregando...' : 'Transferir'}</span>
                        </button>
                        <button 
                          onClick={handleCloseConversation}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center space-x-2 text-red-600"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                    <span>Encerrar conversa</span>
                        </button>
                </div>
              )}
            </div>
          </div>
        </div>
            </div>

      {/* Lista de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        {error && (
          <div className="text-center text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
            {error}
        </div>
      )}

        {uniqueMessages.map((msg) => {
          const content = msg.content || '';
            const isCustomer = msg.is_from_customer;
          const isBot = !isCustomer && (msg.message_type === 'incoming' || msg.sender?.sender_type === 'bot');
          const isAgent = !isCustomer && !isBot;
          const isLarge = isLargeMessage(content);
          
          // Determinar se a mensagem tem mídia
          const hasImage = (msg.attachments && msg.attachments.some(att => att.file_type === 'image')) || 
                          (msg.message_type === 'image' && msg.file_url);
          const hasVideo = (msg.attachments && msg.attachments.some(att => att.file_type === 'video')) || 
                          (msg.message_type === 'video' && msg.file_url);
          const hasAudio = (msg.attachments && msg.attachments.some(att => att.file_type === 'audio')) || 
                          (msg.message_type === 'audio' && msg.file_url);
          const hasDocument = (msg.attachments && msg.attachments.some(att => att.file_type === 'file')) || 
                             (msg.message_type === 'document' && msg.file_url);

          // Debug: logar dados da mensagem
          if (msg.message_type === 'image' || (msg.attachments && msg.attachments.some(att => att.file_type === 'image'))) {
            console.log('🖼️ MENSAGEM COM IMAGEM:', {
              id: msg.id,
              message_type: msg.message_type,
              file_url: msg.file_url,
              attachments: msg.attachments,
              content: msg.content,
              hasImage,
              'URL construída': msg.file_url ? (msg.file_url.startsWith('http') ? msg.file_url : `http://192.168.100.55:8012${msg.file_url}`) : 'N/A'
            });
          }
            
            return (
            <div key={msg.id} className={`flex ${getMessageAlignment(msg, content)} group`}>
              <div className={`max-w-[70%] ${getMessageOrder(msg, content)}`}>
                <div className={`
                  rounded-2xl px-4 py-3 shadow-sm
                  ${isCustomer 
                    ? 'bg-muted text-foreground' 
                    : isBot 
                      ? 'bg-blue-500 text-white'
                      : 'bg-green-500 text-white'
                  }
                  ${isLarge ? 'rounded-2xl' : 'rounded-2xl'}
                `}>
                  {/* Resposta a mensagem anterior */}
                  {msg.additional_attributes?.is_reply && (
                    <div className="mb-2 p-2 bg-black/10 rounded-lg text-xs opacity-75">
                      <div className="font-medium">Respondendo a:</div>
                      <div className="truncate">
                        {msg.additional_attributes.reply_to_content || 'Mensagem anterior'}
                  </div>
                </div>
              )}
              
                  {/* Anexos de imagem */}
                  {hasImage && msg.attachments && msg.attachments.filter(att => att.file_type === 'image').map((attachment, index) => (
                    <div key={index} className="mb-2">
                      <img
                        src={attachment.data_url}
                        alt="Imagem"
                        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal(attachment.data_url)}
                        style={{ maxHeight: '300px' }}
                    />
                  </div>
                  ))}
                  
                  {/* Imagens via file_url (WhatsApp/Telegram etc) */}
                  {hasImage && msg.message_type === 'image' && msg.file_url && (
                    <div className="mb-2">
                      <img
                        src={msg.file_url.startsWith('http') ? msg.file_url : `http://192.168.100.55:8012${msg.file_url}`}
                        alt="Imagem"
                        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal(msg.file_url.startsWith('http') ? msg.file_url : `http://192.168.100.55:8012${msg.file_url}`)}
                        style={{ maxHeight: '300px' }}
                        onError={(e) => {
                          console.error('Erro ao carregar imagem:', msg.file_url);
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Anexos de vídeo */}
                  {hasVideo && msg.attachments && msg.attachments.filter(att => att.file_type === 'video').map((attachment, index) => (
                    <div key={index} className="mb-2">
                    <video 
                      controls
                      className="max-w-full h-auto rounded-lg"
                      style={{ maxHeight: '300px' }}
                      >
                        <source src={attachment.data_url} type="video/mp4" />
                        Seu navegador não suporta o elemento de vídeo.
                      </video>
                  </div>
                  ))}
                  
                  {/* Vídeos via file_url */}
                  {hasVideo && msg.message_type === 'video' && msg.file_url && (
                    <div className="mb-2">
                      <video 
                        controls
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '300px' }}
                        onError={(e) => {
                          console.error('Erro ao carregar vídeo:', msg.file_url);
                        }}
                      >
                        <source src={msg.file_url.startsWith('http') ? msg.file_url : `http://192.168.100.55:8012${msg.file_url}`} type="video/mp4" />
                        Seu navegador não suporta o elemento de vídeo.
                      </video>
                    </div>
                  )}
                  
                  {/* Anexos de áudio */}
                  {hasAudio && msg.attachments && msg.attachments.filter(att => att.file_type === 'audio').map((attachment, index) => (
                    <div key={index} className="mb-2">
                    <CustomAudioPlayer 
                        src={attachment.data_url} 
                        messageId={msg.id}
                        playingAudio={playingAudio}
                        audioProgress={audioProgress}
                        onPlay={() => playAudio(msg.id, attachment.data_url)}
                        onPause={() => pauseAudio(msg.id)}
                    />
                  </div>
                  ))}
                  
                  {/* Áudios via file_url */}
                  {hasAudio && msg.message_type === 'audio' && msg.file_url && (
                    <div className="mb-2">
                      <CustomAudioPlayer 
                        src={msg.file_url.startsWith('http') ? msg.file_url : `http://192.168.100.55:8012${msg.file_url}`} 
                        messageId={msg.id}
                        playingAudio={playingAudio}
                        audioProgress={audioProgress}
                        onPlay={() => playAudio(msg.id, msg.file_url.startsWith('http') ? msg.file_url : `http://192.168.100.55:8012${msg.file_url}`)}
                        onPause={() => pauseAudio(msg.id)}
                      />
                    </div>
                  )}
                  
                  {/* Anexos de documento */}
                  {hasDocument && msg.attachments && msg.attachments.filter(att => att.file_type === 'file').map((attachment, index) => (
                    <div key={index} className="mb-2">
                      <a
                        href={attachment.data_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition-colors"
                      >
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm">{attachment.file_name || 'Documento'}</span>
                      </a>
                  </div>
                  ))}
                  
                  {/* Documentos via file_url */}
                  {hasDocument && msg.message_type === 'document' && msg.file_url && (
                    <div className="mb-2">
                      <a
                        href={msg.file_url.startsWith('http') ? msg.file_url : `http://192.168.100.55:8012${msg.file_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition-colors"
                      >
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm">{msg.content || 'Documento'}</span>
                      </a>
                    </div>
                  )}
                  
                  {/* QR Codes PIX */}
                  {msg.message_type === 'image' && msg.content && msg.content.includes('QR Code PIX') && (
                    <div className="mb-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                        🎯 QR Code PIX
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 mb-2">
                        Escaneie este QR code com o app do seu banco para pagar via PIX
                      </div>
                      {msg.file_url && (
                        <div className="bg-white p-2 rounded border">
                          <img
                            src={msg.file_url.startsWith('http') ? msg.file_url : `http://192.168.100.55:8012${msg.file_url}`}
                            alt="QR Code PIX"
                            className="w-32 h-32 mx-auto"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div className="hidden text-center text-xs text-gray-500">
                            QR Code PIX (imagem não disponível)
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Links de boleto */}
                  {msg.content && msg.content.includes('🔗') && msg.content.includes('Link do Boleto:') && (
                    <div className="mb-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-2">
                        📄 Boleto Bancário
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                        Clique no link abaixo para acessar o boleto completo
                      </div>
                      {msg.content.split('\n').map((line, index) => {
                        if (line.includes('https://')) {
                          return (
                            <a
                              key={index}
                              href={line.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm text-center"
                            >
                              📥 Baixar Boleto PDF
                            </a>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                  
                  {/* Botões interativos (como "Copiar Chave PIX") */}
                  {msg.additional_attributes?.has_buttons && msg.additional_attributes?.button_choices && (
                    <div className="mt-3 space-y-2">
                      {msg.additional_attributes.button_choices.map((choice, index) => {
                        const [nome, acao] = choice.split('|', 2);
                        if (acao && acao.startsWith('copy:')) {
                          const textoParaCopiar = acao.replace('copy:', '');
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                navigator.clipboard.writeText(textoParaCopiar);
                                // Mostrar feedback visual
                                const btn = event.target;
                                const originalText = btn.textContent;
                                btn.textContent = '✅ Copiado!';
                                btn.className = 'w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium';
                                setTimeout(() => {
                                  btn.textContent = originalText;
                                  btn.className = 'w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium';
                                }, 2000);
                              }}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              {nome}
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                  
                  {/* Mensagens especiais de fatura */}
                  {content && content.includes('💳') && content.includes('Fatura ID:') && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        📋 Detalhes da Fatura
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        {content.split('\n').map((line, index) => {
                          if (line.includes('Fatura ID:') || line.includes('Vencimento:') || line.includes('Valor:')) {
                            return (
                              <div key={index} className="flex justify-between">
                                <span className="font-medium">{line.split(':')[0]}</span>
                                <span>{line.split(':')[1]}</span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Conteúdo da mensagem - NÃO mostrar se for mídia pura */}
                  {content && !hasImage && !hasVideo && !hasAudio && !hasDocument && (
                    <div className="whitespace-pre-wrap break-words">
                      {content}
                  </div>
                )}
                
                  {/* Reações existentes */}
                  {msg.additional_attributes?.reaction && (
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="bg-white/20 rounded-full px-2 py-1 text-xs flex items-center space-x-1">
                        <span>{msg.additional_attributes.reaction.emoji}</span>
                        <span className="text-xs opacity-75">
                          {msg.additional_attributes.reaction.status === 'sent' ? '✓' : '⏳'}
                        </span>
                      </div>
                  </div>
                  )}

                  {/* Timestamp e ações */}
                  <div className={`flex items-center justify-between mt-1`}>
                    <div className={`text-xs ${isCustomer ? 'text-muted-foreground' : 'text-white/70'}`}>
                      {new Date(msg.created_at || msg.timestamp).toLocaleString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                      })}
                      {msg.isTemporary && (
                        <span className="ml-2 opacity-60">Enviando...</span>
                )}
              </div>
                    
                    {/* Botões de ação (só para mensagens do cliente com external_id) */}
                    {isCustomer && msg.additional_attributes?.external_id && (
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openReactionPicker(msg)}
                          className="p-1 hover:bg-white/20 rounded-full text-xs"
                        title="Reagir à mensagem"
                      >
                          😊
                      </button>
                      <button
                          onClick={() => handleReplyToMessage(msg)}
                          className="p-1 hover:bg-white/20 rounded-full text-xs"
                          title="Responder mensagem"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 17l-5-5 5-5M20 12H4"/>
                          </svg>
                      </button>
                  </div>
                )}
                    </div>
              </div>
            </div>
          </div>
            );
        })}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Área de resposta */}
        {replyingToMessage && (
        <div className="border-t border-border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground mb-1">Respondendo a:</div>
              <div className="text-sm truncate">
                {replyingToMessage.content || 'Mensagem'}
              </div>
              </div>
              <button
                onClick={cancelReply}
              className="p-1 hover:bg-accent rounded"
              >
              ✕
              </button>
            </div>
        </div>
      )}

      {/* Preview de áudio gravado */}
      {audioUrl && (
        <div className="border-t border-border bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-sm font-medium">Áudio gravado</div>
              <audio controls src={audioUrl} className="h-8" />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={sendAudioMessage}
                disabled={sendingMedia}
                className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
              >
                {sendingMedia ? 'Enviando...' : 'Enviar'}
              </button>
              <button
                onClick={() => {
                  setAudioBlob(null);
                  setAudioUrl(null);
                  setRecordingTime(0);
                }}
                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                Cancelar
              </button>
            </div>
            </div>
          </div>
        )}
        
      {/* Input de mensagem */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex items-center space-x-2">
          {/* Upload de arquivo */}
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />
          <button 
            onClick={() => document.getElementById('file-upload').click()}
            disabled={sendingMedia}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
            title="Enviar arquivo"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          {/* Input de texto */}
          <div className="flex-1 relative">
            <textarea
              id="message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={1}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
                height: 'auto'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>

          {/* Botão de gravação/envio */}
          {isRecording ? (
                    <div className="flex items-center space-x-2">
              <div className="text-sm text-red-500 font-mono">
                {formatRecordingTime(recordingTime)}
                    </div>
          <button
                    onClick={cancelRecording}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                    title="Cancelar gravação"
                  >
                <Square className="w-5 h-5" />
                  </button>
                  <button
                onClick={stopRecording}
                className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg transition-colors"
                title="Parar gravação"
              >
                <MicOff className="w-5 h-5" />
                  </button>
                </div>
          ) : (
            <button
              onClick={message.trim() ? handleSendMessage : startRecording}
              disabled={sendingMedia}
              className="p-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
              title={message.trim() ? "Enviar mensagem" : "Gravar áudio"}
          >
              {sendingMedia ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : message.trim() ? (
            <Send className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
          </button>
          )}
        </div>
      </div>

      {/* Modal de transferência */}
      {showTransferDropdown && (
        <Dialog open={showTransferDropdown} onOpenChange={setShowTransferDropdown}>
          <DialogContent className="max-w-md">
          <DialogHeader>
              <DialogTitle>Transferir Atendimento</DialogTitle>
          </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {agents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum atendente disponível
                </p>
              ) : (
                agents.map((agent) => (
              <button
                    key={agent.id}
                    onClick={() => handleTransferToAgent(agent.id)}
                    className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                          {(agent.first_name || agent.username || 'U').charAt(0).toUpperCase()}
            </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                          agentsStatus[agent.id] ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium">
                          {agent.first_name || agent.username}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {agentsStatus[agent.id] ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Modal de imagem */}
      {showImageModal && selectedImage && (
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <div className="flex items-center justify-center">
                <img
                  src={selectedImage}
                alt="Imagem ampliada"
                className="max-w-full max-h-[80vh] object-contain"
                />
            </div>
          </DialogContent>
      </Dialog>
      )}

      {/* Modal de Seleção de Reações */}
      {showReactionPicker && selectedMessageForReaction && (
        <Dialog open={showReactionPicker} onOpenChange={setShowReactionPicker}>
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Escolha uma reação</h3>
                <p className="text-sm text-muted-foreground">
                  Reaja à mensagem: "{selectedMessageForReaction.content?.slice(0, 50)}..."
                </p>
              </div>
              
              {/* Grid de emojis */}
              <div className="grid grid-cols-6 gap-2">
                {['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🤩', '🔥', '👏', '💯', '🎉', '😘', '🥰', '😍', '🤗', '🙌', '✨'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(selectedMessageForReaction.id, emoji)}
                    className="p-3 text-2xl hover:bg-accent rounded-lg transition-colors flex items-center justify-center"
                    title={`Reagir com ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
                    </div>
              
              {/* Botão para remover reação */}
              {selectedMessageForReaction.additional_attributes?.reaction && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => sendReaction(selectedMessageForReaction.id, '')}
                    className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remover reação
                  </button>
                </div>
              )}
              
              {/* Botões de ação */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  onClick={() => setShowReactionPicker(false)}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
              </div>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
};

export default ChatArea;