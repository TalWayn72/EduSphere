import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { useQuery, gql } from '@apollo/client';
import { useTranslation } from 'react-i18next';

const MY_OPEN_BADGES_QUERY = gql`
  query MyOpenBadges {
    myOpenBadges {
      id
      issuedAt
      revoked
      revokedAt
      revokedReason
      definition {
        name
        description
        imageUrl
      }
    }
  }
`;

interface BadgeDefinition {
  name: string;
  description: string;
  imageUrl: string | null;
}

interface OpenBadge {
  id: string;
  issuedAt: string;
  revoked: boolean;
  revokedAt: string | null;
  revokedReason: string | null;
  definition: BadgeDefinition;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface BadgeCardProps {
  readonly badge: OpenBadge;
}

function BadgeCard({ badge }: BadgeCardProps): React.ReactElement {
  const statusColor = badge.revoked ? '#FF3B30' : '#34C759';
  const statusLabel = badge.revoked ? 'Revoked' : 'Valid';

  return (
    <View
      style={[styles.card, badge.revoked && styles.cardRevoked]}
      testID={`badge-card-${badge.id}`}
    >
      <View style={styles.cardHeader}>
        {badge.definition.imageUrl ? (
          <Image
            source={{ uri: badge.definition.imageUrl }}
            style={styles.badgeImage}
            accessibilityLabel={badge.definition.name}
          />
        ) : (
          <View style={styles.badgeImagePlaceholder}>
            <Text style={styles.badgeImagePlaceholderText}>🏅</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.badgeName} numberOfLines={2} testID={`badge-name-${badge.id}`}>
            {badge.definition.name}
          </Text>
          <Text
            style={[styles.statusLabel, { color: statusColor }]}
            testID={`badge-status-${badge.id}`}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={3}>
        {badge.definition.description}
      </Text>

      <Text style={styles.issuedAt}>
        Issued: {formatDate(badge.issuedAt)}
      </Text>

      {badge.revoked && badge.revokedReason ? (
        <View style={styles.revokedBox} testID={`revoked-reason-${badge.id}`}>
          <Text style={styles.revokedLabel}>Revoked reason:</Text>
          <Text style={styles.revokedReason}>{badge.revokedReason}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function MyBadgesScreen(): React.ReactElement {
  const { t } = useTranslation('common');
  const { data, loading, error } = useQuery<{ myOpenBadges: OpenBadge[] }>(
    MY_OPEN_BADGES_QUERY
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#007AFF"
          testID="loading-indicator"
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText} testID="error-message">
          {error.message}
        </Text>
      </View>
    );
  }

  const badges = data?.myOpenBadges ?? [];

  return (
    <View style={styles.container}>
      <FlatList<OpenBadge>
        data={badges}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BadgeCard badge={item} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.screenTitle}>
            {t('myBadges', { defaultValue: 'My Open Badges' })}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer} testID="empty-state">
            <Text style={styles.emptyText}>
              You haven&apos;t earned any Open Badges yet
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1c1c1e',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardRevoked: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  badgeImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  badgeImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeImagePlaceholderText: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  issuedAt: {
    fontSize: 12,
    color: '#999',
  },
  revokedBox: {
    marginTop: 8,
    backgroundColor: '#fff0f0',
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  revokedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 2,
  },
  revokedReason: {
    fontSize: 12,
    color: '#c0392b',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
