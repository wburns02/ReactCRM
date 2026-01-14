/**
 * Theme constants for CRM Mobile
 * Matches the web app's color scheme
 */

export const colors = {
  // Brand colors
  primary: '#1a365d',
  primaryLight: '#2c5282',
  primaryDark: '#153e75',

  // Status colors
  success: '#38a169',
  warning: '#d69e2e',
  danger: '#e53e3e',
  info: '#3182ce',

  // Neutral colors
  white: '#ffffff',
  black: '#000000',
  background: '#f7fafc',
  surface: '#ffffff',
  border: '#e2e8f0',

  // Text colors
  textPrimary: '#1a202c',
  textSecondary: '#4a5568',
  textMuted: '#a0aec0',
  textInverse: '#ffffff',

  // Semantic colors
  offline: '#d69e2e',
  syncing: '#3182ce',
  error: '#e53e3e',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Work order status colors
export const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#e2e8f0', text: '#4a5568' },
  scheduled: { bg: '#bee3f8', text: '#2b6cb0' },
  in_progress: { bg: '#fefcbf', text: '#744210' },
  completed: { bg: '#c6f6d5', text: '#276749' },
  cancelled: { bg: '#fed7d7', text: '#c53030' },
};

// Priority colors
export const priorityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: '#e2e8f0', text: '#4a5568' },
  normal: { bg: '#bee3f8', text: '#2b6cb0' },
  high: { bg: '#feebc8', text: '#c05621' },
  urgent: { bg: '#fed7d7', text: '#c53030' },
};
