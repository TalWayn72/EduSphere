import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSubscription, gql } from '@apollo/client';

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

export default function DiscussionsScreen() {
  const courseId = 'demo-course'; // TODO: Get from context/navigation

  const { data: subscriptionData } = useSubscription(DISCUSSION_SUB, {
    variables: { courseId },
  });

  return (
    <View style={styles.container}>
      {subscriptionData?.discussionCreated && (
        <View style={styles.newDiscussionBanner}>
          <Text style={styles.bannerText}>
            🔴 New: {subscriptionData.discussionCreated.title}
          </Text>
        </View>
      )}

      <FlatList
        data={[]}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <View style={styles.discussionCard}>
            <Text style={styles.discussionTitle}>{item.title}</Text>
            <Text style={styles.discussionContent} numberOfLines={2}>
              {item.content}
            </Text>
            <Text style={styles.upvotes}>👍 {item.upvotes}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No discussions yet</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
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
  },
  discussionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  discussionContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  upvotes: {
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
});
