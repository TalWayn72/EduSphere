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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#999',
    textTransform: 'capitalize',
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#999',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemChevron: {
    fontSize: 24,
    color: '#ccc',
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    padding: 20,
  },
});
