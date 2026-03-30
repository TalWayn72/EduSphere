import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../lib/theme';
import { useStorageManager } from '../../hooks/useStorageManager';
import { formatBytes } from './formatBytes';
import { styles } from './styles';

export function StorageSection() {
  const { t } = useTranslation('settings');
  const { stats, isLoading, clearQueryCache, clearDownloads } =
    useStorageManager();
  const [clearing, setClearing] = useState<'cache' | 'downloads' | null>(null);

  const handleClearCache = () => {
    Alert.alert(t('storage.clearCacheTitle'), t('storage.clearCacheConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.clear'),
        style: 'destructive',
        onPress: async () => {
          setClearing('cache');
          const freed = await clearQueryCache();
          setClearing(null);
          Alert.alert(
            t('storage.cleared'),
            t('storage.freedBytes', { bytes: formatBytes(freed) }),
          );
        },
      },
    ]);
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
            Alert.alert(
              t('storage.cleared'),
              t('storage.freedBytes', { bytes: formatBytes(freed) }),
            );
          },
        },
      ],
    );
  };

  if (isLoading || !stats) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  const barFill = Math.min(stats.usageRatio, 1);
  const barColor = stats.isOverLimit
    ? COLORS.error
    : stats.isApproachingLimit
      ? COLORS.warning
      : COLORS.primary;

  return (
    <View style={styles.storageSection}>
      {stats.isOverLimit && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>&#x26A0;&#xFE0F;</Text>
          <Text style={styles.warningText}>{t('storage.overLimitWarning')}</Text>
        </View>
      )}
      {!stats.isOverLimit && stats.isApproachingLimit && (
        <View style={styles.warningBannerYellow}>
          <Text style={styles.warningIcon}>&#x26A0;&#xFE0F;</Text>
          <Text style={styles.warningTextYellow}>{t('storage.approachingLimitWarning')}</Text>
        </View>
      )}

      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${barFill * 100}%`, backgroundColor: barColor }]} />
      </View>

      <Text style={styles.usageLabel}>
        {formatBytes(stats.eduSphereUsedBytes)} / {formatBytes(stats.eduSphereQuotaBytes)}
        {'  '}({Math.round(stats.usageRatio * 100)}%)
      </Text>
      <Text style={styles.usageSubLabel}>
        {t('storage.deviceFree', { free: formatBytes(stats.freeDiskBytes) })}
      </Text>

      <TouchableOpacity style={styles.actionButton} onPress={handleClearCache} disabled={clearing !== null}>
        {clearing === 'cache' ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
        <Text style={styles.actionButtonText}>{t('storage.clearCache')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={handleClearDownloads} disabled={clearing !== null}>
        {clearing === 'downloads' ? <ActivityIndicator size="small" color={COLORS.error} /> : null}
        <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>{t('storage.clearDownloads')}</Text>
      </TouchableOpacity>
    </View>
  );
}
