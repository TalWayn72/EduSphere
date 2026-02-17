import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';

export interface AvatarProps {
  name?: string;
  uri?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
}

export function Avatar({
  name,
  uri,
  size = 40,
  backgroundColor = '#007AFF',
  textColor = '#fff',
  style,
}: AvatarProps) {
  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              fontSize: size * 0.4,
              color: textColor,
            },
          ]}
        >
          {initials || '?'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  text: {
    fontWeight: 'bold',
  },
});
