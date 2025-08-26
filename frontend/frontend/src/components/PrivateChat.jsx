import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Plus,
  ArrowLeft,
  User
} from 'lucide-react';
import axios from 'axios';

const PrivateChat = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);
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
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const API_BASE = '/api';

  // ===== EFEITOS =====
  
  useEffect(() => {
    if (userId) {
      loadUserInfo();
      loadMessages();
      connectWebSocket();
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [userId]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
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
  
  const loadUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/internal-chat/rooms/users/`, {
        headers: { Authorization: `Token ${token}` }
      });
      
      const user = response.data.users.find(u => u.id.toString() === userId);
      if (user) {
        setSelectedUser(user);
      }
    } catch (error) {
      console.error('Erro ao carregar informações do usuário:', error);
    }
  };
  
  const loadMessages = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // TODO: Implementar API para buscar mensagens privadas
      // Por enquanto, vamos usar mensagens vazias
      setMessages([]);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      const token = localStorage.getItem('token');
      const wsUrl = `ws://${window.location.hostname}:8010/ws/private-chat/?token=${token}`;
      
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('WebSocket chat privado conectado');
        setWs(websocket);
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'private_message') {
            setMessages(prev => [...prev, data.message]);
          } else if (data.type === 'typing') {
            setOtherUserTyping(data.is_typing);
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };
      
      websocket.onclose = () => {
        console.log('WebSocket chat privado desconectado');
        setWs(null);
      };
      
      websocket.onerror = (error) => {
        console.error('Erro WebSocket chat privado:', error);
        setWs(null);
      };
    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // TODO: Implementar API para enviar mensagem privada
      const messageData = {
        id: Date.now(),
        text: newMessage,
        sender: 'current_user',
        receiver: selectedUser.id,
        created_at: new Date().toISOString(),
        is_private: true
      };
      
      setMessages(prev => [...prev, messageData]);
      setNewMessage('');
      
      // Enviar via WebSocket se estiver conectado
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'private_message',
          message: messageData
        }));
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserName = (user) => {
    return user?.name || user?.username || 'Usuário';
  };

  const getUserAvatar = (user) => {
    return user?.avatar || null;
  };

  const getUserInitials = (user) => {
    const name = getUserName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!selectedUser) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando usuário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={getUserAvatar(selectedUser)} alt={getUserName(selectedUser)} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getUserInitials(selectedUser)}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h2 className="font-semibold text-lg">{getUserName(selectedUser)}</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${selectedUser.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm text-muted-foreground">
                {selectedUser.is_online ? 'Online' : 'Offline'}
              </span>
              <Badge variant="secondary" className="text-xs">
                {selectedUser.user_type === 'admin' ? 'Admin' : 'Agente'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando mensagens...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
              <p className="text-sm text-muted-foreground">Inicie uma conversa com {getUserName(selectedUser)}</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'current_user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'current_user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'current_user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {otherUserTyping && (
            <div className="flex justify-start">
              <div className="bg-muted px-4 py-2 rounded-lg">
                <p className="text-sm text-muted-foreground">Digitando...</p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Mensagem para ${getUserName(selectedUser)}...`}
                className="min-h-[60px] max-h-[120px] resize-none"
                rows={1}
              />
            </div>
            
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateChat; 