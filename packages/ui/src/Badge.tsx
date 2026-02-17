import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  label,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
}: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], styles[size], style]}>
      <Text style={[styles.text, styles[`${size}Text`], textStyle]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  // Variants
  primary: {
    backgroundColor: '#007AFF',
  },
  success: {
    backgroundColor: '#34C759',
  },
  warning: {
    backgroundColor: '#FF9500',
  },
  error: {
    backgroundColor: '#FF3B30',
  },
  info: {
    backgroundColor: '#5856D6',
  },
  // Sizes
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  // Text
  text: {
    color: '#fff',
    fontWeight: '600',
  },
  smText: {
    fontSize: 10,
  },
  mdText: {
    fontSize: 12,
  },
});
