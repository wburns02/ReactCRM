/**
 * Feature Flags and Configuration
 *
 * react.ecbtx.com is a 100% React environment.
 * Legacy jQuery frontend (crm.ecbtx.com) remains separate and functional.
 */

/**
 * Feature flags for controlling optional features
 * All core features are now React-only, these control future/optional capabilities
 */
export const FEATURE_FLAGS = {
  // Marketing features
  emailMarketing: true,
  smsNotifications: false, // Future feature

  // Advanced features
  advancedReporting: true,
} as const;
