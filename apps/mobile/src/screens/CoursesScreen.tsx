import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery, gql } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CoursesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data, loading, error } = useQuery(COURSES_QUERY);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading courses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data?.courses || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.courseCard}
            onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
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
  },
});
