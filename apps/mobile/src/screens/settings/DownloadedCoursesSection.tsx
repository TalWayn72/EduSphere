import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../lib/theme';
import { useDownloadedCourses } from '../../hooks/useDownloadedCourses';
import type { OfflineCourse } from '../../services/downloads';
import { formatBytes } from './formatBytes';
import { styles } from './styles';

export function DownloadedCoursesSection() {
  const { t } = useTranslation('settings');
  const { courses, isLoading, deleteCourse } = useDownloadedCourses();

  const handleDelete = (course: OfflineCourse) => {
    Alert.alert(
      t('downloads.deleteTitle'),
      t('downloads.deleteConfirm', { title: course.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => void deleteCourse(course.id),
        },
      ]
    );
  };

  return (
    <View>
      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
        {t('downloads.coursesTitle')}
      </Text>
      <Text style={styles.sectionDescription}>
        {t('downloads.coursesDescription')}
      </Text>
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : courses.length === 0 ? (
        <Text style={styles.emptyText}>{t('downloads.noCourses')}</Text>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.courseRow}>
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.courseMeta}>
                  {formatBytes(item.size)} ·{' '}
                  {new Date(item.downloadedAt).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item)}
                accessibilityLabel={t('downloads.deleteLabel', {
                  title: item.title,
                })}
                accessibilityRole="button"
              >
                <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}
