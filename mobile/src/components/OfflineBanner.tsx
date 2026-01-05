/**
 * Offline Banner component for CRM Mobile
 * Shows connection status and pending sync count
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useOffline, useSyncStatus } from '../hooks/useOffline';
import { colors, spacing, typography } from '../utils/theme';

export function OfflineBanner() {
  const {
    isOnline,
    isInitialized,
    isSyncing,
    pendingCount,
    syncNow,
  } = useOffline();
  const [syncError, setSyncError] = useState<string | null>(null);

  // Don't render until initialized
  if (!isInitialized) {
    return null;
  }

  // Don't show anything if online with no pending items
  if (isOnline && pendingCount === 0 && !syncError && !isSyncing) {
    return null;
  }

  const handleSync = async () => {
    setSyncError(null);
    const result = await syncNow();
    if (result.errors.length > 0) {
      setSyncError(result.errors.join(', '));
    }
  };

  // Offline banner
  if (!isOnline) {
    return (
      <View style={[styles.banner, styles.offlineBanner]}>
        <Text style={styles.bannerText}>
          You are offline. Changes will sync when connection is restored.
        </Text>
      </View>
    );
  }

  // Syncing banner
  if (isSyncing) {
    return (
      <View style={[styles.banner, styles.syncingBanner]}>
        <ActivityIndicator color={colors.white} size="small" />
        <Text style={[styles.bannerText, { marginLeft: spacing.sm }]}>
          Syncing changes...
        </Text>
      </View>
    );
  }

  // Error banner
  if (syncError) {
    return (
      <View style={[styles.banner, styles.errorBanner]}>
        <Text style={styles.bannerText}>Sync failed: {syncError}</Text>
        <TouchableOpacity onPress={() => setSyncError(null)} style={styles.dismissButton}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Pending changes banner
  if (pendingCount > 0) {
    return (
      <View style={[styles.banner, styles.pendingBanner]}>
        <Text style={styles.bannerText}>
          {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}
        </Text>
        <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

/**
 * Compact offline indicator for headers/nav
 */
export function CompactOfflineIndicator() {
  const { isOnline, pendingCount, isSyncing } = useOffline();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <View style={styles.compact}>
      {!isOnline && (
        <View style={[styles.dot, styles.offlineDot]} />
      )}
      {isSyncing && (
        <ActivityIndicator color={colors.primary} size="small" />
      )}
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  offlineBanner: {
    backgroundColor: colors.warning,
  },
  syncingBanner: {
    backgroundColor: colors.primary,
  },
  errorBanner: {
    backgroundColor: colors.danger,
    justifyContent: 'space-between',
  },
  pendingBanner: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'space-between',
  },
  bannerText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '500',
    flex: 1,
  },
  dismissButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dismissText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  syncButtonText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  // Compact styles
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  offlineDot: {
    backgroundColor: colors.warning,
  },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
});
