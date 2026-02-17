import { useState } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';

const CREATE_SESSION = gql`
  mutation CreateSession($userId: ID!) {
    createAgentSession(input: {
      userId: $userId
      agentType: "TUTOR"
      context: "{}"
      tenantId: "00000000-0000-0000-0000-000000000001"
    }) {
      id
      agentType
      status
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($sessionId: ID!, $content: String!) {
    createAgentMessage(input: {
      sessionId: $sessionId
      role: "USER"
      content: $content
      tenantId: "00000000-0000-0000-0000-000000000001"
    }) {
      id
      role
      content
      createdAt
    }
  }
`;

const GET_MESSAGES = gql`
  query GetMessages($sessionId: ID!) {
    agentMessages(sessionId: $sessionId) {
      id
      role
      content
      createdAt
    }
  }
`;

export default function AITutor() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const [createSession] = useMutation(CREATE_SESSION, {
    onCompleted: (data) => {
      setSessionId(data.createAgentSession.id);
    },
  });

  const [sendMessage] = useMutation(SEND_MESSAGE, {
    refetchQueries: ['GetMessages'],
  });

  const { data: messagesData } = useQuery(GET_MESSAGES, {
    variables: { sessionId },
    skip: !sessionId,
    pollInterval: 2000, // Poll every 2 seconds for new messages
  });

  const handleStartSession = () => {
    createSession({ variables: { userId: 'current-user-id' } });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !message.trim()) return;

    sendMessage({
      variables: {
        sessionId,
        content: message,
      },
    });
    setMessage('');
  };

  return (
    <div>
      <h2>🤖 AI Tutor</h2>

      {!sessionId ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <p>Start a conversation with your AI tutor</p>
          <button
            onClick={handleStartSession}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Start New Session
          </button>
        </div>
      ) : (
        <div>
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              minHeight: '400px',
              maxHeight: '600px',
              overflowY: 'auto',
              marginBottom: '20px',
              backgroundColor: '#f9f9f9',
            }}
          >
            {messagesData?.agentMessages?.map((msg: any) => (
              <div
                key={msg.id}
                style={{
                  marginBottom: '15px',
                  padding: '10px',
                  borderRadius: '5px',
                  backgroundColor: msg.role === 'USER' ? '#e3f2fd' : '#fff',
                  marginLeft: msg.role === 'USER' ? '40px' : '0',
                  marginRight: msg.role === 'USER' ? '0' : '40px',
                }}
              >
                <strong>{msg.role === 'USER' ? 'You' : 'AI Tutor'}:</strong>
                <p style={{ margin: '5px 0 0 0' }}>{msg.content}</p>
                <small style={{ color: '#999' }}>
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </small>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
