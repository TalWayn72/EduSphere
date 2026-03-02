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
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {t('dashboard:welcomeBack', { name: user?.firstName ?? 'Student' })}
          </Text>
          {loading && !DEV_MODE ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.userName}>
              {user?.firstName ?? 'Student'} {user?.lastName ?? ''}
            </Text>
          )}
        </View>
        {DEV_MODE && (
          <View style={styles.devBadge}>
            <Text style={styles.devBadgeText}>DEV</Text>
          </View>
        )}
      </View>
      <Text style={styles.sectionTitle}>{t('dashboard:yourProgress')}</Text>
      <View style={styles.statsGrid}>
        <StatCard
          label={t('dashboard:stats.activeCourses')}
          value={stats.activeCourses}
          color="#007AFF"
        />
        <StatCard
          label={t('dashboard:stats.learningStreak')}
          value={stats.learningStreak}
          unit={t('dashboard:stats.days')}
          color="#FF9500"
        />
        <StatCard
          label={t('dashboard:stats.studyTime')}
          value={Math.round(stats.studyTimeMinutes / 60)}
          unit="hrs"
          color="#34C759"
        />
        <StatCard
          label={t('dashboard:stats.concepts')}
          value={stats.conceptsMastered}
          color="#AF52DE"
        />
      </View>
      <Text style={styles.sectionTitle}>{t('dashboard:continueLearning')}</Text>
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
                style={[
                  styles.progressFill,
                  { width: `${course.progress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{course.progress}%</Text>
          </View>
        </TouchableOpacity>
      ))}
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
  },
  greeting: { fontSize: 14, color: '#666' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  devBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  devBadgeText: { color: 'white', fontSize: 11, fontWeight: '700' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  statUnit: { fontSize: 14, fontWeight: 'normal' },
  statLabel: { fontSize: 13, color: '#666' },
  courseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  courseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  courseTitle: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  courseAccessed: { fontSize: 12, color: '#999' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#666', width: 35, textAlign: 'right' },
});
