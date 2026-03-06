import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useQuery, gql } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, FONT } from '../lib/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      role
    }
  }
`;

export default function ProfileScreen() {
  const { data, loading } = useQuery(ME_QUERY);
  const { t } = useTranslation(['common', 'settings']);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {data?.me?.firstName?.[0]}
            {data?.me?.lastName?.[0]}
          </Text>
        </View>
        {loading ? (
          <Text style={styles.loadingText}>{t('common:loading')}</Text>
        ) : (
          <>
            <Text style={styles.name}>
              {data?.me?.firstName} {data?.me?.lastName}
            </Text>
            <Text style={styles.email}>{data?.me?.email}</Text>
            <Text style={styles.role}>{data?.me?.role}</Text>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings:account.title')}</Text>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>
            {t('settings:account.editProfile')}
          </Text>
          <Text style={styles.menuItemChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>
            {t('settings:notifications.title')}
          </Text>
          <Text style={styles.menuItemChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>
            {t('settings:account.privacy')}
          </Text>
          <Text style={styles.menuItemChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.menuItemText}>{t('common:settings')}</Text>
          <Text style={styles.menuItemChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('settings:account.myLearning')}
        </Text>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>
            {t('settings:account.myLearning')}
          </Text>
          <Text style={styles.menuItemChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>
            {t('settings:account.progress')}
          </Text>
          <Text style={styles.menuItemChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>
            {t('settings:account.achievements')}
          </Text>
          <Text style={styles.menuItemChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={[styles.menuItem, styles.logoutButton]}>
          <Text style={styles.logoutText}>{t('common:logOut')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>
        {t('settings:account.version', { version: '1.0.0' })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    backgroundColor: COLORS.bgCard,
    padding: SPACING.xxl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingText: {
    fontSize: FONT.base,
    color: COLORS.textMuted,
  },
  name: {
    fontSize: FONT.xxl,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  role: {
    fontSize: FONT.md,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
  section: {
    backgroundColor: COLORS.bgCard,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemText: {
    fontSize: FONT.base,
  },
  menuItemChevron: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutText: {
    fontSize: FONT.base,
    color: '#FF3B30',
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT.sm,
    padding: SPACING.xl,
  },
});
