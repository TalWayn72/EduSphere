import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSubscription, useMutation, gql } from '@apollo/client';
import { useTranslation } from 'react-i18next';

const SEND_MESSAGE = gql`
  mutation SendMessage($sessionId: ID!, $content: String!) {
    createAgentMessage(
      input: {
        sessionId: $sessionId
        role: "USER"
        content: $content
        tenantId: "tenant-1"
      }
    ) {
      id
    }
  }
`;

const MESSAGE_SUB = gql`
  subscription OnMessage($sessionId: ID!) {
    agentMessageCreated(sessionId: $sessionId) {
      id
      role
      content
      createdAt
    }
  }
`;

export default function AITutorScreen() {
  const { t } = useTranslation('agents');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const sessionId = 'demo-session'; // TODO: Create session on mount

  const [sendMessage] = useMutation(SEND_MESSAGE);
  const { data } = useSubscription(MESSAGE_SUB, {
    variables: { sessionId },
  });

  useEffect(() => {
    if (data?.agentMessageCreated) {
      setMessages((prev) => [...prev, data.agentMessageCreated]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [data]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'USER',
      content: input,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    await sendMessage({ variables: { sessionId, content: input } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageCard,
              item.role === 'USER' ? styles.userMessage : styles.aiMessage,
            ]}
          >
            <Text style={styles.messageRole}>
              {item.role === 'USER'
                ? `👤 ${t('common:profile')}`
                : `🤖 ${t('chatPanel.title')}`}
            </Text>
            <Text style={styles.messageContent}>{item.content}</Text>
            <Text style={styles.messageTime}>
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyText}>{t('startConversation')}</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t('askAgent', { agentLabel: t('chatPanel.title') })}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !input.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Text style={styles.sendButtonText}>{t('sendMessage')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesList: {
    padding: 16,
  },
  messageCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666',
  },
  messageContent: {
    fontSize: 14,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
  },
  empty: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
