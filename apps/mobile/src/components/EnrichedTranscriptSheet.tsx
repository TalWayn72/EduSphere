/**
 * P5-02: Expo EnrichedTranscriptSheet — bottom sheet with enriched transcript.
 *
 * Displays enriched transcript blocks (TEXT, CITATION, HEADING, VISUAL_ANCHOR)
 * in a @gorhom/bottom-sheet. Auto-scrolls to the active block based on
 * the current video timestamp. Supports click-to-seek.
 */
import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EnrichedBlock {
  readonly id: string;
  readonly blockType: 'TEXT' | 'CITATION' | 'VISUAL_ANCHOR' | 'HEADING';
  readonly blockOrder: number;
  readonly content: Record<string, unknown>;
  readonly startTime?: number;
  readonly endTime?: number;
  readonly citationId?: string;
}

export interface EnrichedTranscriptSheetProps {
  readonly blocks: EnrichedBlock[];
  readonly currentTime: number;
  readonly onBlockPress?: (block: EnrichedBlock) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function EnrichedTranscriptSheet({
  blocks,
  currentTime,
  onBlockPress,
}: EnrichedTranscriptSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const flatListRef = useRef<FlatList<EnrichedBlock>>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '85%'], []);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.blockOrder - b.blockOrder),
    [blocks]
  );

  // Find active block index based on current time
  const activeIndex = useMemo(() => {
    return sortedBlocks.findIndex(
      (b) =>
        b.startTime !== undefined &&
        b.endTime !== undefined &&
        currentTime >= b.startTime &&
        currentTime < b.endTime
    );
  }, [sortedBlocks, currentTime]);

  // Auto-scroll to active block
  useEffect(() => {
    if (activeIndex >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.3,
      });
    }
  }, [activeIndex]);

  const renderBlock = useCallback(
    ({ item, index }: { item: EnrichedBlock; index: number }) => {
      const isActive = index === activeIndex;

      return (
        <Pressable
          onPress={() => onBlockPress?.(item)}
          style={[styles.block, isActive && styles.activeBlock]}
          testID={`block-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Transcript block: ${item.content.text ?? item.blockType}`}
        >
          {item.blockType === 'HEADING' && (
            <Text style={styles.heading} testID="block-heading">
              {item.content.text as string}
            </Text>
          )}
          {item.blockType === 'TEXT' && (
            <Text style={[styles.text, isActive && styles.activeText]}>
              {item.content.text as string}
            </Text>
          )}
          {item.blockType === 'CITATION' && (
            <View style={styles.citation} testID="block-citation">
              <Text style={styles.citationBook}>
                {item.content.bookName as string}
              </Text>
              {item.content.part && (
                <Text style={styles.citationDetail}>
                  {item.content.part as string}
                </Text>
              )}
            </View>
          )}
          {item.blockType === 'VISUAL_ANCHOR' && (
            <View style={styles.anchor} testID="block-anchor">
              <Text style={styles.anchorText}>
                {item.content.text as string ?? 'Visual anchor'}
              </Text>
            </View>
          )}
        </Pressable>
      );
    },
    [activeIndex, onBlockPress]
  );

  const keyExtractor = useCallback((item: EnrichedBlock) => item.id, []);

  if (blocks.length === 0) {
    return (
      <BottomSheet ref={bottomSheetRef} index={0} snapPoints={snapPoints}>
        <BottomSheetView style={styles.empty}>
          <Text style={styles.emptyText} testID="empty-transcript">
            No enriched transcript available
          </Text>
        </BottomSheetView>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      testID="enriched-transcript-sheet"
    >
      <FlatList
        ref={flatListRef}
        data={sortedBlocks}
        renderItem={renderBlock}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={() => {
          // Retry with delay when layout hasn't been calculated yet
          setTimeout(() => {
            if (activeIndex >= 0) {
              flatListRef.current?.scrollToIndex({
                index: activeIndex,
                animated: true,
              });
            }
          }, 200);
        }}
      />
    </BottomSheet>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  background: { backgroundColor: '#FFFFFF' },
  handle: { backgroundColor: '#D1D5DB' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  block: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginVertical: 2,
  },
  activeBlock: { backgroundColor: '#FEF3C7' },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginVertical: 8,
  },
  text: { fontSize: 15, color: '#374151', lineHeight: 22 },
  activeText: { color: '#1F2937', fontWeight: '500' },
  citation: {
    backgroundColor: '#EDE9FE',
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
    padding: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  citationBook: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B21B6',
  },
  citationDetail: { fontSize: 13, color: '#6D28D9', marginTop: 2 },
  anchor: {
    backgroundColor: '#DBEAFE',
    padding: 10,
    borderRadius: 6,
    marginVertical: 4,
  },
  anchorText: { fontSize: 13, color: '#1E40AF', fontStyle: 'italic' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});
