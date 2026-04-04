/**
 * P5-03: Mobile-optimized CitationCard for Expo.
 *
 * Displays a sacred text citation with expandable source text.
 * Optimized for touch: large tap targets, smooth expand animation,
 * Hebrew RTL text support.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface CitationCardProps {
  readonly bookName: string;
  readonly part?: string;
  readonly page?: string;
  readonly column?: string;
  readonly paragraph?: string;
  readonly resolvedText?: string;
  readonly matchStatus: 'VERIFIED' | 'UNVERIFIED';
  readonly confidence: number;
  readonly onPress?: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CitationCard({
  bookName,
  part,
  page,
  column,
  paragraph,
  resolvedText,
  matchStatus,
  confidence,
  onPress,
}: CitationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
    onPress?.();
  }, [onPress]);

  const confidencePercent = Math.round(confidence * 100);
  const isVerified = matchStatus === 'VERIFIED';

  return (
    <Pressable
      onPress={toggleExpand}
      style={[styles.card, isVerified ? styles.verified : styles.unverified]}
      testID="citation-card"
      accessibilityRole="button"
      accessibilityLabel={`Citation from ${bookName}`}
      accessibilityState={{ expanded }}
      accessibilityHint={expanded ? 'Collapse citation' : 'Expand citation'}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <Text style={styles.bookName} testID="citation-book-name">
          {bookName}
        </Text>
        <View
          style={[
            styles.badge,
            isVerified ? styles.verifiedBadge : styles.unverifiedBadge,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              isVerified ? styles.verifiedText : styles.unverifiedText,
            ]}
            testID="citation-status"
          >
            {isVerified ? 'Verified' : 'Unverified'}
          </Text>
        </View>
      </View>

      {/* Metadata Row */}
      <View style={styles.metadataRow}>
        {part && (
          <Text style={styles.metadata} testID="citation-part">
            {part}
          </Text>
        )}
        {page && (
          <Text style={styles.metadata} testID="citation-page">
            {page}
          </Text>
        )}
        {column && (
          <Text style={styles.metadata} testID="citation-column">
            {column}
          </Text>
        )}
        {paragraph && (
          <Text style={styles.metadata} testID="citation-paragraph">
            {paragraph}
          </Text>
        )}
      </View>

      {/* Confidence */}
      <Text style={styles.confidence} testID="citation-confidence">
        {confidencePercent}% match
      </Text>

      {/* Expanded: Resolved Source Text */}
      {expanded && resolvedText && (
        <View style={styles.resolvedContainer} testID="citation-resolved">
          <Text style={styles.resolvedLabel}>Source Text:</Text>
          <Text style={styles.resolvedText}>{resolvedText}</Text>
        </View>
      )}

      {/* Expand indicator */}
      <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
    </Pressable>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 14,
    marginVertical: 6,
    marginHorizontal: 4,
    borderLeftWidth: 4,
  },
  verified: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#22C55E',
  },
  unverified: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    writingDirection: 'rtl',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedBadge: { backgroundColor: '#DCFCE7' },
  unverifiedBadge: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  verifiedText: { color: '#16A34A' },
  unverifiedText: { color: '#D97706' },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 8,
  },
  metadata: {
    fontSize: 13,
    color: '#6B7280',
    writingDirection: 'rtl',
  },
  confidence: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  resolvedContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resolvedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  resolvedText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    writingDirection: 'rtl',
  },
  chevron: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 6,
  },
});
