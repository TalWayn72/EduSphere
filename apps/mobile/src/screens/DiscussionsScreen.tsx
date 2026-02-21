import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useQuery, useSubscription, gql } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { DEV_MODE, MOCK_DISCUSSIONS } from '../lib/mock-mobile-data';

const DISCUSSIONS_QUERY = gql`
  query Discussions($courseId: ID!) {
    discussions(courseId: $courseId, limit: 20) {
      id
      title
      content
      upvotes
      createdAt
    }
  }
`;

const DISCUSSION_SUB = gql`
  subscription OnDiscussionCreated($courseId: ID!) {
    discussionCreated(courseId: $courseId) {
      id
      title
      content
      upvotes
    }
  }
`;

interface Discussion {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  createdAt?: string;
}

export default function DiscussionsScreen() {
  const { t } = useTranslation('collaboration');
  const courseId = 'demo-course';
  const [newTitle, setNewTitle] = useState('');

  const { data: queryData } = useQuery(DISCUSSIONS_QUERY, {
    variables: { courseId },
    skip: DEV_MODE,
  });

  const { data: subscriptionData } = useSubscription(DISCUSSION_SUB, {
    variables: { courseId },
    skip: DEV_MODE,
  });

  const discussions: Discussion[] = DEV_MODE
    ? MOCK_DISCUSSIONS
    : (queryData?.discussions ?? []);

  // Prepend new discussion from subscription
  const allDiscussions =
    subscriptionData?.discussionCreated && !DEV_MODE
      ? [subscriptionData.discussionCreated, ...discussions]
      : discussions;

  return (
    <View style={styles.container}>
      {subscriptionData?.discussionCreated && !DEV_MODE && (
        <View style={styles.newDiscussionBanner}>
          <Text style={styles.bannerText}>
            New: {subscriptionData.discussionCreated.title}
          </Text>
        </View>
      )}

      <FlatList
        data={allDiscussions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.discussionCard}>
            <Text style={styles.discussionTitle}>{item.title}</Text>
            <Text style={styles.discussionContent} numberOfLines={2}>
              {item.content}
            </Text>
            <View style={styles.discussionMeta}>
              <Text style={styles.upvotes}>{item.upvotes} {t('reply')}</Text>
              {item.createdAt && (
                <Text style={styles.createdAt}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('noSessions')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* New discussion input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder={t('newPost')}
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.postButton, !newTitle.trim() && styles.postButtonDisabled]}
          disabled={!newTitle.trim()}
          onPress={() => setNewTitle('')}
        >
          <Text style={styles.postButtonText}>{t('newPost')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
  },
  newDiscussionBanner: {
    backgroundColor: '#4CAF50',
    padding: 12,
    alignItems: 'center',
  },
  bannerText: {
    color: 'white',
    fontWeight: '600',
  },
  discussionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  discussionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  discussionContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  discussionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upvotes: {
    fontSize: 13,
    color: '#666',
  },
  createdAt: {
    fontSize: 12,
    color: '#999',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 8,
  },
  postButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#ccc',
  },
  postButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
