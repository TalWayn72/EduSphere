import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useLazyQuery, gql } from '@apollo/client';
import { formatCertIssuedDate, maskVerificationCode } from './certificates.logic';

const MY_CERTS_QUERY = gql`
  query MyCertificates {
    myCertificates {
      id courseId issuedAt verificationCode metadata
    }
  }
`;

const CERT_DOWNLOAD_QUERY = gql`
  query CertificateDownloadUrl($certId: ID!) {
    certificateDownloadUrl(certId: $certId)
  }
`;

interface Certificate {
  id: string;
  courseId: string;
  issuedAt: string;
  verificationCode: string;
  metadata: Record<string, unknown> | null;
}

export function CertificatesScreen() {
  const [paused, setPaused] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setPaused(false);
      return () => setPaused(true);
    }, []),
  );

  const { data, loading } = useQuery(MY_CERTS_QUERY, { skip: paused });

  const [fetchDownloadUrl] = useLazyQuery(CERT_DOWNLOAD_QUERY, {
    onCompleted: async (result: { certificateDownloadUrl?: string }) => {
      const url = result?.certificateDownloadUrl;
      if (url) {
        await Linking.openURL(url);
      }
      setLoadingId(null);
    },
    onError: () => setLoadingId(null),
  });

  const handleDownload = useCallback(
    (certId: string) => {
      setLoadingId(certId);
      void fetchDownloadUrl({ variables: { certId } });
    },
    [fetchDownloadUrl],
  );

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const certs: Certificate[] = data?.myCertificates ?? [];

  return (
    <View style={s.container}>
      <Text style={s.title}>My Certificates</Text>
      <FlatList
        data={certs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.centered}>
            <Text style={s.emoji}>🎓</Text>
            <Text style={s.emptyTitle}>No certificates yet</Text>
            <Text style={s.emptyText}>Complete a course to earn your first certificate.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.courseName}>
                {(item.metadata as { courseName?: string } | null)?.courseName ?? item.courseId}
              </Text>
              <Text style={s.issuedBadge}>Issued</Text>
            </View>
            <Text style={s.issuedDate}>{formatCertIssuedDate(item.issuedAt)}</Text>
            <Text style={s.verificationLabel}>Verification Code</Text>
            <Text style={s.verificationCode}>{maskVerificationCode(item.verificationCode)}</Text>
            <TouchableOpacity
              style={[s.downloadBtn, loadingId === item.id && s.downloadBtnLoading]}
              onPress={() => handleDownload(item.id)}
              disabled={loadingId === item.id}
            >
              {loadingId === item.id
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={s.downloadBtnText}>Download PDF</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

export default CertificatesScreen;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 24, fontWeight: '700', padding: 16, color: '#1A1A2E' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  courseName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', flex: 1, marginRight: 8 },
  issuedBadge: {
    backgroundColor: '#D1FAE5', color: '#059669',
    fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  issuedDate: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  verificationLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 },
  verificationCode: { fontFamily: 'monospace', fontSize: 13, color: '#374151', marginBottom: 16 },
  downloadBtn: {
    backgroundColor: '#6366F1', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  downloadBtnLoading: { opacity: 0.7 },
  downloadBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  emoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
