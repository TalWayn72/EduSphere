import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useMutation, gql } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  type SupportedLocale,
} from '@edusphere/i18n';
import { COLORS } from '../../lib/theme';
import { saveMobileLocale } from '../../lib/i18n';
import { StorageSection } from './StorageSection';
import { WifiOnlySection } from './WifiOnlySection';
import { DownloadedCoursesSection } from './DownloadedCoursesSection';
import { styles } from './styles';

const UPDATE_LOCALE_MUTATION = gql`
  mutation UpdateUserPreferences($input: UpdateUserPreferencesInput!) {
    updateUserPreferences(input: $input) {
      id
      preferences { locale }
    }
  }
`;

export default function SettingsScreen() {
  const { t, i18n } = useTranslation('settings');
  const currentLocale = i18n.language as SupportedLocale;
  const [syncing, setSyncing] = useState(false);
  const [updateLocale] = useMutation(UPDATE_LOCALE_MUTATION);

  const handleLocaleChange = useCallback(
    async (locale: SupportedLocale): Promise<void> => {
      await saveMobileLocale(locale);
      setSyncing(true);
      try {
        await updateLocale({ variables: { input: { locale } } });
      } catch {
        // Locale saved locally; will retry sync on next session
      } finally {
        setSyncing(false);
      }
    },
    [updateLocale],
  );

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
                {isSelected && syncing && (
                  <ActivityIndicator size="small" color={COLORS.primary} style={styles.syncIndicator} />
                )}
                {isSelected && !syncing && <Text style={styles.checkmark}>&#x2713;</Text>}
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
