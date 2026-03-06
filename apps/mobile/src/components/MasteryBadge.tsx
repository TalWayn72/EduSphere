import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT } from '../lib/theme';

export type MasteryLevel =
  | 'none'
  | 'attempted'
  | 'familiar'
  | 'proficient'
  | 'mastered';

interface MasteryBadgeProps {
  level: MasteryLevel;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const LEVEL_COLOR: Record<MasteryLevel, string> = {
  none: COLORS.masteryNone,
  attempted: COLORS.masteryAttempted,
  familiar: COLORS.masteryFamiliar,
  proficient: COLORS.masteryProficient,
  mastered: COLORS.masteryMastered,
};

const LEVEL_LABEL: Record<MasteryLevel, string> = {
  none: 'Not Started',
  attempted: 'Attempted',
  familiar: 'Familiar',
  proficient: 'Proficient',
  mastered: 'Mastered',
};

export function MasteryBadge({
  level,
  size = 'md',
  showLabel = false,
}: MasteryBadgeProps) {
  const isSm = size === 'sm';
  const dotSize = isSm ? 8 : 10;
  const fontSize = isSm ? FONT.xs : FONT.sm;
  const color = LEVEL_COLOR[level];

  return (
    <View testID={`mastery-badge-${level}`} style={styles.container}>
      <View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color },
        ]}
      />
      {showLabel && (
        <Text style={[styles.label, { fontSize, color }]}>
          {LEVEL_LABEL[level]}
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
