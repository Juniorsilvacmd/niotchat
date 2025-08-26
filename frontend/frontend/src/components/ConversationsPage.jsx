import React, { useState, useRef, useEffect } from 'react';
import ConversationList from './ConversationList';
import ChatArea from './ChatArea';

const ConversationsPage = ({ selectedConversation, setSelectedConversation, provedorId }) => {
  const refreshConversationsRef = useRef(null);
  
  // Recuperar conversa selecionada do localStorage se não houver uma selecionada
  useEffect(() => {
    if (!selectedConversation) {
      const savedConversation = localStorage.getItem('selectedConversation');
      if (savedConversation) {
        try {
          const parsed = JSON.parse(savedConversation);
          setSelectedConversation(parsed);
        } catch (e) {
          console.error('Erro ao recuperar conversa do localStorage:', e);
        }
      }
    }
  }, [selectedConversation, setSelectedConversation]);

  const handleConversationClose = () => {
    setSelectedConversation(null);
    localStorage.removeItem('selectedConversation');
    // Recarregar lista de conversas
    if (refreshConversationsRef.current) {
      refreshConversationsRef.current();
    }
  };

  const handleConversationUpdate = (refreshFunction) => {
    // Se recebeu uma função de refresh, armazena a referência
    if (typeof refreshFunction === 'function') {
      refreshConversationsRef.current = refreshFunction;
      return;
    }
    
    // Se recebeu dados de conversa atualizada, atualiza a conversa selecionada
    if (refreshFunction && typeof refreshFunction === 'object') {
      setSelectedConversation(refreshFunction);
      // Salvar no localStorage
      localStorage.setItem('selectedConversation', JSON.stringify(refreshFunction));
    }
    
    // Forçar atualização da lista de conversas
    if (refreshConversationsRef.current) {
      refreshConversationsRef.current();
    }
  };

  return (
    <div className="flex h-full">
      <ConversationList
        onConversationSelect={(conversation) => {
          setSelectedConversation(conversation);
          // Salvar no localStorage
          localStorage.setItem('selectedConversation', JSON.stringify(conversation));
        }}
        selectedConversation={selectedConversation}
        provedorId={provedorId}
        onConversationUpdate={handleConversationUpdate}
      />
      {selectedConversation ? (
        <ChatArea
          conversation={selectedConversation}
          onConversationClose={handleConversationClose}
          onConversationUpdate={handleConversationUpdate}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Nenhuma conversa selecionada</h3>
            <p className="text-sm">Selecione uma conversa da lista para começar</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsPage;
