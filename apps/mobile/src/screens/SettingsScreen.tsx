import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, LOCALE_LABELS, type SupportedLocale } from '@edusphere/i18n';
import { saveMobileLocale } from '../lib/i18n';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation('settings');
  const currentLocale = i18n.language as SupportedLocale;

  const handleLocaleChange = async (locale: SupportedLocale): Promise<void> => {
    await saveMobileLocale(locale);
    // TODO: persist to DB via GraphQL mutation when Apollo client is configured
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.sectionTitle}>{t('language.title')}</Text>
      <Text style={styles.sectionDescription}>{t('language.description')}</Text>
      <FlatList
        data={[...SUPPORTED_LOCALES]}
        keyExtractor={(item) => item}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 20, fontWeight: '600', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  sectionDescription: { fontSize: 14, color: '#6B7280', paddingHorizontal: 16, paddingBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  itemSelected: { backgroundColor: '#EFF6FF' },
  flag: { fontSize: 24, marginRight: 12 },
  textContainer: { flex: 1 },
  nativeLabel: { fontSize: 16, color: '#111827' },
  selectedText: { color: '#2563EB', fontWeight: '600' },
  englishLabel: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  checkmark: { fontSize: 18, color: '#2563EB', fontWeight: 'bold' },
});
