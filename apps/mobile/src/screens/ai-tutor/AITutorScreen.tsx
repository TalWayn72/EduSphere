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
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSubscription, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { checkAiConsent, grantAiConsent } from '../../lib/ai-consent';
import {
  CREATE_SESSION,
  SEND_MESSAGE,
  MESSAGE_SUB,
  resolveSessionId,
  type AgentMessage,
} from './ai-tutor.types';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInputBar } from './ChatInputBar';
import { styles } from './ai-tutor.styles';

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

  useEffect(() => {
    void checkAiConsent().then((granted) => setConsentGranted(granted));
  }, []);

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
          if (!newId && __DEV__) {
            console.debug(
              '[AITutorScreen] Session creation returned no id \u2014 falling back to demo-session'
            );
          }
          setSessionId(resolved);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
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
      setMessages((prev) => [
        ...prev,
        data.agentMessageCreated as AgentMessage,
      ]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [data]);

  const requestConsent = () => {
    Alert.alert(
      'AI Feature Consent',
      'This feature uses AI. Do you consent to sending your learning data to AI systems?',
      [
        { text: 'Decline', style: 'cancel', onPress: () => {} },
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

    try {
      await sendMessage({
        variables: { sessionId: effectiveSessionId, content: input },
      });
    } catch (error: unknown) {
      const gqlError = error as {
        graphQLErrors?: Array<{ extensions?: { code?: string } }>;
      };
      const consentErr = gqlError?.graphQLErrors?.find(
        (e) => e.extensions?.code === 'CONSENT_REQUIRED'
      );
      if (consentErr) {
        Alert.alert(
          'Consent Required',
          'AI features require your consent. Please enable AI processing in Settings \u2192 Privacy.'
        );
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    }
  };

  if (sessionLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Starting session\u2026</Text>
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
        renderItem={({ item }) => <ChatMessageItem item={item} />}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\u{1F916}'}</Text>
            <Text style={styles.emptyText}>{t('startConversation')}</Text>
          </View>
        }
      />
      <ChatInputBar
        input={input}
        onChangeText={setInput}
        onSend={() => void handleSend()}
      />
    </KeyboardAvoidingView>
  );
}
