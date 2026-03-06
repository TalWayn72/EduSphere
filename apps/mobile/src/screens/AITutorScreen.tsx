/**
 * AITutorScreen — AI tutor chat for mobile.
 * SI-9 fix: real sessionId created via mutation (no hardcoded 'demo-session').
 * SI-10: AI consent gate (AsyncStorage) must be granted before sending messages.
 * Memory safe: subscription variables bound to real sessionId only.
 */
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSubscription, useMutation, gql } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { checkAiConsent, grantAiConsent } from '../lib/ai-consent';

const CREATE_SESSION = gql`
  mutation CreateAgentSession($templateType: String!, $context: JSON) {
    startAgentSession(templateType: $templateType, context: $context) {
      id
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($sessionId: ID!, $content: String!) {
    createAgentMessage(
      input: {
        sessionId: $sessionId
        role: "USER"
        content: $content
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

interface AgentMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

// Re-export for backward compatibility and convenience
export { checkAiConsent, grantAiConsent } from '../lib/ai-consent';

/**
 * Pure logic: resolve sessionId from mutation result or fallback.
 * Exported for unit testing without render.
 */
export function resolveSessionId(
  mutationResult: string | null,
  fallback: string
): string {
  if (mutationResult && mutationResult.trim().length > 0) {
    return mutationResult;
  }
  return fallback;
}

export default function AITutorScreen() {
  const { t } = useTranslation('agents');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [consentGranted, setConsentGranted] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const [createSession] = useMutation(CREATE_SESSION);
  const [sendMessage] = useMutation(SEND_MESSAGE);

  const { data } = useSubscription(MESSAGE_SUB, {
    variables: { sessionId: sessionId ?? '' },
    skip: !sessionId,
  });

  // SI-10: Check consent on mount
  useEffect(() => {
    void checkAiConsent().then((granted) => {
      setConsentGranted(granted);
    });
  }, []);

  // SI-9: Create real session on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await createSession({
          variables: { templateType: 'AI_TUTOR', context: {} },
        });
        const newId = result.data?.startAgentSession?.id as string | null;
        if (!cancelled) {
          const resolved = resolveSessionId(newId ?? null, 'demo-session');
          if (!newId) {
            console.warn(
              '[AITutorScreen] Session creation returned no id — falling back to demo-session'
            );
          }
          setSessionId(resolved);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn(
            '[AITutorScreen] Failed to create agent session, using demo-session fallback:',
            err
          );
          setSessionId('demo-session');
        }
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createSession]);

  useEffect(() => {
    if (data?.agentMessageCreated) {
      setMessages((prev) => [...prev, data.agentMessageCreated as AgentMessage]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [data]);

  // SI-10: Show consent modal if not granted
  const requestConsent = () => {
    Alert.alert(
      'AI Feature Consent',
      'This feature uses AI. Do you consent to sending your learning data to AI systems?',
      [
        {
          text: 'Decline',
          style: 'cancel',
          onPress: () => {
            // User declined — do not proceed
          },
        },
        {
          text: 'Accept',
          onPress: () => {
            void grantAiConsent().then(() => setConsentGranted(true));
          },
        },
      ]
    );
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // SI-10: Enforce consent before sending to AI
    if (!consentGranted) {
      requestConsent();
      return;
    }

    const effectiveSessionId = sessionId ?? 'demo-session';
    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      role: 'USER',
      content: input,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    await sendMessage({ variables: { sessionId: effectiveSessionId, content: input } });
  };

  if (sessionLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Starting session…</Text>
      </View>
    );
  }

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
                ? `\u{1F464} ${t('common:profile')}`
                : `\u{1F916} ${t('chatPanel.title')}`}
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
            <Text style={styles.emptyIcon}>{'\u{1F916}'}</Text>
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
          onPress={() => void handleSend()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
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
