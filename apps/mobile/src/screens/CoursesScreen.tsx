import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useQuery, gql } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { database } from '../services/database';

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
  const [cachedCourses, setCachedCourses] = useState<Course[]>([]);
  const [isShowingCache, setIsShowingCache] = useState(false);

  const { data, loading, error } = useQuery(COURSES_QUERY);

  // Cache successful results to SQLite
  useEffect(() => {
    if (data?.courses) {
      database.cacheQuery(COURSES_QUERY_STR, {}, data).catch(() => {});
      setIsShowingCache(false);
    }
  }, [data]);

  // Load from cache when there's an error
  useEffect(() => {
    if (error) {
      database
        .getCachedQuery(COURSES_QUERY_STR, {})
        .then((cached: { courses?: Course[] } | null) => {
          if (cached?.courses) {
            setCachedCourses(cached.courses);
            setIsShowingCache(true);
          }
        })
        .catch(() => {});
    }
  }, [error]);

  const courses: Course[] = data?.courses ?? cachedCourses;

  if (loading && courses.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Loading courses...</Text>
      </View>
    );
  }

  if (error && courses.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error.message}</Text>
        <Text style={styles.hint}>Check your connection and try again</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isShowingCache && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Showing cached content — you are offline
          </Text>
        </View>
      )}
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.courseCard}
            onPress={() =>
              navigation.navigate('CourseDetail', { courseId: item.id })
            }
          >
            <View style={styles.courseHeader}>
              <Text style={styles.courseTitle}>{item.title}</Text>
              {!item.isPublished && (
                <Text style={styles.draftBadge}>Draft</Text>
              )}
            </View>
            <Text style={styles.courseDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.courseDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.hint}>No courses available</Text>
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
  offlineBanner: {
    backgroundColor: '#FF9500',
    padding: 10,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  courseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  draftBadge: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  courseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  courseDate: {
    fontSize: 12,
    color: '#999',
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  hint: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});
