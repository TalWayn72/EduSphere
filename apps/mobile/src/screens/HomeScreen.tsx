import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery, gql } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import {
  DEV_MODE,
  MOCK_USER,
  MOCK_STATS,
  MOCK_RECENT_COURSES,
} from '../lib/mock-mobile-data';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../lib/theme';

const HOME_QUERY = gql`
  query HomeData {
    me {
      id
      firstName
      lastName
    }
    myCourses(first: 3) {
      edges {
        node {
          id
          title
          progress
          lastAccessedAt
        }
      }
    }
  }
`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  color: string;
}

function StatCard({ label, value, unit, color }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type CourseItem = {
  id: string;
  title: string;
  progress: number;
  lastAccessed?: string;
  lastAccessedAt?: string;
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation(['dashboard', 'common']);
  const { data, loading } = useQuery(HOME_QUERY, { skip: DEV_MODE });
  const user = DEV_MODE
    ? MOCK_USER
    : (data?.me as typeof MOCK_USER | undefined);
  const stats = MOCK_STATS;
  const recentCourses: CourseItem[] = DEV_MODE
    ? MOCK_RECENT_COURSES
    : ((data?.myCourses?.edges ?? []) as Array<{ node: CourseItem }>).map(
        (e) => e.node
      );
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header} testID="home-header">
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {t('dashboard:welcomeBack', { name: user?.firstName ?? 'Student' })}
          </Text>
          {loading && !DEV_MODE ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.userName}>
              {user?.firstName ?? 'Student'} {user?.lastName ?? ''}
            </Text>
          )}
          <View style={styles.streakRow}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text
              style={styles.streakCount}
              testID="streak-value"
            >
              {stats.learningStreak}
            </Text>
            <Text style={styles.streakLabel}> day streak</Text>
          </View>
        </View>
        {DEV_MODE && (
          <View style={styles.devBadge}>
            <Text style={styles.devBadgeText}>DEV</Text>
          </View>
        )}
      </View>
      <Text style={styles.sectionTitle}>{t('dashboard:yourProgress')}</Text>
      <View style={styles.statsGrid} testID="stats-grid">
        <StatCard
          label={t('dashboard:stats.activeCourses')}
          value={stats.activeCourses}
          color={COLORS.primary}
        />
        <StatCard
          label={t('dashboard:stats.learningStreak')}
          value={stats.learningStreak}
          unit={t('dashboard:stats.days')}
          color={COLORS.warning}
        />
        <StatCard
          label={t('dashboard:stats.studyTime')}
          value={Math.round(stats.studyTimeMinutes / 60)}
          unit="hrs"
          color={COLORS.success}
        />
        <StatCard
          label={t('dashboard:stats.concepts')}
          value={stats.conceptsMastered}
          color={COLORS.accent}
        />
      </View>
      <Text style={styles.sectionTitle}>{t('dashboard:continueLearning')}</Text>
      <View testID="continue-learning-list">
        {recentCourses.map((course) => (
          <TouchableOpacity
            key={course.id}
            style={styles.courseCard}
            onPress={() =>
              navigation.navigate('CourseDetail', { courseId: course.id })
            }
          >
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle} numberOfLines={1}>
                {course.title}
              </Text>
              <Text style={styles.courseAccessed}>
                {formatRelativeTime(
                  course.lastAccessed ?? course.lastAccessedAt ?? ''
                )}
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${course.progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{course.progress}%</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xxl,
    backgroundColor: COLORS.bgCard,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    ...SHADOW.md,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: FONT.sm, color: COLORS.textSecondary },
  userName: { fontSize: FONT.xxl, fontWeight: FONT.bold, color: COLORS.textPrimary },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  streakFlame: { fontSize: FONT.lg },
  streakCount: {
    fontSize: FONT.base,
    fontWeight: FONT.semibold,
    color: COLORS.warning,
    marginLeft: 4,
  },
  streakLabel: { fontSize: FONT.sm, color: COLORS.textSecondary },
  devBadge: {
    backgroundColor: COLORS.warning,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  devBadgeText: { color: 'white', fontSize: FONT.xs, fontWeight: FONT.bold },
  sectionTitle: {
    fontSize: FONT.lg,
    fontWeight: FONT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  statCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    width: '47%',
    borderTopWidth: 3,
    ...SHADOW.sm,
  },
  statValue: { fontSize: 28, fontWeight: FONT.bold, marginBottom: 4 },
  statUnit: { fontSize: FONT.md, fontWeight: FONT.regular },
  statLabel: { fontSize: 13, color: COLORS.textSecondary },
  courseCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    ...SHADOW.sm,
  },
  courseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  courseTitle: { fontSize: FONT.base, fontWeight: FONT.semibold, flex: 1, marginRight: SPACING.sm },
  courseAccessed: { fontSize: FONT.sm, color: COLORS.textMuted },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: FONT.sm, color: COLORS.textSecondary, width: 35, textAlign: 'right' },
});
