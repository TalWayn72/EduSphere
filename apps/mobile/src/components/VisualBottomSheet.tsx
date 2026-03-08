/**
 * VisualBottomSheet — displays a visual anchor's linked image in a bottom sheet.
 * Uses @gorhom/bottom-sheet for smooth snap-point gesture handling.
 * Returns null when no anchor is active.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { Text, Image, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import type { VisualAnchor } from '../types/visual-anchor.types';

interface VisualBottomSheetProps {
  anchors: VisualAnchor[];
  activeAnchorId: string | null;
}

export default function VisualBottomSheet({
  anchors,
  activeAnchorId,
}: VisualBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  const activeAnchor = activeAnchorId
    ? (anchors.find((a) => a.id === activeAnchorId) ?? null)
    : null;

  const handleSheetChange = useCallback((_index: number) => {
    // index -1 = closed, 0 = 25%, 1 = 50%, 2 = 90%
    // tracked by bottom-sheet internally; no additional state needed
  }, []);

  if (!activeAnchor) return null;

  const asset = activeAnchor.visualAsset;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose={false}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.container}>
        {asset ? (
          <>
            <Image
              source={{ uri: asset.webpUrl ?? asset.storageUrl }}
              style={styles.image}
              resizeMode="contain"
              accessibilityLabel={asset.metadata?.altText ?? asset.filename}
              testID="visual-bottom-sheet-image"
            />
            <Text
              style={styles.anchorText}
              numberOfLines={3}
              testID="visual-bottom-sheet-anchor-text"
            >
              &ldquo;{activeAnchor.anchorText}&rdquo;
            </Text>
          </>
        ) : (
          <Text
            style={styles.noImage}
            testID="visual-bottom-sheet-no-image"
          >
            No image assigned to this section
          </Text>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: '#FFFFFF' },
  handle: { backgroundColor: '#D1D5DB' },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  anchorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  noImage: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 24,
  },
});
