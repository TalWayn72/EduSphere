/**
 * ChatMessageItem — renders a single chat message bubble.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AgentMessage } from './ai-tutor.types';
import { styles } from './ai-tutor.styles';

interface ChatMessageItemProps {
  item: AgentMessage;
}

export function ChatMessageItem({ item }: ChatMessageItemProps) {
  const { t } = useTranslation('agents');
  return (
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
  );
}
