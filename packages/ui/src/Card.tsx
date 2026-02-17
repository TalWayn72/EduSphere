import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: number;
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'elevated',
  padding = 16,
  style,
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        styles[variant],
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  outlined: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filled: {
    backgroundColor: '#f5f5f5',
  },
});
