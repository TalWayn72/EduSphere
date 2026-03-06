import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useQuery, gql } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { database } from '../services/database';
import { MasteryBadge } from '../components/MasteryBadge';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../lib/theme';

const COURSES_QUERY = gql`
  query Courses {
    courses(limit: 20) {
      id
      title
      description
      isPublished
      createdAt
    }
  }
`;

const COURSES_QUERY_STR = `query Courses {
  courses(limit: 20) {
    id title description isPublished createdAt
  }
}`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Course {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  createdAt: string;
}

export default function CoursesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation('courses');
  const [cachedCourses, setCachedCourses] = useState<Course[]>([]);
  const [isShowingCache, setIsShowingCache] = useState(false);
  const [search, setSearch] = useState('');

  const { data, loading, error } = useQuery(COURSES_QUERY);

  useEffect(() => {
    if (data?.courses) {
      database.cacheQuery(COURSES_QUERY_STR, {}, data).catch(() => {});
      setIsShowingCache(false);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      database
        .getCachedQuery(COURSES_QUERY_STR, {})
        .then((cached: unknown) => {
          const result = cached as { courses?: Course[] } | null;
          if (result?.courses) {
            setCachedCourses(result.courses);
            setIsShowingCache(true);
          }
        })
        .catch(() => {});
    }
  }, [error]);

  const allCourses: Course[] = data?.courses ?? cachedCourses;

  const courses = search.trim()
    ? allCourses.filter((c) =>
        c.title.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : allCourses;

  if (loading && allCourses.length === 0) {
    return (
      <View style={styles.center}>
        <Text testID="courses-loading">{t('loadingCourses')}</Text>
      </View>
    );
  }

  if (error && allCourses.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {t('failedToLoad', { message: error.message })}
        </Text>
        <Text style={styles.hint}>{t('common:retry')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isShowingCache && (
        <View style={styles.offlineBanner} testID="offline-banner">
          <Text style={styles.offlineBannerText}>{t('showingCachedData')}</Text>
        </View>
      )}
      <View style={styles.searchRow}>
        <TextInput
          testID="courses-search-input"
          style={styles.searchInput}
          placeholder={t('searchPlaceholder', { defaultValue: 'Search courses…' })}
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        testID="courses-list"
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`course-item-${item.id}`}
            style={styles.courseCard}
            onPress={() =>
              navigation.navigate('CourseDetail', { courseId: item.id })
            }
          >
            <View style={styles.cardLeftBorder} />
            <View style={styles.cardContent}>
              <View style={styles.courseHeader}>
                <Text style={styles.courseTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {!item.isPublished && (
                  <Text style={styles.draftBadge}>{t('draft')}</Text>
                )}
              </View>
              <Text style={styles.courseDescription} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.courseFooter}>
                <Text style={styles.courseDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                <MasteryBadge level="none" size="sm" showLabel />
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.hint}>{t('noCourses')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  offlineBanner: {
    backgroundColor: '#FF9500',
    padding: SPACING.sm,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: 'white',
    fontSize: FONT.sm,
    fontWeight: FONT.medium,
  },
  searchRow: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT.md,
    color: COLORS.textPrimary,
  },
  listContent: {
    padding: SPACING.lg,
  },
  courseCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    overflow: 'hidden',
    ...SHADOW.md,
  },
  cardLeftBorder: {
    width: 4,
    backgroundColor: COLORS.primary,
  },
  cardContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  courseTitle: {
    fontSize: FONT.lg,
    fontWeight: FONT.semibold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  draftBadge: {
    fontSize: FONT.xs,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
  courseDescription: {
    fontSize: FONT.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseDate: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
  },
  error: {
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: FONT.md,
    textAlign: 'center',
  },
});
