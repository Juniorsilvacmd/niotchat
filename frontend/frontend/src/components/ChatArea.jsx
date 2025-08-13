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
<<<<<<< HEAD
import EmojiPicker from './EmojiPicker';
=======
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4

const ChatArea = ({ conversation, onConversationClose, onConversationUpdate }) => {
  const navigate = useNavigate();
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
<<<<<<< HEAD
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
=======
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
  
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

  // Buscar mensagens ao abrir conversa
  useEffect(() => {
    if (!conversation) return;
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    axios.get(`/api/messages/?conversation=${conversation.id}`, {
      headers: { Authorization: `Token ${token}` }
    })
      .then(res => {
        const messages = res.data.results || res.data;
        
                    // Filtrar assinatura do agente das mensagens carregadas e parsear JSON
            const filteredMessages = messages.map(msg => {
              let processedContent = processMessageContent(msg.content, msg.is_from_customer);
              
              // Remover assinatura do agente se presente
              if (processedContent && processedContent.match(/\*.*disse:\*\n/) && !msg.is_from_customer) {
                processedContent = processedContent.replace(/\*.*disse:\*\n/, '');
              }
              

              
              return {
                ...msg,
                content: processedContent
              };
            });
        

        setMessages(filteredMessages);
      })
      .catch(() => setError('Erro ao carregar mensagens.'))
      .finally(() => setLoading(false));
  }, [conversation]);

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

  // WebSocket para mensagens em tempo real
  useEffect(() => {
    if (!conversation) return;

    const connectWebSocket = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      // Usar a porta do backend (8010) em vez da porta do frontend
      const wsUrl = `${wsProtocol}://172.21.31.23:8010/ws/conversations/${conversation.id}/`;
      console.log('🔌 Conectando WebSocket:', wsUrl);
      const ws = new window.WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('✅ WebSocket conectado para conversa:', conversation.id);
        console.log('✅ WebSocket URL:', wsUrl);
        // Reset retry count on successful connection
        if (wsRef.current.retryCount) {
          wsRef.current.retryCount = 0;
        }
        
        // Start heartbeat
        wsRef.current.heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Send ping every 30 seconds
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket mensagem recebida:', data);
          
          if (data.type === 'message' && data.message) {
            console.log('➕ Verificando mensagem:', data.message);
            
            // Processar conteúdo da mensagem (parsear JSON se necessário)
            let processedMessage = { ...data.message };
            processedMessage.content = processMessageContent(processedMessage.content, processedMessage.is_from_customer);
            
            // Verificar se a mensagem contém assinatura do agente (formato "*Nome disse:*")
            const hasAgentSignature = processedMessage.content && 
              processedMessage.content.match(/\*.*disse:\*\n/);
            
            // Se tem assinatura do agente, não adicionar ao frontend
            if (hasAgentSignature) {
              console.log('➖ Mensagem com assinatura do agente, ignorando:', processedMessage.content);
              return;
            }
            
            // Verificar se a mensagem já existe para evitar duplicatas ou atualizar se necessário
            setMessages(prev => {
              const messageIndex = prev.findIndex(msg => msg.id === processedMessage.id);
              if (messageIndex !== -1) {
                // Atualizar mensagem existente (pode ter additional_attributes atualizados)
                console.log('🔄 Atualizando mensagem existente:', processedMessage.id);
                const updatedMessages = [...prev];
                updatedMessages[messageIndex] = processedMessage;
                return updatedMessages;
              }
              console.log('➕ Adicionando nova mensagem:', processedMessage);
              return [...prev, processedMessage];
            });
          } else if (data.type === 'ai_message' && data.message) {
            console.log('➕ Adicionando mensagem da IA:', data.message);
            
            // Processar conteúdo da mensagem da IA (parsear JSON se necessário)
            let processedMessage = { ...data.message };
            processedMessage.content = processMessageContent(processedMessage.content, false);
            
            setMessages(prev => {
              const messageExists = prev.some(msg => msg.id === processedMessage.id);
              if (messageExists) {
                console.log('➖ Mensagem da IA já existe, ignorando:', processedMessage.id);
                return prev;
              }
              return [...prev, processedMessage];
            });
          } else if (data.type === 'contact_updated' && data.contact) {
            console.log(' Contato atualizado via WebSocket:', data.contact);
          } else if (data.type === 'message_updated' && data.message) {
            console.log('➕ Mensagem atualizada via WebSocket:', data.message);
            
            // Processar conteúdo da mensagem atualizada
            let processedMessage = { ...data.message };
            processedMessage.content = processMessageContent(processedMessage.content, processedMessage.is_from_customer);
            
            // Atualizar mensagem existente
            setMessages(prev => {
              const messageIndex = prev.findIndex(msg => msg.id === processedMessage.id);
              if (messageIndex !== -1) {
                const updatedMessages = [...prev];
                updatedMessages[messageIndex] = processedMessage;
                return updatedMessages;
              }
              return prev;
            });
          }
        } catch (e) {
          console.error(' Erro ao processar mensagem WebSocket:', e);
        }
      };
      
      ws.onerror = (error) => {
        console.error(' Erro no WebSocket:', error);
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket desconectado:', event.code, event.reason);
        
        // Clear heartbeat interval
        if (wsRef.current.heartbeatInterval) {
          clearInterval(wsRef.current.heartbeatInterval);
          wsRef.current.heartbeatInterval = null;
        }
        
        wsRef.current = null;
        
        // Reconectar automaticamente se não foi fechado intencionalmente
        if (event.code !== 1000) {
          const retryCount = (wsRef.current?.retryCount || 0) + 1;
          const maxRetries = 5;
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000); // Exponential backoff, max 10s
          
          if (retryCount <= maxRetries) {
            console.log(`🔄 Tentando reconectar WebSocket (tentativa ${retryCount}/${maxRetries}) em ${retryDelay}ms...`);
            setTimeout(() => {
              if (wsRef.current === null) { // Só reconectar se ainda não foi reconectado
                wsRef.current = { retryCount };
                connectWebSocket();
              }
            }, retryDelay);
          } else {
            console.error('❌ Máximo de tentativas de reconexão atingido');
          }
        }
      };
    };

    connectWebSocket();
    
    return () => {
      console.log('🔌 Fechando WebSocket');
      if (wsRef.current) {
        // Clear heartbeat interval
        if (wsRef.current.heartbeatInterval) {
          clearInterval(wsRef.current.heartbeatInterval);
        }
        wsRef.current.close(1000); // Close code 1000 = normal closure
        wsRef.current = null;
      }
    };
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !conversation) return;
    setError('');
    const token = localStorage.getItem('token');
    try {
      // Buscar informações do usuário atual para adicionar assinatura
      const userResponse = await axios.get('/api/auth/me/', {
        headers: { Authorization: `Token ${token}` }
      });
      
      const currentUser = userResponse.data;
      const userName = currentUser.first_name || currentUser.username || 'Usuário';
      
      // Formatar mensagem com nome do usuário para enviar ao WhatsApp
      const formattedMessage = `*${userName} disse:*\n${message}`;
      
      // Adicionar mensagem imediatamente no frontend (sem assinatura)
      const messageToShow = {
        id: Date.now(), // ID temporário
        content: message, // Mensagem original sem assinatura
        is_from_customer: false,
        created_at: new Date().toISOString(),
        // Adicionar informações de resposta se estiver respondendo
        additional_attributes: replyingToMessage ? {
          is_reply: true,
          reply_to_message_id: replyingToMessage.additional_attributes?.external_id || replyingToMessage.id,
          reply_to_content: replyingToMessage.content
        } : null
      };
      setMessages(prev => [...prev, messageToShow]);
      
      // Preparar payload para envio
      const payload = {
        conversation_id: conversation.id,
        content: formattedMessage
      };
      
      // Adicionar informações de resposta se estiver respondendo a uma mensagem
      if (replyingToMessage) {
        // Usar external_id se disponível, senão usar o ID interno
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
      await axios.post('/api/messages/send_text/', payload, {
        headers: { Authorization: `Token ${token}` }
      });
      
      setMessage('');
      setReplyingToMessage(null); // Limpar mensagem respondida após envio
    } catch (e) {
      setError('Erro ao enviar mensagem.');
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
      // Verificar se o navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia não é suportado neste navegador');
      }
      
      // Verificar se está usando HTTPS ou localhost
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
        
        // Parar todas as tracks do stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Iniciar contador de tempo
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
      
      // Parar todas as tracks do stream
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const sendAudioMessage = async () => {
    if (!audioBlob || !conversation) return;
    
    // Evitar múltiplos cliques
    if (sendingMedia) {
      console.log(' Já está enviando áudio, ignorando...');
      return;
    }
    
    try {
      console.log(' Iniciando envio de áudio PTT...');
      
      // Converter blob para File
      const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, {
        type: 'audio/webm'
      });
      
      console.log(' Dados do áudio:', {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type
      });
      
      // Validar tamanho do arquivo (máximo 16MB para WhatsApp)
      const maxSize = 16 * 1024 * 1024; // 16MB
      if (audioFile.size > maxSize) {
        setError('Áudio muito grande. Tamanho máximo: 16MB');
        return;
      }
      
      // Validar se o blob é válido
      if (audioBlob.size === 0) {
        setError('Áudio inválido. Tente gravar novamente.');
        return;
      }
      
      console.log(' Validações passaram, enviando áudio...');
      
      // Garantir que o media_type seja 'ptt' para áudio
      const finalMediaType = 'ptt';
      console.log(` Usando media_type: ${finalMediaType}`);
      
      // Verificação adicional
      if (finalMediaType !== 'ptt') {
        console.error(' ERRO: media_type não é PTT!');
        setError('Erro interno: tipo de mídia inválido');
        return;
      }
      
      // Enviar como mensagem de voz (PTT - Push to Talk) - SEM caption
      await handleSendMedia(audioFile, finalMediaType, null);
      
      console.log(' Áudio enviado com sucesso!');
      
      // Limpar estados
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      
    } catch (error) {
      console.error(' Erro ao enviar áudio:', error);
      setError('Erro ao enviar áudio: ' + error.message);
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Função para reproduzir áudio
  const playAudio = (messageId, audioUrl) => {
    console.log(' Reproduzindo áudio:', { messageId, audioUrl });
    
    // Parar áudio anterior se estiver tocando
    if (playingAudio && playingAudio !== messageId) {
      const prevAudio = audioRefs.current[playingAudio];
      if (prevAudio) {
        prevAudio.pause();
        prevAudio.currentTime = 0;
      }
    }
    
    // Criar ou usar áudio existente
    let audio = audioRefs.current[messageId];
    if (!audio) {
      audio = new Audio(audioUrl);
      audioRefs.current[messageId] = audio;
      
      // Configurar eventos do áudio
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
    
    // Reproduzir áudio
    audio.play().then(() => {
      setPlayingAudio(messageId);
    }).catch(e => {
      console.error('Erro ao reproduzir áudio:', e);
    });
  };
  
  // Função para pausar áudio
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
      // Limpar todos os áudios
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
      audioRefs.current = {};
    };
  }, [audioUrl]);

  // Função para enviar mídia
  const handleSendMedia = async (file, mediaType, caption = '') => {
    if (!conversation) return;
    
    // Evitar duplicação de envios
    if (sendingMedia) {
      console.log(' Já está enviando mídia, ignorando...');
      return;
    }
    
    setError('');
    setSendingMedia(true);
    const token = localStorage.getItem('token');
    
    console.log('�� Iniciando envio de mídia:', {
      fileName: file.name,
      fileSize: file.size,
      mediaType,
      caption,
      conversationId: conversation.id
    });
    
    // Validar tamanho do arquivo (máximo 16MB para WhatsApp)
    const maxSize = 16 * 1024 * 1024; // 16MB
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
      console.warn(' Tipo de arquivo não reconhecido:', file.type);
    }
    
    try {
      // Adicionar mensagem de "enviando..." imediatamente no frontend
      const sendingMessage = {
        id: `sending_${Date.now()}`, // ID temporário
                        content: mediaType === 'ptt' ? 'Mensagem de voz' : `Enviando ${file.name}...`,
        is_from_customer: false,
        created_at: new Date().toISOString(),
        media_type: mediaType,
        file_name: file.name,
        file: file, // Adicionar o arquivo para criar URL temporária
        file_url: mediaType === 'image' ? URL.createObjectURL(file) : null, // URL temporária para imagem
        is_sending: true // Marcar como mensagem de envio
      };
      console.log('📱 Adicionando mensagem de envio no frontend:', sendingMessage);
      setMessages(prev => [...prev, sendingMessage]);
      
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
      
      console.log(' Enviando mídia para o backend...');
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
      
      console.log(' Mídia enviada com sucesso:', response.data);
      
      // Remover mensagem de "enviando..." e adicionar a mensagem real
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => !msg.is_sending);
        return [...filteredMessages, response.data];
      });
      
    } catch (e) {
      console.error(' Erro ao enviar mídia:', e);
      console.error(' Detalhes do erro:', e.response?.data);
      setError('Erro ao enviar mídia: ' + (e.response?.data?.detail || e.message));
      
      // Remover mensagem de "enviando..." em caso de erro
      setMessages(prev => prev.filter(msg => !msg.is_sending));
    } finally {
      // Sempre resetar o estado de envio
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
    try {
      // Usar o mesmo endpoint do ConversasDashboard
      await axios.post(`/api/conversations/${conversation.id}/transfer/`, { 
        user_id: agentId 
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      console.log('Conversa transferida com sucesso!');
      alert('Transferido com sucesso!');
      setShowTransferDropdown(false);
      
      // Recarregar a página para atualizar a lista de conversas
      window.location.reload();
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      alert('Erro ao transferir atendimento.');
    }
  };

  const fetchProfilePicture = async () => {
    if (!conversation || !conversation.contact) return;
    
    setLoadingProfilePic(true);
    const token = localStorage.getItem('token');
    
    try {
      // Determinar o tipo de integração baseado no canal
      const integrationType = conversation.inbox?.channel_type === 'whatsapp_beta' ? 'uazapi' : 'evolution';
      const instanceName = conversation.inbox?.settings?.evolution_instance || 
                          conversation.inbox?.settings?.instance || 
                          conversation.inbox?.name?.replace('WhatsApp ', '');
      
      const response = await axios.post('/api/canais/get_whatsapp_profile_picture/', {
        phone: conversation.contact.phone,
        instance_name: instanceName,
        integration_type: integrationType
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      if (response.data.success) {
        alert('Foto do perfil atualizada com sucesso! Recarregue a página para ver a mudança.');
      } else {
        alert('Não foi possível obter a foto do perfil: ' + response.data.error);
      }
    } catch (error) {
      console.error('Erro ao buscar foto do perfil:', error);
      alert('Erro ao buscar foto do perfil. Verifique o console para mais detalhes.');
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
        
        console.log('🔄 Processando mensagem após reação...');
        
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

<<<<<<< HEAD
  // Função para lidar com seleção de emoji
  const handleEmojiSelect = (emoji) => {
    setMessage(prev => prev + emoji);
  };

=======
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
  // Função para apagar mensagem
  const deleteMessage = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 DEBUG: Tentando excluir mensagem:', messageId);
      console.log('🔍 DEBUG: Token:', token ? 'Presente' : 'Ausente');
      
      // Chamar endpoint do backend para deletar mensagem
      const response = await axios.post('/api/messages/delete_message/', {
        message_id: messageId
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      console.log('🔍 DEBUG: Resposta do servidor:', response.status, response.data);
      
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
      console.error('🔍 DEBUG: Erro completo:', error);
      console.error('🔍 DEBUG: Status:', error.response?.status);
      console.error('🔍 DEBUG: Data:', error.response?.data);
      console.error('🔍 DEBUG: URL:', error.config?.url);
      
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

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="Logo" style={{ width: 40, height: 40 }} className="object-contain mb-4" />
          <span className="text-muted-foreground text-base">
            Escolha uma conversa da lista para começar a atender
          </span>
        </div>
      </div>
    );
  }

  const uniqueMessages = Array.from(new Map(messages.map(msg => [msg.id, msg])).values());

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
                  <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center relative">
                {conversation.contact.avatar ? (
                  <img 
                    src={conversation.contact.avatar} 
                    alt={conversation.contact.name}
                    className="w-10 h-10 rounded-full"
                    onError={(e) => {
                      console.log('Erro ao carregar avatar:', conversation.contact.avatar);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            <div>
              <h3 className="font-medium text-card-foreground">
                {conversation.contact.name}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {getChannelIcon(conversation.inbox?.channel_type)}
                <span>{conversation.contact.phone || 'Contato'}</span>
              </div>
            </div>
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowResolverDropdown(!showResolverDropdown)}
              className="flex items-center space-x-2 px-3 py-2 text-muted-foreground hover:text-card-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <span>{conversation.assignee ? 'Encerrar' : 'Atribuir'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showResolverDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showResolverDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#23272f] border border-border rounded-lg shadow-lg z-50">
                <div className="py-1">
                  {!conversation.assignee ? (
                    // Opções para conversa não atribuída
                    <>
                      <button 
                        onClick={handleAssignToMe}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Atribuir para mim</span>
                      </button>
                      
                      <button 
                        onClick={handleTransferConversation}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>Transferir</span>
                      </button>
                    </>
                  ) : (
                    // Opções para conversa atribuída
                    <>
                      <button 
                        onClick={handleCloseConversation}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Encerrar</span>
                      </button>
                      
                      <button 
                        onClick={handleTransferConversation}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>Transferir</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            const file = files[0];
            console.log(' Arquivo arrastado:', file);
            
            // Determinar tipo de mídia
            const extension = file.name.split('.').pop().toLowerCase();
            let mediaType = 'document';
            
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
              mediaType = 'image';
            } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(extension)) {
              mediaType = 'video';
            } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)) {
              mediaType = 'audio';
            }
            
            // Enviar mídia automaticamente sem modal
            console.log('🚀 Enviando mídia arrastada automaticamente:', file.name);
            handleSendMedia(file, mediaType, '');
          }
        }}
      >
        {loading ? (
          <div className="text-center text-muted-foreground">Carregando mensagens...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : uniqueMessages.length === 0 ? (
          <div className="text-center text-muted-foreground">Nenhuma mensagem nesta conversa.</div>
        ) : (
          uniqueMessages.map((msg) => {
            console.log('Mensagem:', msg);
            // Processar o conteúdo da mensagem
            let content = msg.content;
            
            // Se o conteúdo for JSON, pegar só o campo 'text'
            try {
              if (typeof content === 'string' && content.startsWith('{')) {
                const parsed = JSON.parse(content);
                if (parsed && parsed.text) {
                  content = parsed.text;
                } else if (parsed && parsed.message) {
                  content = parsed.message;
                } else {
                  content = JSON.stringify(parsed);
                }
              }
            } catch (e) {
              // Se falhar ao parsear JSON, manter o conteúdo original
              console.log('Erro ao processar conteúdo JSON:', e);
            }
            
            // Remover assinatura do agente se presente
            if (content && content.match(/\*.*disse:\*\n/)) {
              content = content.replace(/\*.*disse:\*\n/, '');
            }
            const isCustomer = msg.is_from_customer;
            
<<<<<<< HEAD
            // Verificar se é uma mensagem de mídia (usar message_type ou media_type)
            const isMediaMessage = (msg.message_type && ['image', 'video', 'audio', 'document'].includes(msg.message_type)) || 
                                 (msg.media_type && ['image', 'video', 'audio', 'ptt', 'myaudio', 'document'].includes(msg.media_type));
=======
            // Verificar se é uma mensagem de mídia (apenas se tiver media_type específico)
            const isMediaMessage = msg.media_type && ['image', 'video', 'audio', 'ptt', 'myaudio', 'document'].includes(msg.media_type);
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
            
            // Debug: Log das mensagens para verificar estrutura
            if (msg.media_type === 'ptt') {
              console.log(' Mensagem PTT encontrada:', {
                id: msg.id,
                content: msg.content,
                media_type: msg.media_type,
                is_sending: msg.is_sending,
                file_url: msg.additional_attributes?.file_url || msg.file_url,
                additional_attributes: msg.additional_attributes
              });
            }
            
<<<<<<< HEAD
            // Debug: Log específico para mensagens de imagem
            if (msg.message_type === 'image' || msg.media_type === 'image') {
              console.log(' 🖼️ MENSAGEM DE IMAGEM DETECTADA:', {
                id: msg.id,
                message_type: msg.message_type,
                media_type: msg.media_type,
                content: msg.content,
                additional_attributes: msg.additional_attributes,
                file_url: msg.additional_attributes?.file_url || msg.file_url,
                isMediaMessage: isMediaMessage,
                shouldRenderImage: isMediaMessage && (msg.message_type === 'image' || msg.media_type === 'image')
              });
            }
            
=======
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4

            

            
            return (
          <div
            key={msg.id}
            className={`flex ${getMessageAlignment(msg, content)}`}
          >
            <div className={`message-bubble ${getMessageOrder(msg, content)}`}> 
              {/* Mostrar mensagem respondida se existir */}
              {msg.additional_attributes && msg.additional_attributes.reply_to_content && (
                <div className={`mb-2 p-2 rounded-lg text-xs ${
                  isCustomer 
                    ? 'bg-[#1a1d23] text-gray-300 border-l-3 border-blue-400' 
                    : 'bg-[#008a93] text-white border-l-3 border-white'
                }`}>
                  <div className="flex items-center gap-1 mb-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Respondendo a:</span>
                  </div>
                  <div className="text-gray-400 truncate">
                    {msg.additional_attributes.reply_to_content}
                  </div>
                </div>
              )}
              
              {/* Mostrar mensagem respondida se existir (formato alternativo) */}
              {msg.additional_attributes?.reply_to_message_id && msg.additional_attributes?.reply_to_content && !msg.additional_attributes?.is_reply && (
                <div className={`mb-2 p-2 rounded-lg text-xs ${
                  isCustomer 
                    ? 'bg-[#1a1d23] text-gray-300 border-l-3 border-blue-400' 
                    : 'bg-[#008a93] text-white border-l-3 border-white'
                }`}>
                  <div className="flex items-center gap-1 mb-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Respondendo a:</span>
                  </div>
                  <div className="text-gray-400 truncate">
                    {msg.additional_attributes.reply_to_content}
                  </div>
                </div>
              )}
              
              <div className={`px-4 py-2 rounded-lg shadow-md message-bubble-content ${
                msg.is_sending 
                  ? 'bg-gray-500 text-white animate-pulse' // Estilo para mensagem de envio
                  : isCustomer
                    ? 'bg-[#23272f] text-white' // Preto para mensagens do cliente
                    : 'bg-[#009ca6] text-white' // Azul para TODAS as mensagens do sistema (IA ou atendente)
              }`}>
                {/* Mostrar imagem se for uma mensagem de mídia com imagem */}
<<<<<<< HEAD
                {isMediaMessage && (msg.message_type === 'image' || msg.media_type === 'image') && (
                  <div className="mb-2">
                    {(() => {
                      const imageUrl = msg.additional_attributes?.file_url || msg.file_url || (msg.file ? URL.createObjectURL(msg.file) : null);
                      console.log('🖼️ Tentando renderizar imagem:', {
                        message_id: msg.id,
                        imageUrl: imageUrl,
                        additional_attributes: msg.additional_attributes,
                        file_url: msg.file_url
                      });
                      
                      if (!imageUrl) {
                        console.warn('❌ Nenhuma URL de imagem encontrada para mensagem:', msg.id);
                        return (
                          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center text-gray-500">
                            <span>Imagem não disponível</span>
                          </div>
                        );
                      }
                      
                      return (
                        <img 
                          src={imageUrl}
                          alt={msg.additional_attributes?.file_name || msg.file_name || 'Imagem'}
                          className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ maxHeight: '200px' }}
                          onClick={() => {
                            setSelectedImage(imageUrl);
                            setShowImageModal(true);
                          }}
                          onError={(e) => {
                            console.log('❌ Erro ao carregar imagem:', e);
                            e.target.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log('✅ Imagem carregada com sucesso:', imageUrl);
                          }}
                        />
                      );
                    })()}
=======
                {isMediaMessage && msg.media_type === 'image' && (
                  <div className="mb-2">
                    <img 
                      src={msg.additional_attributes?.file_url || msg.file_url || (msg.file ? URL.createObjectURL(msg.file) : null)} 
                      alt={msg.additional_attributes?.file_name || msg.file_name || 'Imagem'}
                      className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ maxHeight: '200px' }}
                      onClick={() => {
                        setSelectedImage(msg.additional_attributes?.file_url || msg.file_url);
                        setShowImageModal(true);
                      }}
                      onError={(e) => {
                        console.log('Erro ao carregar imagem:', e);
                        e.target.style.display = 'none';
                      }}
                    />
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
                  </div>
                )}
                
                {/* Mostrar vídeo se for uma mensagem de mídia com vídeo */}
<<<<<<< HEAD
                {isMediaMessage && (msg.message_type === 'video' || msg.media_type === 'video') && (
=======
                {isMediaMessage && msg.media_type === 'video' && (
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
                  <div className="mb-2">
                    <video 
                      src={msg.additional_attributes?.file_url || msg.file_url || (msg.file ? URL.createObjectURL(msg.file) : null)} 
                      controls
                      className="max-w-full h-auto rounded-lg"
                      style={{ maxHeight: '300px' }}
                      onError={(e) => {
                        console.log('Erro ao carregar vídeo:', e);
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
<<<<<<< HEAD
                {/* Player de áudio customizado para message_type audio ou media_type audio, ptt ou myaudio */}
                {(() => {
                  const isAudioType = (msg.message_type === 'audio') || 
                                    ['audio', 'ptt', 'myaudio'].includes(msg.media_type?.toLowerCase());
                  const hasFileUrl = msg.additional_attributes?.file_url || msg.file_url;
                  
                  // Log específico para mensagens de áudio
                  if (isAudioType || msg.message_type === 'audio' || msg.media_type === 'ptt' || msg.media_type === 'audio') {
                    console.log(' DEBUG: MENSAGEM DE ÁUDIO DETECTADA NO FRONTEND:', {
                      message_type: msg.message_type,
=======
                {/* Player de áudio customizado para media_type audio, ptt ou myaudio */}
                {(() => {
                  const isAudioType = ['audio', 'ptt', 'myaudio'].includes(msg.media_type?.toLowerCase());
                  const hasFileUrl = msg.additional_attributes?.file_url || msg.file_url;
                  
                  // Log específico para mensagens de áudio
                  if (isAudioType || msg.media_type === 'ptt' || msg.media_type === 'audio') {
                    console.log(' DEBUG: MENSAGEM DE ÁUDIO DETECTADA NO FRONTEND:', {
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
                      media_type: msg.media_type,
                      media_type_lower: msg.media_type?.toLowerCase(),
                      isAudioType: isAudioType,
                      hasFileUrl: hasFileUrl,
                      file_url: msg.additional_attributes?.file_url || msg.file_url,
<<<<<<< HEAD
=======
                      message_type: msg.message_type,
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
                      additional_attributes: msg.additional_attributes,
                      shouldRender: isAudioType && hasFileUrl,
                      isCustomer: isCustomer,
                      content: msg.content
                    });
                  }
                  
                  return isAudioType && hasFileUrl;
                })() && (
                  <div className="mb-2">
                    {console.log(' DEBUG: Renderizando player de áudio para:', {
                      media_type: msg.media_type,
                      file_url: msg.additional_attributes?.file_url || msg.file_url,
                      message_type: msg.message_type,
                      additional_attributes: msg.additional_attributes,
                      isCustomer: isCustomer
                    })}
                    <CustomAudioPlayer 
                      src={msg.additional_attributes?.file_url || msg.file_url}
                      isCustomer={isCustomer}
                    />
                  </div>
                )}
                
<<<<<<< HEAD
                {/* Mostrar conteúdo da mensagem se houver conteúdo E não for uma mensagem de mídia */}
                {content && !isMediaMessage && (
                  <span className="whitespace-pre-wrap break-words">{content}</span>
                )}
                
                {/* Para mensagens de mídia, mostrar apenas o caption se houver */}
                {isMediaMessage && content && content !== msg.additional_attributes?.file_name && (
                  <div className="mt-2 text-sm opacity-80">
                    <span className="whitespace-pre-wrap break-words">{content}</span>
                  </div>
                )}
=======
                {/* Mostrar conteúdo da mensagem se houver conteúdo */}
                {content && (
                  <span className="whitespace-pre-wrap break-words">{content}</span>
                )}
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
              </div>
              <div className={`flex items-center mt-1 space-x-1 text-xs text-muted-foreground ${
                isCustomer ? 'justify-start' : 'justify-end'
              }`}>
                <span>{msg.created_at && new Date(msg.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                
                {/* Botões de ação para mensagens */}
                {!msg.is_sending && (
                  <div className="flex items-center space-x-1 ml-2">
                    {/* Botão de resposta - para todas as mensagens */}
                    <button
                      onClick={() => handleReplyToMessage(msg)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="Responder"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Botão de reação - apenas em mensagens recebidas */}
                    {msg.message_type === 'incoming' && (
                      <button
                        onClick={() => openReactionPicker(msg)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="Reagir"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                    
                    {/* Botão de exclusão - apenas para mensagens enviadas pelo sistema */}
                    {!isCustomer && (
                      <button
                        onClick={() => confirmDelete(msg)}
                        className="p-1 hover:bg-muted rounded transition-colors text-red-400 hover:text-red-300"
                        title="Apagar mensagem"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
                
                {/* Exibir reação atual se existir */}
                {msg.additional_attributes?.reaction?.emoji && (
                  <span className="ml-1 text-sm">{msg.additional_attributes.reaction.emoji}</span>
                )}
                
                {/* Indicar se a mensagem foi deletada - apenas para mensagens do cliente */}
                {msg.additional_attributes?.status === 'deleted' && msg.is_from_customer && (
                  <div className="mt-1 text-xs text-muted-foreground italic">
                    <span className="line-through">{msg.content}</span>
                    <br />
                    <div className="flex items-center gap-1 text-red-500">
                      <img src="/apagada.png" alt="Mensagem apagada" className="w-4 h-4" />
                      <span>Esta mensagem foi deletada</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
            );
          })
            )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        {/* Mostrar mensagem respondida se existir */}
        {replyingToMessage && (
          <div className="mb-3 p-2 bg-[#1a1d23] rounded-lg border-l-4 border-blue-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-blue-400">Respondendo a:</span>
              </div>
              <button
                onClick={cancelReply}
                className="text-gray-400 hover:text-white transition-colors"
                title="Cancelar resposta"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-1 text-sm text-gray-300 truncate">
              {replyingToMessage.content}
            </div>
          </div>
        )}
        
        <div className="flex items-end space-x-2">
          <input
            type="file"
            id="file-input"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.mp4,.avi,.mov,.wmv,.flv,.mkv,.webm,.mp3,.wav,.ogg,.m4a,.aac,.flac"
            multiple={false}
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                console.log(' Arquivo selecionado:', file);
                console.log(' Nome do arquivo:', file.name);
                console.log(' Tipo do arquivo:', file.type);
                console.log(' Tamanho do arquivo:', file.size);
                
                // Determinar o tipo de mídia baseado na extensão
                const extension = file.name.split('.').pop().toLowerCase();
                let mediaType = 'document';
                
                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
                  mediaType = 'image';
                } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(extension)) {
                  mediaType = 'video';
                } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)) {
                  mediaType = 'audio';
                }
                
                console.log(' Tipo de mídia detectado:', mediaType);
                
                // Enviar mídia automaticamente sem modal
                console.log('🚀 Enviando mídia automaticamente:', file.name);
                handleSendMedia(file, mediaType, '');
              } else {
                console.log(' Nenhum arquivo selecionado');
              }
              e.target.value = ''; // Limpar o input
            }}
            onClick={(e) => {
              console.log('🖱️ Input de arquivo clicado');
            }}
          />
          <button 
            onClick={() => {
              console.log(' Botão clipe clicado');
              const fileInput = document.getElementById('file-input');
              if (fileInput) {
                console.log(' Abrindo seletor de arquivo...');
                fileInput.click();
              } else {
                console.error(' Input de arquivo não encontrado');
              }
            }}
            className="p-2 text-muted-foreground hover:text-card-foreground transition-colors"
            title="Anexar arquivo"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          
          <div className="flex-1 relative">
            {!isRecording && !audioBlob ? (
              <>
            <textarea
              id="message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onPaste={(e) => {
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    console.log('📋 Imagem colada:', file);
                    
                    // Determinar tipo de mídia
                    let mediaType = 'image';
                    if (file.type.includes('video')) {
                      mediaType = 'video';
                    } else if (file.type.includes('audio')) {
                      mediaType = 'audio';
                    }
                    
                    // Enviar mídia automaticamente sem modal
                    console.log('🚀 Enviando mídia colada automaticamente:', file.name);
                    handleSendMedia(file, mediaType, '');
                    e.preventDefault();
                    return;
                  }
                }
              }}
              placeholder="Digite sua mensagem..."
              className="niochat-input min-h-[40px] max-h-32 resize-none pr-10"
              rows={1}
            />
<<<<<<< HEAD
            <button 
              onClick={() => setShowEmojiPicker(true)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-card-foreground"
            >
=======
            <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-card-foreground">
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
              <Smile className="w-4 h-4" />
            </button>
              </>
            ) : isRecording ? (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-red-700">
                    Gravando... {formatRecordingTime(recordingTime)}
                  </span>
          </div>
                <button
                  onClick={stopRecording}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                  title="Parar gravação"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            ) : audioBlob ? (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
                <div className="flex items-center space-x-3 flex-1">
                  {/* Player de áudio para prévia */}
                  <button
                    onClick={() => {
                      if (audioUrl) {
                        const audio = new Audio(audioUrl);
                        audio.play().catch(e => console.error('Erro ao reproduzir prévia:', e));
                      }
                    }}
                    className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                    title="Reproduzir prévia"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.5 13.5H2a1 1 0 01-1-1v-5a1 1 0 011-1h2.5l3.883-3.793a1 1 0 011.617.793z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-blue-700">
                        Áudio gravado ({formatRecordingTime(recordingTime)})
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-1 mt-1">
                      <div className="bg-blue-500 h-1 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
          <button
                    onClick={cancelRecording}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cancelar gravação"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={sendAudioMessage}
                    disabled={sendingMedia}
                    className={`p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${sendingMedia ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Enviar áudio"
                  >
                    {sendingMedia ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          
          {!isRecording && !audioBlob ? (
            <button
              onClick={message.trim() ? handleSendMessage : startRecording}
              disabled={sendingMedia}
            className={`p-2 rounded-lg transition-colors ${
              message.trim()
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              } ${sendingMedia ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={message.trim() ? "Enviar mensagem" : "Gravar áudio"}
          >
              {sendingMedia ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : message.trim() ? (
            <Send className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
          </button>
          ) : null}
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>
            {!isRecording && !audioBlob 
              ? "Pressione Enter para enviar, Shift + Enter para nova linha, ou clique no microfone para gravar áudio"
              : isRecording 
              ? "Gravando áudio... Clique no quadrado para parar"
              : "Áudio gravado. Clique no play para ouvir, no ícone de envio para enviar ou no X para cancelar"
            }
          </span>
          <span>Online</span>
        </div>
      </div>

      {/* Modal de Transferência */}
      <Dialog open={showTransferDropdown} onOpenChange={setShowTransferDropdown}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>
              Transferir Atendimento <span className="font-bold">{conversation?.contact?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="divide-y">
            {loadingAgents ? (
              <div className="text-muted-foreground text-center py-8">Carregando usuários...</div>
            ) : agents.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">Nenhum usuário encontrado.</div>
            ) : (
              agents.map((agent) => {
                // Usar status em tempo real se disponível, senão usar o status do backend
                const isOnline = agentsStatus[agent.id] !== undefined 
                  ? agentsStatus[agent.id] 
                  : agent.is_online;
                
                // Mostrar nome completo ou username se não tiver nome
                const displayName = agent.first_name && agent.last_name 
                  ? `${agent.first_name} ${agent.last_name}`
                  : agent.first_name 
                  ? agent.first_name
                  : agent.username || agent.email;
                
                return (
                  <button
                    key={agent.id}
                    className="flex items-center w-full gap-4 py-3 px-2 hover:bg-muted transition"
                    onClick={() => handleTransferToAgent(agent.id)}
                  >
                    <img
                      src={agent.avatar || '/avatar-em-branco.png'}
                      alt={displayName}
                      className="w-12 h-12 rounded-full object-cover bg-muted"
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-card-foreground">{displayName}</div>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                        isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização de Imagem */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className="bg-transparent data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border-0 p-0 shadow-lg duration-200"
          >
            <div className="relative">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="Imagem em tamanho completo"
                  className="w-full h-auto max-h-[80vh] object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Modal de Seletor de Reação */}
      <Dialog open={showReactionPicker} onOpenChange={setShowReactionPicker}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle>Reagir à mensagem</DialogTitle>
          </DialogHeader>
<<<<<<< HEAD
          <div className="grid grid-cols-8 gap-2 p-4">
            {[
              '👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🙏', 
              '🔥', '💯', '✨', '🎉', '😍', '🥰', '😘', '😊',
              '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟',
              '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺',
              '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳',
              '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
              '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😯',
              '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪'
            ].map((emoji) => (
=======
          <div className="grid grid-cols-6 gap-2 p-4">
            {['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🙏', '🔥', '💯', '✨', '🎉'].map((emoji) => (
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
              <button
                key={emoji}
                onClick={() => sendReaction(selectedMessageForReaction?.id, emoji)}
                className="text-2xl p-2 hover:bg-muted rounded-lg transition-colors"
<<<<<<< HEAD
                title={emoji}
=======
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => sendReaction(selectedMessageForReaction?.id, '')}
              className="text-sm p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
            >
              Remover
            </button>
          </div>
        </DialogContent>
      </Dialog>

<<<<<<< HEAD
      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
      />

=======
>>>>>>> 8c56b62450b45f82237bce9672b2c4bcd20a31e4
      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-muted-foreground mb-4">
              Tem certeza que deseja apagar esta mensagem? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-card-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMessage(messageToDelete?.id)}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Apagar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ChatArea;

