import React from 'react';
import { View, Text, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWifiOnlySetting } from '../../hooks/useWifiOnlySetting';
import { styles } from './styles';

export function WifiOnlySection() {
  const { t } = useTranslation('settings');
  const { wifiOnly, isLoading, toggle } = useWifiOnlySetting();

  return (
    <View style={styles.wifiSection}>
      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
        {t('downloads.wifiOnlyTitle')}
      </Text>
      <Text style={styles.sectionDescription}>
        {t('downloads.wifiOnlyDescription')}
      </Text>
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
