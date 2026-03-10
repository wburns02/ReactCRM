/**
 * Work Order Detail Screen for CRM Mobile
 * Shows full work order details with action buttons
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { OfflineBanner } from '../components/OfflineBanner';
import {
  useWorkOrder,
  useStartWorkOrder,
  useUpdateWorkOrderStatus,
} from '../api/hooks';
import { WorkOrder, WorkOrderStatus, JOB_TYPE_LABELS } from '../api/types';
import { colors, spacing, typography, borderRadius, statusColors } from '../utils/theme';
import {
  formatDate,
  formatTime,
  formatAddress,
  formatPhone,
  formatDuration,
} from '../utils/formatters';

export interface WorkOrderDetailScreenProps {
  workOrder: WorkOrder;
  onBack: () => void;
  onStartCompletion: (workOrder: WorkOrder) => void;
}

export function WorkOrderDetailScreen({
  workOrder: initialWorkOrder,
  onBack,
  onStartCompletion,
}: WorkOrderDetailScreenProps) {
  const { data: workOrder, isLoading } = useWorkOrder(initialWorkOrder.id);
  const startWorkOrder = useStartWorkOrder();
  const updateStatus = useUpdateWorkOrderStatus();

  const wo = workOrder || initialWorkOrder;
  const statusStyle = statusColors[wo.status] || statusColors.draft;

  const customerName =
    wo.customer_name ||
    (wo.customer
      ? `${wo.customer.first_name} ${wo.customer.last_name}`
      : `Customer #${wo.customer_id}`);

  const address = formatAddress(wo);
  const timeWindow = formatTime(wo.time_window_start, wo.time_window_end);

  const handleStartWork = async () => {
    try {
      await startWorkOrder.mutateAsync(wo.id);
      Alert.alert('Started', 'Work order is now in progress.');
    } catch (error) {
      Alert.alert('Error', 'Failed to start work order. Please try again.');
    }
  };

  const handleNavigate = () => {
    if (wo.service_latitude && wo.service_longitude) {
      const url = Platform.select({
        ios: `maps:0,0?q=${wo.service_latitude},${wo.service_longitude}`,
        android: `geo:${wo.service_latitude},${wo.service_longitude}?q=${wo.service_latitude},${wo.service_longitude}`,
      });
      if (url) Linking.openURL(url);
    } else if (address) {
      const encodedAddress = encodeURIComponent(address.replace(/\n/g, ', '));
      const url = Platform.select({
        ios: `maps:0,0?q=${encodedAddress}`,
        android: `geo:0,0?q=${encodedAddress}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  const handleCallCustomer = () => {
    const phone = wo.customer?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
    } else {
      Alert.alert('No Phone', 'No phone number on file for this customer.');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Work Order',
      'Are you sure you want to cancel this work order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({
                id: wo.id,
                status: WorkOrderStatus.CANCELLED,
              });
              onBack();
            } catch {
              Alert.alert('Error', 'Failed to cancel work order.');
            }
          },
        },
      ]
    );
  };

  const canStart =
    wo.status === WorkOrderStatus.SCHEDULED || wo.status === WorkOrderStatus.DRAFT;
  const canComplete = wo.status === WorkOrderStatus.IN_PROGRESS;
  const isActive =
    wo.status !== WorkOrderStatus.COMPLETED &&
    wo.status !== WorkOrderStatus.CANCELLED;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work Order #{wo.id}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: statusStyle.bg },
          ]}
        >
          <Badge
            label={wo.status.replace('_', ' ')}
            color={statusStyle.text}
            backgroundColor={statusStyle.bg}
            size="md"
          />
          {wo.priority && wo.priority !== 'normal' && (
            <Badge
              label={wo.priority}
              color={wo.priority === 'urgent' ? colors.danger : colors.warning}
              backgroundColor={wo.priority === 'urgent' ? '#fed7d7' : '#feebc8'}
              size="md"
            />
          )}
        </View>

        {/* Job Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <InfoRow
            label="Type"
            value={JOB_TYPE_LABELS[wo.job_type] || wo.job_type}
          />
          <InfoRow label="Scheduled" value={formatDate(wo.scheduled_date)} />
          {timeWindow ? (
            <InfoRow label="Time Window" value={timeWindow} />
          ) : null}
          {wo.estimated_duration_hours ? (
            <InfoRow
              label="Est. Duration"
              value={formatDuration(wo.estimated_duration_hours)}
            />
          ) : null}
          {wo.assigned_technician_name ? (
            <InfoRow label="Technician" value={wo.assigned_technician_name} />
          ) : null}
        </Card>

        {/* Customer Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.customerName}>{customerName}</Text>
          {wo.customer?.phone ? (
            <TouchableOpacity onPress={handleCallCustomer} style={styles.phoneRow}>
              <Text style={styles.phoneIcon}>Phone: </Text>
              <Text style={styles.phoneNumber}>
                {formatPhone(wo.customer.phone)}
              </Text>
            </TouchableOpacity>
          ) : null}
          {wo.customer?.email ? (
            <InfoRow label="Email" value={wo.customer.email} />
          ) : null}
        </Card>

        {/* Location */}
        {address ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Service Location</Text>
            <Text style={styles.addressText}>{address}</Text>
            <Button
              variant="secondary"
              size="md"
              onPress={handleNavigate}
              style={styles.navigateButton}
            >
              Open in Maps
            </Button>
          </Card>
        ) : null}

        {/* Notes */}
        {wo.notes ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{wo.notes}</Text>
          </Card>
        ) : null}

        {/* Completion Info */}
        {wo.status === WorkOrderStatus.COMPLETED && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Details</Text>
            {wo.actual_duration_hours ? (
              <InfoRow
                label="Actual Duration"
                value={formatDuration(wo.actual_duration_hours)}
              />
            ) : null}
            {wo.completion_notes ? (
              <>
                <Text style={styles.subLabel}>Completion Notes</Text>
                <Text style={styles.notesText}>{wo.completion_notes}</Text>
              </>
            ) : null}
          </Card>
        )}

        {/* Action Buttons */}
        {isActive && (
          <View style={styles.actions}>
            {canStart && (
              <Button
                variant="primary"
                size="lg"
                onPress={handleStartWork}
                loading={startWorkOrder.isPending}
                style={styles.actionButton}
              >
                Start Work
              </Button>
            )}

            {canComplete && (
              <Button
                variant="primary"
                size="lg"
                onPress={() => onStartCompletion(wo)}
                style={styles.actionButton}
              >
                Complete Work Order
              </Button>
            )}

            <Button
              variant="danger"
              size="md"
              onPress={handleCancel}
              loading={updateStatus.isPending}
              style={styles.actionButton}
            >
              Cancel Work Order
            </Button>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  headerRight: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  customerName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  phoneIcon: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  phoneNumber: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  subLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  addressText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  navigateButton: {
    marginTop: spacing.xs,
  },
  notesText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
