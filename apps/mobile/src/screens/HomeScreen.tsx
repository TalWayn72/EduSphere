import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { COLORS } from '../lib/theme';
import { resolveStats } from '../lib/stats-utils';
import { WeeklyActivityBar } from '../components/WeeklyActivityBar';
import type { DayData } from '../components/WeeklyActivityBar';
import { styles, formatRelativeTime } from './HomeScreen.styles';

const MOCK_WEEKLY_ACTIVITY: DayData[] = [
  { label: 'Sun', count: 2 },
  { label: 'Mon', count: 4 },
  { label: 'Tue', count: 5 },
  { label: 'Wed', count: 3 },
  { label: 'Thu', count: 1 },
  { label: 'Fri', count: 4 },
  { label: 'Sat', count: 2 },
];

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

const MY_STATS_QUERY = gql`
  query MyStats {
    myStats {
      coursesEnrolled
      conceptsMastered
      totalLearningMinutes
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
  const { data: statsData, loading: statsLoading } = useQuery(MY_STATS_QUERY, {
    skip: DEV_MODE,
  });
  const user = DEV_MODE
    ? MOCK_USER
    : (data?.me as typeof MOCK_USER | undefined);
  const stats = DEV_MODE
    ? MOCK_STATS
    : resolveStats(
        statsLoading,
        statsData?.myStats as { coursesEnrolled?: number; conceptsMastered?: number; totalLearningMinutes?: number } | undefined,
        MOCK_STATS
      );
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
            <Text style={styles.streakFlame}>{'\uD83D\uDD25'}</Text>
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
      <Text style={styles.sectionTitle}>Weekly Activity</Text>
      <WeeklyActivityBar data={MOCK_WEEKLY_ACTIVITY} maxCount={5} />
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
