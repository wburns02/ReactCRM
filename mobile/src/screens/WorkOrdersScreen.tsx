/**
 * Work Orders List Screen for CRM Mobile
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkOrderCard } from '../components/WorkOrderCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { useTodayWorkOrders, useCurrentTechnician } from '../api/hooks';
import { WorkOrder, WorkOrderStatus } from '../api/types';
import { colors, spacing, typography, borderRadius } from '../utils/theme';
import { useSyncStatus } from '../hooks/useOffline';

export interface WorkOrdersScreenProps {
  onWorkOrderPress: (workOrder: WorkOrder) => void;
  onSettingsPress: () => void;
}

type FilterType = 'all' | 'pending' | 'in_progress' | 'completed';

export function WorkOrdersScreen({ onWorkOrderPress, onSettingsPress }: WorkOrdersScreenProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const { data: technician } = useCurrentTechnician();
  const {
    data: workOrders,
    isLoading,
    isRefetching,
    refetch,
  } = useTodayWorkOrders(technician?.id);
  const syncStatus = useSyncStatus();

  // Filter work orders
  const filteredOrders = workOrders?.filter((wo) => {
    if (filter === 'all') return true;
    if (filter === 'pending') {
      return wo.status === WorkOrderStatus.SCHEDULED || wo.status === WorkOrderStatus.DRAFT;
    }
    if (filter === 'in_progress') return wo.status === WorkOrderStatus.IN_PROGRESS;
    if (filter === 'completed') return wo.status === WorkOrderStatus.COMPLETED;
    return true;
  }) || [];

  // Get counts for filter badges
  const counts = {
    all: workOrders?.length || 0,
    pending: workOrders?.filter(
      (wo) => wo.status === WorkOrderStatus.SCHEDULED || wo.status === WorkOrderStatus.DRAFT
    ).length || 0,
    in_progress: workOrders?.filter(
      (wo) => wo.status === WorkOrderStatus.IN_PROGRESS
    ).length || 0,
    completed: workOrders?.filter(
      (wo) => wo.status === WorkOrderStatus.COMPLETED
    ).length || 0,
  };

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderWorkOrder = useCallback(
    ({ item }: { item: WorkOrder }) => (
      <WorkOrderCard
        workOrder={item}
        onPress={() => onWorkOrderPress(item)}
      />
    ),
    [onWorkOrderPress]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>
        {filter === 'all' ? 'No work orders today' : `No ${filter.replace('_', ' ')} orders`}
      </Text>
      <Text style={styles.emptySubtitle}>
        Pull down to refresh or check back later
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Offline Banner */}
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {technician?.first_name || 'Technician'}
          </Text>
          <Text style={styles.title}>Today's Work Orders</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={onSettingsPress}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Status */}
      {!syncStatus.isHealthy && (
        <View style={[styles.syncBanner, { backgroundColor: syncStatus.status === 'offline' ? colors.warning : colors.danger }]}>
          <Text style={styles.syncText}>{syncStatus.message}</Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FilterTab
          label="All"
          count={counts.all}
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <FilterTab
          label="Pending"
          count={counts.pending}
          active={filter === 'pending'}
          onPress={() => setFilter('pending')}
        />
        <FilterTab
          label="In Progress"
          count={counts.in_progress}
          active={filter === 'in_progress'}
          onPress={() => setFilter('in_progress')}
        />
        <FilterTab
          label="Done"
          count={counts.completed}
          active={filter === 'completed'}
          onPress={() => setFilter('completed')}
        />
      </View>

      {/* Work Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderWorkOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

interface FilterTabProps {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}

function FilterTab({ label, count, active, onPress }: FilterTabProps) {
  return (
    <TouchableOpacity
      style={[styles.filterTab, active && styles.filterTabActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
          <Text style={[styles.filterCount, active && styles.filterCountActive]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  greeting: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  settingsIcon: {
    fontSize: 24,
  },
  syncBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  syncText: {
    ...typography.bodySmall,
    color: colors.white,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterLabelActive: {
    color: colors.white,
  },
  filterBadge: {
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterCount: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterCountActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
