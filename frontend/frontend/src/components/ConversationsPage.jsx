import React, { useState, useRef } from 'react';
import ConversationList from './ConversationList';
import ChatArea from './ChatArea';

const ConversationsPage = ({ selectedConversation, setSelectedConversation, provedorId }) => {
  const [refreshConversations, setRefreshConversations] = useState(null);
  const refreshConversationsRef = useRef(null);

  const handleConversationClose = () => {
    setSelectedConversation(null);
    // Recarregar lista de conversas
    if (refreshConversationsRef.current) {
      refreshConversationsRef.current();
    }
  };

  const handleConversationUpdate = (refreshFunction) => {
    refreshConversationsRef.current = refreshFunction;
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <ConversationList
        onConversationSelect={setSelectedConversation}
        selectedConversation={selectedConversation}
        provedorId={provedorId}
        onConversationUpdate={handleConversationUpdate}
      />
      <ChatArea 
        conversation={selectedConversation} 
        provedorId={provedorId}
        onConversationClose={handleConversationClose}
        onConversationUpdate={handleConversationUpdate}
      />
    </div>
  );
};

export default ConversationsPage;
