/**
 * CourseViewerScreen — displays course details and a navigable module list.
 * Shows cached data when offline (Apollo InMemoryCache / offlineLink).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { GET_COURSE_DETAILS } from '../services/graphql';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseViewer'>;

interface ContentItem {
  id: string;
  title: string;
  type: string;
}

interface Module {
  id: string;
  title: string;
  contentItems: ContentItem[];
}

export default function CourseViewerScreen({ route }: Props) {
  const { courseId } = route.params;
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  const { data, loading, error } = useQuery(GET_COURSE_DETAILS, {
    variables: { id: courseId },
    fetchPolicy: isOffline ? 'cache-only' : 'cache-first',
  });

  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading course...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load course.</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  const course = data?.course;

  return (
    <SafeAreaView style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner} testID="offline-indicator">
          <Text style={styles.offlineText}>Offline — showing cached data</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title} testID="course-title">
          {course?.title ?? ''}
        </Text>
        {course?.description ? (
          <Text style={styles.description}>{course.description}</Text>
        ) : null}
      </View>

      <FlatList
        data={course?.modules ?? []}
        keyExtractor={(item: Module) => item.id}
        testID="module-list"
        renderItem={({ item }: { item: Module }) => (
          <ModuleRow
            module={item}
            expanded={expandedModule === item.id}
            onPress={() =>
              setExpandedModule(expandedModule === item.id ? null : item.id)
            }
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No modules available.</Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

interface ModuleRowProps {
  module: Module;
  expanded: boolean;
  onPress: () => void;
}

function ModuleRow({ module, expanded, onPress }: ModuleRowProps) {
  const count = module.contentItems?.length ?? 0;
  return (
    <TouchableOpacity
      style={styles.moduleRow}
      onPress={onPress}
      accessibilityRole="button"
      testID={`module-row-${module.id}`}
    >
      <View style={styles.moduleInfo}>
        <Text style={styles.moduleTitle}>{module.title}</Text>
        <Text style={styles.moduleMeta}>{count} item{count !== 1 ? 's' : ''}</Text>
      </View>
      <Text style={styles.chevron}>{expanded ? '\u25B2' : '\u25BC'}</Text>
      {expanded && count > 0 && (
        <View style={styles.contentList}>
          {module.contentItems.map((item) => (
            <View key={item.id} style={styles.contentItem}>
              <Text style={styles.contentIcon}>
                {item.type === 'VIDEO' ? '\uD83C\uDFA5' : item.type === 'QUIZ' ? '\u2705' : '\uD83D\uDCCB'}
              </Text>
              <Text style={styles.contentTitle}>{item.title}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  errorText: { fontSize: 16, color: '#DC2626', fontWeight: '600' },
  errorDetail: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D97706',
  },
  offlineText: { fontSize: 13, color: '#92400E', textAlign: 'center' },
  header: { padding: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  description: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  listContent: { paddingBottom: 24 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 32 },
  moduleRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  moduleInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduleTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1 },
  moduleMeta: { fontSize: 13, color: '#6B7280', marginLeft: 8 },
  chevron: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  contentList: { marginTop: 10, paddingLeft: 8 },
  contentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  contentIcon: { fontSize: 14, marginRight: 8 },
  contentTitle: { fontSize: 14, color: '#374151', flex: 1 },
});
