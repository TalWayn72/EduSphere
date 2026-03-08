import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, gql } from '@apollo/client';

const MY_GAMIFICATION_STATS_QUERY = gql`
  query MyGamificationStats {
    myGamificationStats {
      currentStreak
      longestStreak
      activeChallenges {
        challengeId
        title
        description
        targetValue
        currentValue
        xpReward
        completed
        endDate
      }
      leaderboard {
        rank
        userId
        displayName
        totalXp
        level
      }
    }
  }
`;

type TabType = 'progress' | 'challenges' | 'leaderboard';

// Pure helper functions (exported for testing)
export function computeXpProgress(totalXp: number): number {
  const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
  const levelStartXp = (level - 1) * (level - 1) * 100;
  const levelEndXp = level * level * 100;
  return Math.round(((totalXp - levelStartXp) / (levelEndXp - levelStartXp)) * 100);
}

export function formatStreak(days: number): string {
  if (days === 0) return 'No streak yet';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function computeLevel(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
}

export function GamificationScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('progress');
  const [paused, setPaused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setPaused(false);
      return () => setPaused(true);
    }, [])
  );

  const { data, loading: fetching } = useQuery(MY_GAMIFICATION_STATS_QUERY, {
    skip: paused,
  });

  const stats = data?.myGamificationStats;

  if (fetching) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gamification</Text>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['progress', 'challenges', 'leaderboard'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>🔥 Current Streak</Text>
            <Text style={styles.bigNumber}>{formatStreak(stats?.currentStreak ?? 0)}</Text>
            <Text style={styles.subText}>Longest: {formatStreak(stats?.longestStreak ?? 0)}</Text>
          </View>
        </View>
      )}

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <FlatList
          data={stats?.activeChallenges ?? []}
          keyExtractor={(item) => item.challengeId}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No active challenges right now.</Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.completed && styles.completedCard]}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.xpBadge}>+{item.xpReward} XP</Text>
              </View>
              <Text style={styles.subText}>{item.description}</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${Math.min(100, (item.currentValue / item.targetValue) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.subText}>{item.currentValue} / {item.targetValue}</Text>
            </View>
          )}
        />
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <FlatList
          data={stats?.leaderboard ?? []}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No leaderboard data yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.leaderboardRow}>
              <Text style={styles.rank}>
                {item.rank <= 3 ? (['🥇', '🥈', '🥉'] as const)[item.rank - 1] : `#${item.rank}`}
              </Text>
              <Text style={styles.memberName}>{item.displayName}</Text>
              <Text style={styles.levelBadge}>Lv.{item.level}</Text>
              <Text style={styles.xpText}>{item.totalXp.toLocaleString()}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

export default GamificationScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', padding: 16, color: '#1A1A2E' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#6366F1' },
  tabText: { fontSize: 13, color: '#6B7280' },
  activeTabText: { color: '#6366F1', fontWeight: '600' },
  section: { padding: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  completedCard: { opacity: 0.6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', textTransform: 'uppercase' },
  cardTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  bigNumber: { fontSize: 36, fontWeight: '800', color: '#F97316', marginTop: 4 },
  subText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  xpBadge: {
    backgroundColor: '#EEF2FF',
    color: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: '#6366F1', borderRadius: 3 },
  listContent: { padding: 16 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 32 },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  rank: { width: 40, fontSize: 16, textAlign: 'center' },
  memberName: { flex: 1, fontSize: 14, fontWeight: '500' },
  levelBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 11,
    color: '#374151',
    marginRight: 8,
  },
  xpText: { fontSize: 13, fontWeight: '700', color: '#6366F1', minWidth: 50, textAlign: 'right' },
});
