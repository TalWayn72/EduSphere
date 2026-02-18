import { useSubscription, gql } from '@apollo/client';
import { useEffect, useState } from 'react';

const AGENT_MESSAGE_SUB = gql`
  subscription OnAgentMessage($sessionId: ID!) {
    agentMessageCreated(sessionId: $sessionId) {
      id
      role
      content
      createdAt
    }
  }
`;

interface Props {
  sessionId: string;
}

export default function AITutorLive({ sessionId }: Props) {
  const [messages, setMessages] = useState<any[]>([]);

  const { data } = useSubscription(AGENT_MESSAGE_SUB, {
    variables: { sessionId },
  });

  useEffect(() => {
    if (data?.agentMessageCreated) {
      setMessages((prev) => [...prev, data.agentMessageCreated]);

      // Auto-scroll to bottom
      const container = document.getElementById('messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [data]);

  return (
    <div
      id="messages-container"
      style={{
        maxHeight: '500px',
        overflowY: 'auto',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
      }}
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            marginBottom: '15px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: msg.role === 'USER' ? '#e3f2fd' : '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            {msg.role === 'USER' ? '👤 You' : '🤖 AI Tutor'}
          </div>
          <div>{msg.content}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            {new Date(msg.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
