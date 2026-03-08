import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery, gql } from '@apollo/client';
import { COLORS, SPACING, FONT, RADIUS, SHADOW } from '../lib/theme';
import { DEV_MODE } from '../lib/mock-mobile-data';

const LIVE_SESSIONS_QUERY = gql`
  query GetLiveSessions($status: String) {
    liveSessions(status: $status, first: 20) {
      edges {
        node {
          id
          meetingName
          scheduledAt
          status
          recordingUrl
        }
      }
    }
  }
`;

type Session = {
  id: string;
  meetingName: string;
  scheduledAt: string;
  status: string;
  recordingUrl?: string;
};

const MOCK_UPCOMING: Session[] = [
  {
    id: 'ls-1',
    meetingName: 'Philosophy of Mind — Week 5',
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'SCHEDULED',
  },
  {
    id: 'ls-2',
    meetingName: 'Ethics Discussion Group',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'SCHEDULED',
  },
];

const MOCK_PAST: Session[] = [
  {
    id: 'ls-3',
    meetingName: 'Logic Intro — Session 1',
    scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ENDED',
    recordingUrl: 'https://example.com/recording/ls-3',
  },
];

type Tab = 'upcoming' | 'past';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const LiveSessionsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  const { data, loading } = useQuery(LIVE_SESSIONS_QUERY, {
    skip: DEV_MODE,
    variables: { status: activeTab === 'upcoming' ? 'SCHEDULED' : 'ENDED' },
  });

  const sessions: Session[] = DEV_MODE
    ? activeTab === 'upcoming'
      ? MOCK_UPCOMING
      : MOCK_PAST
    : ((data?.liveSessions?.edges ?? []) as Array<{ node: Session }>).map(
        (e) => e.node
      );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['upcoming', 'past'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            testID={`tab-${tab}`}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading && !DEV_MODE ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`session-card-${item.id}`}>
              <Text style={styles.cardTitle}>{item.meetingName}</Text>
              <Text style={styles.cardDate}>{formatDate(item.scheduledAt)}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardStatus}>{item.status}</Text>
                {item.recordingUrl ? (
                  <TouchableOpacity style={styles.btn}>
                    <Text style={styles.btnText}>Watch Recording</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.btn}>
                    <Text style={styles.btnText}>Join</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No sessions found.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: { fontSize: FONT.base, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: FONT.semibold },
  loader: { marginTop: SPACING.xxxl },
  list: { padding: SPACING.lg, gap: SPACING.md },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...SHADOW.sm,
  },
  cardTitle: {
    fontSize: FONT.base,
    fontWeight: FONT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cardDate: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardStatus: { fontSize: FONT.xs, color: COLORS.textSecondary },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  btnText: { color: '#fff', fontSize: FONT.sm, fontWeight: FONT.semibold },
  empty: {
    textAlign: 'center',
    color: COLORS.textMuted,
    marginTop: SPACING.xxxl,
    fontSize: FONT.base,
  },
});
