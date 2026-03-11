import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT } from '../lib/theme';

// WCAG 1.4.1 — not color alone: level is communicated via both color dot AND text label
export type MasteryLevel =
  | 'none'
  | 'attempted'
  | 'familiar'
  | 'proficient'
  | 'mastered';

interface MasteryBadgeProps {
  level: MasteryLevel;
  size?: 'sm' | 'md';
  // WCAG 1.4.1: showLabel defaults to true so text label is always visible by default
  showLabel?: boolean;
}

const LEVEL_COLOR: Record<MasteryLevel, string> = {
  none: COLORS.masteryNone,
  attempted: COLORS.masteryAttempted,
  familiar: COLORS.masteryFamiliar,
  proficient: COLORS.masteryProficient,
  mastered: COLORS.masteryMastered,
};

// WCAG 1.4.1 — text labels for each mastery level (not color alone)
const LEVEL_LABEL: Record<MasteryLevel, string> = {
  none: 'Not Started',
  attempted: 'Attempted',
  familiar: 'Familiar',
  proficient: 'Proficient',
  mastered: 'Mastered',
};

// Numeric position for accessible description
const LEVEL_NUMBER: Record<MasteryLevel, number> = {
  none: 0,
  attempted: 1,
  familiar: 2,
  proficient: 3,
  mastered: 4,
};

const TOTAL_LEVELS = 4;

export function MasteryBadge({
  level,
  size = 'md',
  showLabel = true,
}: MasteryBadgeProps) {
  const isSm = size === 'sm';
  const dotSize = isSm ? 8 : 10;
  const fontSize = isSm ? FONT.xs : FONT.sm;
  const color = LEVEL_COLOR[level];
  const label = LEVEL_LABEL[level];
  const num = LEVEL_NUMBER[level];
  // WCAG 1.4.1 — accessible label conveys both meaning and numeric level
  const accessibilityLabel = `Mastery: ${label} (level ${num} of ${TOTAL_LEVELS})`;

  return (
    <View
      testID={`mastery-badge-${level}`}
      style={styles.container}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {/* Color dot is supplementary — text label is the primary non-color indicator */}
      <View
        accessible={false}
        importantForAccessibility="no"
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color },
        ]}
      />
      {/* WCAG 1.4.1 — text label always visible (not screen-reader-only) */}
      {showLabel && (
        <Text accessible={false} style={[styles.label, { fontSize, color }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    // dimensions set inline
  },
  label: {
    fontWeight: '500',
  },
});
