import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation';
import { COLORS, SPACING, FONT, RADIUS } from '../lib/theme';

// Graceful import — expo-gl is optional (not in current package.json)
let ExpoGL: { GLView?: unknown } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoGL = require('expo-gl') as { GLView?: unknown };
} catch {
  // expo-gl not installed — fallback UI will be shown
}

type ModelViewerRouteProp = RouteProp<RootStackParamList, 'ModelViewer'>;

export const ModelViewerScreen: React.FC = () => {
  const route = useRoute<ModelViewerRouteProp>();
  const { modelTitle = '3D Model', modelUrl } = route.params ?? {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If expo-gl is unavailable show a friendly fallback
  if (!ExpoGL || !ExpoGL.GLView) {
    return (
      <View style={styles.container} testID="model-viewer-unavailable">
        <Text style={styles.icon}>🧊</Text>
        <Text style={styles.title}>{modelTitle}</Text>
        <Text style={styles.errorText}>
          3D viewer is not available on this device.
        </Text>
        {modelUrl ? (
          <Text style={styles.hint}>Model URL: {modelUrl}</Text>
        ) : null}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container} testID="model-viewer-error">
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setError(null);
            setLoading(true);
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="model-viewer-gl">
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading {modelTitle}…</Text>
        </View>
      )}
      {/* GLView surface placeholder — requires expo-gl to be wired up fully */}
      <View
        style={styles.glSurface}
        onLayout={() => {
          try {
            setLoading(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load model');
          }
        }}
      >
        <Text style={styles.glPlaceholder}>GL Surface</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  icon: { fontSize: 48, marginBottom: SPACING.lg },
  title: {
    fontSize: FONT.xl,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  hint: { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center' },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
  },
  retryText: { color: '#fff', fontWeight: FONT.semibold, fontSize: FONT.base },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    zIndex: 10,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
  },
  glSurface: {
    width: '100%',
    height: '80%',
    backgroundColor: '#000',
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glPlaceholder: { color: '#444', fontSize: FONT.sm },
});
