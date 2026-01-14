/**
 * Work Order Card component for CRM Mobile
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { Card } from './Card';
import { Badge } from './Badge';
import { WorkOrder, JOB_TYPE_LABELS } from '../api/types';
import { colors, spacing, typography, statusColors } from '../utils/theme';
import { formatTime, formatAddress } from '../utils/formatters';

export interface WorkOrderCardProps extends Omit<TouchableOpacityProps, 'children'> {
  workOrder: WorkOrder;
  showCustomer?: boolean;
  showAddress?: boolean;
  compact?: boolean;
}

export function WorkOrderCard({
  workOrder,
  showCustomer = true,
  showAddress = true,
  compact = false,
  ...props
}: WorkOrderCardProps) {
  const customerName =
    workOrder.customer_name ||
    (workOrder.customer
      ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
      : `Customer #${workOrder.customer_id}`);

  const address = formatAddress(workOrder);
  const timeWindow = formatTime(workOrder.time_window_start, workOrder.time_window_end);
  const statusStyle = statusColors[workOrder.status] || statusColors.draft;

  return (
    <TouchableOpacity activeOpacity={0.7} {...props}>
      <Card style={compact ? styles.compactCard : styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderId}>#{workOrder.id}</Text>
            <Badge
              label={workOrder.status.replace('_', ' ')}
              color={statusStyle.text}
              backgroundColor={statusStyle.bg}
            />
          </View>
          {workOrder.priority && workOrder.priority !== 'normal' && (
            <Badge
              label={workOrder.priority}
              color={workOrder.priority === 'urgent' ? colors.danger : colors.warning}
              backgroundColor={workOrder.priority === 'urgent' ? '#fed7d7' : '#feebc8'}
            />
          )}
        </View>

        {/* Job Type */}
        <Text style={styles.jobType}>
          {JOB_TYPE_LABELS[workOrder.job_type] || workOrder.job_type}
        </Text>

        {/* Customer Name */}
        {showCustomer && <Text style={styles.customerName}>{customerName}</Text>}

        {/* Time Window */}
        {timeWindow && (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🕐</Text>
            <Text style={styles.infoText}>{timeWindow}</Text>
          </View>
        )}

        {/* Address */}
        {showAddress && address && (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText} numberOfLines={2}>
              {address}
            </Text>
          </View>
        )}

        {/* Notes preview */}
        {!compact && workOrder.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {workOrder.notes}
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  compactCard: {
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderId: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  jobType: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  customerName: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  notes: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
