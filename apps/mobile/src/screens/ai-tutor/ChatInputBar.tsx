/**
 * ChatInputBar — text input and send button for the AI tutor chat.
 */
import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from './ai-tutor.styles';

interface ChatInputBarProps {
  input: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
}

export function ChatInputBar({
  input,
  onChangeText,
  onSend,
}: ChatInputBarProps) {
  const { t } = useTranslation('agents');
  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={onChangeText}
        placeholder={t('askAgent', { agentLabel: t('chatPanel.title') })}
        multiline
        maxLength={500}
      />
      <TouchableOpacity
        style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
        onPress={onSend}
        disabled={!input.trim()}
      >
        <Text style={styles.sendButtonText}>{t('sendMessage')}</Text>
      </TouchableOpacity>
    </View>
  );
}
