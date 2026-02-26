import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery, gql } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

const COURSE_DETAIL_QUERY = gql`
  query CourseDetail($id: ID!) {
    course(id: $id) {
      id
      title
      description
      isPublished
      modules {
        id
        title
        description
        orderIndex
        contentItems {
          id
          title
          type
          orderIndex
        }
      }
    }
  }
`;

type Props = NativeStackScreenProps<RootStackParamList, 'CourseDetail'>;

export default function CourseDetailScreen({ route }: Props) {
  const { courseId } = route.params;
  const { t } = useTranslation('courses');
  const { data, loading, error } = useQuery(COURSE_DETAIL_QUERY, {
    variables: { id: courseId },
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>{t('loadingCourse')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {t('failedToLoad', { message: error.message })}
        </Text>
      </View>
    );
  }

  const course = data?.course;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{course.title}</Text>
        <Text style={styles.description}>{course.description}</Text>
      </View>

      <View style={styles.modulesSection}>
        <Text style={styles.sectionTitle}>📖 {t('modules')}</Text>
        {course.modules?.map((module: any) => (
          <View key={module.id} style={styles.moduleCard}>
            <Text style={styles.moduleTitle}>{module.title}</Text>
            <Text style={styles.moduleDescription}>{module.description}</Text>

            {module.contentItems?.length > 0 && (
              <View style={styles.contentItems}>
                {module.contentItems.map((item: any) => (
                  <View key={item.id} style={styles.contentItem}>
                    <Text style={styles.contentIcon}>
                      {item.type === 'VIDEO' && '🎥'}
                      {item.type === 'READING' && '📄'}
                      {item.type === 'QUIZ' && '✅'}
                      {item.type === 'EXERCISE' && '💪'}
                    </Text>
                    <Text style={styles.contentTitle}>{item.title}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
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
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
  },
  modulesSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  moduleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  contentItems: {
    marginTop: 8,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  contentIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  contentTitle: {
    fontSize: 14,
    flex: 1,
  },
  error: {
    color: 'red',
  },
});
