import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT } from '../lib/theme';

export interface DayData {
  label: string;
  count: number;
}

interface WeeklyActivityBarProps {
  data: DayData[];
  maxCount?: number;
}

export function calcBarHeightPercent(count: number, maxCount: number): number {
  if (maxCount <= 0) return 0;
  return Math.min((count / maxCount) * 100, 100);
}

export const WeeklyActivityBar: React.FC<WeeklyActivityBarProps> = ({
  data,
  maxCount = 5,
}) => {
  const todayIndex = new Date().getDay(); // 0=Sun

  return (
    <View style={styles.container} testID="weekly-activity-bar">
      <View style={styles.barsRow}>
        {data.map((day, index) => {
          const heightPct = calcBarHeightPercent(day.count, maxCount);
          const isToday = index === todayIndex;
          return (
            <View key={day.label} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: isToday
                        ? COLORS.primary
                        : COLORS.masteryFamiliar,
                    },
                  ]}
                  testID={`bar-${day.label}`}
                />
              </View>
              <Text
                style={[
                  styles.dayLabel,
                  isToday && styles.dayLabelToday,
                ]}
              >
                {day.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: SPACING.md },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 72,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barTrack: {
    width: 16,
    height: 56,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 4 },
  dayLabel: {
    marginTop: SPACING.xs,
    fontSize: FONT.xs,
    color: COLORS.textMuted,
  },
  dayLabelToday: {
    color: COLORS.primary,
    fontWeight: FONT.semibold,
  },
});
