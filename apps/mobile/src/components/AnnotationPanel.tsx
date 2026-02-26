/**
 * AnnotationPanel — bottom-sheet style panel for viewing and adding annotations.
 * Read-only when offline. Calls GraphQL mutation to persist new annotations.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useNetInfo } from '@react-native-community/netinfo';
import { GET_ANNOTATIONS, CREATE_ANNOTATION } from '../services/graphql';

interface Annotation {
  id: string;
  text: string;
  createdAt: string;
  author: { displayName: string };
}

export interface AnnotationPanelProps {
  contentId: string;
  onClose: () => void;
}

export default function AnnotationPanel({
  contentId,
  onClose,
}: AnnotationPanelProps) {
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;
  const [newText, setNewText] = useState('');

  const { data, loading } = useQuery(GET_ANNOTATIONS, {
    variables: { contentId },
    fetchPolicy: isOffline ? 'cache-only' : 'cache-and-network',
  });

  const [createAnnotation, { loading: submitting }] = useMutation(
    CREATE_ANNOTATION,
    {
      refetchQueries: [{ query: GET_ANNOTATIONS, variables: { contentId } }],
    }
  );

  const handleSubmit = async () => {
    const trimmed = newText.trim();
    if (!trimmed || isOffline) return;
    await createAnnotation({ variables: { contentId, text: trimmed } });
    setNewText('');
  };

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID="annotation-panel-modal"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.panel}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <PanelHeader onClose={onClose} isOffline={isOffline} />

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#2563EB" />
              </View>
            ) : (
              <FlatList
                data={(data?.annotations ?? []) as Annotation[]}
                keyExtractor={(item) => item.id}
                testID="annotation-list"
                renderItem={({ item }) => <AnnotationItem annotation={item} />}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No annotations yet.</Text>
                }
                style={styles.list}
              />
            )}

            {!isOffline && (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={newText}
                  onChangeText={setNewText}
                  placeholder="Add an annotation..."
                  multiline
                  maxLength={500}
                  testID="annotation-input"
                  editable={!submitting}
                />
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!newText.trim() || submitting) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!newText.trim() || submitting}
                  testID="annotation-submit"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {isOffline && (
              <View style={styles.readOnlyBanner} testID="read-only-banner">
                <Text style={styles.readOnlyText}>Read-only while offline</Text>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function PanelHeader({
  onClose,
  isOffline,
}: {
  onClose: () => void;
  isOffline: boolean;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>
        Annotations{isOffline ? ' (Offline)' : ''}
      </Text>
      <TouchableOpacity
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Text style={styles.closeBtn}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

function AnnotationItem({ annotation }: { annotation: Annotation }) {
  return (
    <View style={styles.annotationItem}>
      <View style={styles.annotationMeta}>
        <Text style={styles.annotationAuthor}>
          {annotation.author?.displayName ?? 'Unknown'}
        </Text>
        <Text style={styles.annotationDate}>
          {new Date(annotation.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.annotationText}>{annotation.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  closeBtn: { fontSize: 16, color: '#2563EB', fontWeight: '500' },
  loadingRow: { padding: 24, alignItems: 'center' },
  list: { flexGrow: 0, maxHeight: 300 },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 24,
  },
  annotationItem: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  annotationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  annotationAuthor: { fontSize: 12, fontWeight: '600', color: '#374151' },
  annotationDate: { fontSize: 11, color: '#9CA3AF' },
  annotationText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    color: '#111827',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 56,
  },
  submitBtnDisabled: { backgroundColor: '#93C5FD' },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  readOnlyBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D97706',
  },
  readOnlyText: { fontSize: 13, color: '#92400E' },
});
