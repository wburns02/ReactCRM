/**
 * Badge component for CRM Mobile
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, spacing, typography } from '../utils/theme';

export interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
}

export function Badge({
  label,
  color = colors.textSecondary,
  backgroundColor = colors.border,
  size = 'sm',
}: BadgeProps) {
  const containerStyle: ViewStyle = {
    ...styles.container,
    ...(size === 'sm' ? styles.sm : styles.md),
    backgroundColor,
  };

  const textStyle: TextStyle = {
    ...styles.text,
    ...(size === 'sm' ? styles.smText : styles.mdText),
    color,
  };

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  smText: {
    fontSize: 10,
  },
  mdText: {
    fontSize: 12,
  },
});
