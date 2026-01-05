/**
 * Card component for CRM Mobile
 */
import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { colors, shadows, borderRadius, spacing } from '../utils/theme';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'outlined';
  children: React.ReactNode;
}

export function Card({ variant = 'default', style, children, ...props }: CardProps) {
  const cardStyles: ViewStyle[] = [
    styles.base,
    variant === 'default' ? styles.default : styles.outlined,
    style as ViewStyle,
  ];

  return (
    <View style={cardStyles} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  default: {
    ...shadows.md,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
});
