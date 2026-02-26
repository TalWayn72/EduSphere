/**
 * ConflictResolutionBanner — shows when offline mutations permanently failed.
 * User can see which operations failed and dismiss them individually.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useConflictQueue } from '../hooks/useConflictQueue';

export function ConflictResolutionBanner() {
  const { t } = useTranslation('offline');
  const { conflicts, hasConflicts, dismiss, dismissAll } = useConflictQueue();

  if (!hasConflicts) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('conflicts.title', { count: conflicts.length })}
        </Text>
        <TouchableOpacity onPress={dismissAll}>
          <Text style={styles.dismissAll}>{t('conflicts.dismissAll')}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>{t('conflicts.subtitle')}</Text>
      <ScrollView style={styles.list} nestedScrollEnabled>
        {conflicts.map((c) => (
          <View key={c.id} style={styles.item}>
            <Text style={styles.opName}>{c.operationName}</Text>
            <TouchableOpacity
              onPress={() => dismiss(c.id)}
              style={styles.dismissBtn}
            >
              <Text style={styles.dismissText}>{t('conflicts.dismiss')}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    margin: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  dismissAll: { fontSize: 12, color: '#2563EB' },
  subtitle: { fontSize: 12, color: '#78350F', marginBottom: 8 },
  list: { maxHeight: 120 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#FDE68A',
  },
  opName: { fontSize: 12, color: '#374151', flex: 1 },
  dismissBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  dismissText: { fontSize: 12, color: '#DC2626' },
});
