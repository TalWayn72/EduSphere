import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, LOCALE_LABELS, type SupportedLocale } from '@edusphere/i18n';
import { saveMobileLocale } from '../lib/i18n';
import { useStorageManager } from '../hooks/useStorageManager';
import { useWifiOnlySetting } from '../hooks/useWifiOnlySetting';
import { useDownloadedCourses } from '../hooks/useDownloadedCourses';
import type { OfflineCourse } from '../services/downloads';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function StorageSection() {
  const { t } = useTranslation('settings');
  const { stats, isLoading, clearQueryCache, clearDownloads } = useStorageManager();
  const [clearing, setClearing] = useState<'cache' | 'downloads' | null>(null);

  const handleClearCache = () => {
    Alert.alert(
      t('storage.clearCacheTitle'),
      t('storage.clearCacheConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clear'),
          style: 'destructive',
          onPress: async () => {
            setClearing('cache');
            const freed = await clearQueryCache();
            setClearing(null);
            Alert.alert(t('storage.cleared'), t('storage.freedBytes', { bytes: formatBytes(freed) }));
          },
        },
      ]
    );
  };

  const handleClearDownloads = () => {
    Alert.alert(
      t('storage.clearDownloadsTitle'),
      t('storage.clearDownloadsConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clear'),
          style: 'destructive',
          onPress: async () => {
            setClearing('downloads');
            const freed = await clearDownloads();
            setClearing(null);
            Alert.alert(t('storage.cleared'), t('storage.freedBytes', { bytes: formatBytes(freed) }));
          },
        },
      ]
    );
  };

  if (isLoading || !stats) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  }

  const barFill = Math.min(stats.usageRatio, 1);
  const barColor = stats.isOverLimit ? '#DC2626' : stats.isApproachingLimit ? '#D97706' : '#2563EB';

  return (
    <View style={styles.storageSection}>
      {/* Warning banner when over limit */}
      {stats.isOverLimit && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>{t('storage.overLimitWarning')}</Text>
        </View>
      )}
      {!stats.isOverLimit && stats.isApproachingLimit && (
        <View style={styles.warningBannerYellow}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTextYellow}>{t('storage.approachingLimitWarning')}</Text>
        </View>
      )}

      {/* Usage bar */}
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${barFill * 100}%` as any, backgroundColor: barColor }]} />
      </View>

      <Text style={styles.usageLabel}>
        {formatBytes(stats.eduSphereUsedBytes)} / {formatBytes(stats.eduSphereQuotaBytes)}
        {'  '}({Math.round(stats.usageRatio * 100)}%)
      </Text>
      <Text style={styles.usageSubLabel}>
        {t('storage.deviceFree', { free: formatBytes(stats.freeDiskBytes) })}
      </Text>

      {/* Actions */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleClearCache}
        disabled={clearing !== null}
      >
        {clearing === 'cache' ? <ActivityIndicator size="small" color="#2563EB" /> : null}
        <Text style={styles.actionButtonText}>{t('storage.clearCache')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.actionButtonDanger]}
        onPress={handleClearDownloads}
        disabled={clearing !== null}
      >
        {clearing === 'downloads' ? <ActivityIndicator size="small" color="#DC2626" /> : null}
        <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
          {t('storage.clearDownloads')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function WifiOnlySection() {
  const { t } = useTranslation('settings');
  const { wifiOnly, isLoading, toggle } = useWifiOnlySetting();

  return (
    <View style={styles.wifiSection}>
      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{t('downloads.wifiOnlyTitle')}</Text>
      <Text style={styles.sectionDescription}>{t('downloads.wifiOnlyDescription')}</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('downloads.wifiOnlyLabel')}</Text>
        <Switch
          value={wifiOnly}
          onValueChange={() => void toggle()}
          disabled={isLoading}
          accessibilityLabel={t('downloads.wifiOnlyLabel')}
          accessibilityRole="switch"
          accessibilityState={{ checked: wifiOnly }}
        />
      </View>
    </View>
  );
}

function DownloadedCoursesSection() {
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
      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{t('downloads.coursesTitle')}</Text>
      <Text style={styles.sectionDescription}>{t('downloads.coursesDescription')}</Text>
      {isLoading ? (
        <View style={styles.loadingRow}><ActivityIndicator size="small" color="#2563EB" /></View>
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
                <Text style={styles.courseTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.courseMeta}>
                  {formatBytes(item.size)} · {new Date(item.downloadedAt).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item)}
                accessibilityLabel={t('downloads.deleteLabel', { title: item.title })}
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

export default function SettingsScreen() {
  const { t, i18n } = useTranslation('settings');
  const currentLocale = i18n.language as SupportedLocale;

  const handleLocaleChange = async (locale: SupportedLocale): Promise<void> => {
    await saveMobileLocale(locale);
    // TODO: persist to DB via GraphQL mutation when Apollo client is configured
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Language section */}
        <Text style={styles.sectionTitle}>{t('language.title')}</Text>
        <Text style={styles.sectionDescription}>{t('language.description')}</Text>
        <FlatList
          data={[...SUPPORTED_LOCALES]}
          keyExtractor={(item) => item}
          scrollEnabled={false}
          renderItem={({ item: locale }) => {
            const info = LOCALE_LABELS[locale];
            const isSelected = locale === currentLocale;
            return (
              <TouchableOpacity
                style={[styles.item, isSelected && styles.itemSelected]}
                onPress={() => void handleLocaleChange(locale)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${info.english} ${info.native}`}
              >
                <Text style={styles.flag}>{info.flag}</Text>
                <View style={styles.textContainer}>
                  <Text style={[styles.nativeLabel, isSelected && styles.selectedText]}>
                    {info.native}
                  </Text>
                  <Text style={styles.englishLabel}>{info.english}</Text>
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />

        {/* Offline storage section */}
        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{t('storage.title')}</Text>
        <Text style={styles.sectionDescription}>{t('storage.description')}</Text>
        <StorageSection />

        {/* WiFi-only download section */}
        <WifiOnlySection />

        {/* Downloaded courses section */}
        <DownloadedCoursesSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 20, fontWeight: '600', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  sectionTitleSpaced: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  sectionDescription: { fontSize: 14, color: '#6B7280', paddingHorizontal: 16, paddingBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  itemSelected: { backgroundColor: '#EFF6FF' },
  flag: { fontSize: 24, marginRight: 12 },
  textContainer: { flex: 1 },
  nativeLabel: { fontSize: 16, color: '#111827' },
  selectedText: { color: '#2563EB', fontWeight: '600' },
  englishLabel: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  checkmark: { fontSize: 18, color: '#2563EB', fontWeight: 'bold' },
  loadingRow: { padding: 20, alignItems: 'center' },
  storageSection: { paddingHorizontal: 16, paddingBottom: 32 },
  warningBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, marginBottom: 12 },
  warningBannerYellow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 8, padding: 12, marginBottom: 12 },
  warningIcon: { fontSize: 18, marginRight: 8 },
  warningText: { flex: 1, fontSize: 13, color: '#DC2626' },
  warningTextYellow: { flex: 1, fontSize: 13, color: '#92400E' },
  barBackground: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', borderRadius: 4 },
  usageLabel: { fontSize: 14, color: '#374151', fontVariant: ['tabular-nums'] },
  usageSubLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 12, marginBottom: 10 },
  actionButtonDanger: { borderColor: '#FCA5A5' },
  actionButtonText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  actionButtonTextDanger: { color: '#DC2626' },
  wifiSection: { paddingBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  switchLabel: { fontSize: 15, color: '#111827', flex: 1 },
  emptyText: { fontSize: 14, color: '#9CA3AF', paddingHorizontal: 16, paddingVertical: 12 },
  courseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  courseInfo: { flex: 1, marginRight: 12 },
  courseTitle: { fontSize: 15, color: '#111827', fontWeight: '500' },
  courseMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  deleteBtn: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
});
