import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  X,
  Send, 
  Paperclip, 
  Image, 
  Video, 
  Mic, 
  Smile,
  Reply,
  Download,
  Phone,
  VideoIcon,
  MoreVertical,
  Plus
} from 'lucide-react';
import axios from 'axios';
import { useNotifications } from '../contexts/NotificationContext';

const PrivateChatSidebar = ({ 
  isOpen, 
  onClose, 
  selectedUser, 
  currentUser 
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ws, setWs] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  
  // Hook para notificações
  const { markAsRead } = useNotifications();
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Usar URL relativa (será resolvida pelo proxy do Vite)
const API_BASE = '/api';
  // Usar URL relativa para WebSocket (será resolvida pelo proxy do Vite)
const WS_BASE = `ws://${window.location.host}`;

  // ===== EFEITOS =====
  
  useEffect(() => {
    if (isOpen && selectedUser) {
      loadMessages();
      connectWebSocket();
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isOpen, selectedUser]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Fechar menus ao clicar fora (corrigido para não interferir nos cliques)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Verificar se o clique foi fora dos menus
      const isFileMenuClick = event.target.closest('[data-file-menu]');
      const isEmojiMenuClick = event.target.closest('[data-emoji-menu]');
      
      if (!isFileMenuClick && showFileMenu) {
        setShowFileMenu(false);
      }
      
      if (!isEmojiMenuClick && showEmojiPicker) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFileMenu, showEmojiPicker]);

  // ===== FUNÇÕES DE API =====
  
  const loadMessages = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Buscar TODAS as mensagens privadas entre os dois usuários
      // Implementar paginação automática para carregar todas as mensagens
      let allMessages = [];
      let page = 1;
      let hasMore = true;
      const maxPages = 10; // Proteção contra loops infinitos
      
      while (hasMore && page <= maxPages) {
        try {
          const response = await axios.get(`${API_BASE}/private-messages/`, {
        headers: { Authorization: `Token ${token}` },
        params: { 
              other_user_id: selectedUser.id,
              page: page
            }
          });
          
          const messagesData = response.data.results || [];
          allMessages = [...allMessages, ...messagesData];
          
          // Verificar se há mais páginas
          const totalCount = response.data.count || 0;
          const currentTotal = allMessages.length;
          
          // Parar se já carregamos todas as mensagens ou se a página está vazia
          hasMore = currentTotal < totalCount && messagesData.length > 0;
          
          console.log(`[DEBUG] Página ${page}: ${messagesData.length} mensagens, Total: ${currentTotal}/${totalCount}, HasMore: ${hasMore}`);
          
          // Parar se não há mais mensagens
          if (messagesData.length === 0) {
            hasMore = false;
          }
          
          page++;
        } catch (error) {
          console.error(`[DEBUG] Erro na página ${page}:`, error);
          hasMore = false;
          break;
        }
      }
      
      // Ordenar mensagens por data de criação (mais antigas primeiro)
      allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      setMessages(allMessages);
      
      // Marcar mensagens como lidas quando abrir o chat
      if (selectedUser && allMessages.length > 0) {
        markAsRead(null, selectedUser.id);
      }
      
      console.log(`[DEBUG] Carregadas ${allMessages.length} mensagens para o chat com ${selectedUser.username}`);
      console.log(`[DEBUG] Primeira mensagem:`, allMessages[0]);
      console.log(`[DEBUG] Última mensagem:`, allMessages[allMessages.length - 1]);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };
  
  // ===== WEBSOCKET =====
  
  const connectWebSocket = () => {
    const token = localStorage.getItem('token');
    const wsUrl = `${WS_BASE}/ws/private-chat/?token=${token}`;
    
    
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      
      setWs(websocket);
      
      // Marcar todas as mensagens como lidas quando conectar
      if (selectedUser) {

        websocket.send(JSON.stringify({
          type: 'join_conversation',
          other_user_id: selectedUser.id
        }));
      }
    };
    
    websocket.onmessage = (event) => {
      
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    websocket.onclose = () => {
      
      setWs(null);
    };
    
    websocket.onerror = (error) => {
      console.error('[DEBUG WebSocket] Erro no WebSocket:', error);
    };
  };
  
  const handleWebSocketMessage = (data) => {
    console.log('[DEBUG] WebSocket message received:', data);
    
    switch (data.type) {
      case 'new_private_message':
        console.log('[DEBUG] Nova mensagem privada recebida:', data.message);
        // Adicionar nova mensagem ao chat
        setMessages(prev => {
          console.log('[DEBUG] Estado anterior das mensagens:', prev.length);
          const newState = [...prev, data.message];
          console.log('[DEBUG] Novo estado das mensagens:', newState.length);
          return newState;
        });
        
        // Marcar como lida se o chat estiver aberto
        if (isOpen && selectedUser && data.message.sender?.id === selectedUser.id) {
          markAsRead(null, selectedUser.id);
        }
        
        // Enviar notificação se o chat não estiver aberto
        if (!isOpen || !selectedUser || data.message.sender?.id !== selectedUser.id) {
          // Notificação do navegador
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nova Mensagem no Chat Interno', {
              body: `${data.message.sender?.username || 'Usuario'}: ${data.message.content}`,
              icon: '/favicon.ico',
              tag: 'chat-interno'
            });
          }
          
          // Som de notificação
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.play().catch(() => {});
          } catch (audioError) {
            console.log('Som nao disponivel');
          }
        }
        break;
        
      case 'typing_notification':
        setOtherUserTyping(data.is_typing);
        break;
        
      case 'message_read':
        setMessages(prev => prev.map(msg => 
          msg.id === data.message_id 
            ? { ...msg, is_read: true }
            : msg
        ));
        break;
    }
  };
  
  // ===== ENVIO DE MENSAGENS =====
  
  const sendMessage = async () => {
    if (!newMessage.trim() && !replyingTo) return;
    if (!selectedUser || !ws) return;
    
    try {
      const token = localStorage.getItem('token');
      const messageData = {
        content: newMessage.trim(),
        recipient_id: selectedUser.id,
        message_type: 'text'
      };
      
      if (replyingTo) {
        messageData.reply_to_id = replyingTo.id;
      }
      
      const response = await axios.post(`${API_BASE}/private-messages/`, messageData, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // Adicionar mensagem localmente para exibição imediata
      if (response.data) {
        const newMessageObj = {
          id: response.data.id || Date.now(), // Usar ID da API ou timestamp como fallback
          content: messageData.content,
          sender: { id: currentUser?.id, username: currentUser?.username, name: currentUser?.username },
          recipient: { id: selectedUser.id, username: selectedUser.username, name: selectedUser.username },
          message_type: messageData.message_type,
          created_at: new Date().toISOString(),
          is_read: false
        };
        
        setMessages(prev => [...prev, newMessageObj]);
      }
      
      setNewMessage('');
      setReplyingTo(null);
      stopTyping();
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };
  
  const sendFileMessage = async (file, messageType) => {
    if (!selectedUser || !ws) return;
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('recipient_id', selectedUser.id);
      formData.append('message_type', messageType);
      
      const response = await axios.post(`${API_BASE}/private-messages/`, formData, {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Adicionar mensagem localmente para exibição imediata
      if (response.data) {

        const newMessageObj = {
          id: response.data.id || Date.now(),
          content: null,
          sender: { id: currentUser?.id, username: currentUser?.username, name: currentUser?.username },
          recipient: { id: selectedUser.id, username: selectedUser.username, name: selectedUser.username },
          message_type: messageType,
          file_url: response.data.file_url,
          file_name: response.data.file_name,
          file_size: response.data.file_size,
          created_at: new Date().toISOString(),
          is_read: false
        };
        

        setMessages(prev => [...prev, newMessageObj]);
      }
      
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
    }
  };
  
  const handleFileUpload = (event, messageType) => {
    const file = event.target.files[0];
    if (!file) return;
    
    sendFileMessage(file, messageType);
    event.target.value = '';
  };
  
  // ===== DIGITAÇÃO =====
  
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && selectedUser) {
      setIsTyping(true);
      ws?.send(JSON.stringify({ 
        type: 'typing_start',
        recipient_id: selectedUser.id
      }));
    }
    
    // Reset timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);
  };
  
  const stopTyping = () => {
    if (isTyping && selectedUser) {
      setIsTyping(false);
      ws?.send(JSON.stringify({ 
        type: 'typing_stop',
        recipient_id: selectedUser.id
      }));
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };
  
  // ===== UTILITÁRIOS =====
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getUserName = (user) => {
    return `${user.first_name} ${user.last_name}`.trim() || user.username;
  };
  
  const getUserInitials = (user) => {
    const name = getUserName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Função helper para construir URLs completas de arquivos
  const getFullFileUrl = (fileUrl) => {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http')) return fileUrl;
    return `http://192.168.100.55:8010${fileUrl}`;
  };
  
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🔥', '💯'];
  
  // ===== GRAVAÇÃO DE ÁUDIO =====
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];
      
      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'audio-message.wav', { type: 'audio/wav' });
        sendFileMessage(audioFile, 'audio');
        
        // Parar todas as tracks do stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Para fins de demonstração, parar após 10 segundos ou ao clicar novamente
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 10000);
      
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={selectedUser?.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {selectedUser ? getUserInitials(selectedUser) : '??'}
            </AvatarFallback>
          </Avatar>
          
                      <div>
              <h3 className="font-medium text-foreground">
                {selectedUser ? getUserName(selectedUser) : 'Chat Privado'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isRecording ? (
                  <span className="text-red-500 animate-pulse">🔴 Gravando áudio...</span>
                ) : otherUserTyping ? (
                  'Digitando...'
                ) : (
                  'Online'
                )}
              </p>
            </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Phone className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <VideoIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 bg-background">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {(Array.isArray(messages) ? messages : []).map(message => (
              <div key={message.id} className={`flex ${
                message.sender.id === currentUser?.id ? 'justify-end' : 'justify-start'
              }`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender.id === currentUser?.id
                    ? 'bg-primary text-primary-foreground ml-4'
                    : 'bg-muted text-foreground mr-4'
                }`}>
                  {/* Resposta */}
                  {message.reply_to && (
                    <div className="text-xs opacity-75 border-l-2 border-current pl-2 mb-2">
                      <div className="font-medium">{getUserName(message.reply_to.sender)}</div>
                      <div>{message.reply_to.content}</div>
                    </div>
                  )}
                  
                  {/* Conteúdo */}
          
                  
                  {/* Mensagem de texto */}
                  {message.message_type === 'text' && message.content && (
                    <p className="text-sm">{message.content}</p>
                  )}
                  
                  {/* Mensagem de imagem */}
                        {message.message_type === 'image' && (
        <div className="space-y-2">
          <img
            src={getFullFileUrl(message.file_url)}
            alt={message.file_name || 'Imagem'}
            className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(getFullFileUrl(message.file_url), '_blank')}
            onError={(e) => {
              console.error('Erro ao carregar imagem:', e.target.src);
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
                  
                  {/* Mensagem de vídeo */}
                  {message.message_type === 'video' && (
                    <div className="space-y-2">
                      <video 
                        controls 
                        className="max-w-full h-auto rounded-lg"
                        src={getFullFileUrl(message.file_url)}
                      >
                        Seu navegador não suporta vídeos.
                      </video>
                    </div>
                  )}
                  
                  {/* Mensagem de áudio */}
                  {message.message_type === 'audio' && (
                    <div className="space-y-2">
                      <audio 
                        controls 
                        className="w-full"
                        src={getFullFileUrl(message.file_url)}
                      >
                        Seu navegador não suporta áudio.
                      </audio>
                    </div>
                  )}
                  
                  {/* Outros tipos de arquivo */}
                  {message.message_type !== 'text' && message.message_type !== 'image' && message.message_type !== 'video' && message.message_type !== 'audio' && (
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      <a 
                        href={getFullFileUrl(message.file_url)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline cursor-pointer"
                      >
                        {message.file_name || 'Arquivo'}
                      </a>
                    </div>
                  )}
                  
                  {/* Sempre mostrar o nome do arquivo se existir */}
                  {message.file_name && (
                    <div className="mt-1">
                      <p className="text-xs text-muted-foreground">
                        📎 {message.file_name} ({message.message_type})
                      </p>
                    </div>
                  )}
                  
                  {/* Debug: mostrar informações da mensagem */}

                  
                  {/* Timestamp */}
                  <div className="text-xs opacity-75 mt-1">
                    {formatTime(message.created_at)}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Indicador de digitação */}
            {otherUserTyping && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground max-w-xs px-4 py-2 rounded-lg mr-4">
                  <div className="flex items-center gap-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Resposta ativa */}
      {replyingTo && (
        <div className="px-4 py-2 bg-muted border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">
                Respondendo a <strong>{getUserName(replyingTo.sender)}</strong>
              </span>
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setReplyingTo(null)}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground ml-6 truncate">
            {replyingTo.content}
          </p>
        </div>
      )}
      
      {/* Área de Input */}
      <div className="p-4 border-t border-border bg-card">
        {/* Removido - botões de arquivo agora no botão "+" */}
        
        {/* Campo de Mensagem */}
        <div className="flex items-end gap-2">
          {/* Botão "+" para Arquivos */}
          <div className="relative" data-file-menu>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Plus button clicked');
                setShowFileMenu(!showFileMenu);
              }}
              className="h-10 w-10 p-0 rounded-full"
            >
              <Plus className="w-5 h-5" />
            </Button>
            
            {/* Menu de Arquivos */}
            {showFileMenu && (
              <div className="absolute bottom-12 left-0 bg-card border border-border rounded-lg shadow-lg p-2 z-10" data-file-menu>
                <div className="flex flex-col gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      imageInputRef.current?.click();
                      setShowFileMenu(false);
                    }}
                    className="justify-start gap-2 h-8"
                  >
                    <Image className="w-4 h-4" />
                    Foto
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      videoInputRef.current?.click();
                      setShowFileMenu(false);
                    }}
                    className="justify-start gap-2 h-8"
                  >
                    <Video className="w-4 h-4" />
                    Vídeo
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      audioInputRef.current?.click();
                      setShowFileMenu(false);
                    }}
                    className="justify-start gap-2 h-8"
                  >
                    <Mic className="w-4 h-4" />
                    Áudio
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowFileMenu(false);
                    }}
                    className="justify-start gap-2 h-8"
                  >
                    <Paperclip className="w-4 h-4" />
                    Arquivo
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Campo de Texto */}
          <div className="flex-1">
            <Textarea
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Digite uma mensagem"
              className="min-h-0 resize-none rounded-full px-4 py-2"
              rows={1}
            />
          </div>
          
          {/* Botão Emoji */}
          <Button 
            size="sm" 
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Emoji button clicked');
              setShowEmojiPicker(!showEmojiPicker);
            }}
            className="h-10 w-10 p-0 rounded-full"
            data-emoji-menu
          >
            <Smile className="w-5 h-5" />
          </Button>
          
          {/* Botão Principal: Mic ou Send */}
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Main button clicked', { hasMessage: !!newMessage.trim(), isRecording });
              if (newMessage.trim()) {
                sendMessage();
              } else {
                startRecording();
              }
            }}
            size="sm"
            className={`h-10 w-10 p-0 rounded-full transition-colors ${
              newMessage.trim() 
                ? 'bg-primary hover:bg-primary/90' 
                : isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-primary hover:bg-primary/90'
            }`}
            disabled={isRecording}
          >
            {newMessage.trim() ? (
              <Send className="w-5 h-5" />
            ) : (
              <Mic className={`w-5 h-5 ${isRecording ? 'text-white' : ''}`} />
            )}
          </Button>
        </div>
        
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="mt-2 p-2 bg-background border border-border rounded-lg" data-emoji-menu>
            <div className="grid grid-cols-5 gap-1">
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    setNewMessage(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-2 hover:bg-muted rounded text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Inputs ocultos */}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(e) => handleFileUpload(e, 'file')}
          accept=".pdf,.doc,.docx,.txt,.zip,.rar"
        />
        
        <input
          ref={imageInputRef}
          type="file"
          hidden
          onChange={(e) => handleFileUpload(e, 'image')}
          accept="image/*"
        />
        
        <input
          ref={videoInputRef}
          type="file"
          hidden
          onChange={(e) => handleFileUpload(e, 'video')}
          accept="video/*"
        />
        
        <input
          ref={audioInputRef}
          type="file"
          hidden
          onChange={(e) => handleFileUpload(e, 'audio')}
          accept="audio/*"
        />
      </div>
    </div>
  );
};

export default PrivateChatSidebar;