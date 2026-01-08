/**
 * Segment Actions Hooks
 *
 * Custom hooks for segment bulk operations including export, email,
 * scheduling, tagging, and assignment.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/client.ts';
import { csKeys } from '@/api/hooks/useCustomerSuccess.ts';
import type { ExportOptions } from '@/features/customer-success/segments/ExportModal.tsx';
import type { BulkScheduleOptions } from '@/features/customer-success/segments/BulkScheduleModal.tsx';

// ============================================
// Types
// ============================================

export interface ExportResponse {
  status: string;
  message: string;
  download_url?: string;
  filename?: string;
  record_count: number;
}

export interface BulkScheduleResponse {
  status: string;
  message: string;
  work_orders_created: number;
  scheduled_date: string;
  customers_affected: number;
}

export interface BulkTagResponse {
  status: string;
  message: string;
  customers_updated: number;
  tag: string;
}

export interface BulkAssignResponse {
  status: string;
  message: string;
  customers_assigned: number;
  assigned_to_user_id: number;
  assignment_method: string;
}

export interface BulkEmailResponse {
  status: string;
  message: string;
  campaign_id?: number;
}

// ============================================
// Export Hook
// ============================================

export function useExportSegment() {
  return useMutation({
    mutationFn: async ({
      segmentId,
      options,
    }: {
      segmentId: number;
      options: ExportOptions;
    }): Promise<ExportResponse> => {
      const response = await apiClient.post(`/cs/segments/${segmentId}/export`, {
        format: options.format,
        fields: options.fields,
        include_health_score: options.includeHealthScore,
        include_contact_info: options.includeContactInfo,
        include_financials: options.includeFinancials,
        include_tags: options.includeTags,
        include_custom_fields: options.includeCustomFields,
      });
      return response.data;
    },
    onSuccess: async (data) => {
      // Trigger download if URL is provided
      if (data.download_url) {
        const link = document.createElement('a');
        link.href = data.download_url;
        link.download = data.filename || 'segment-export';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
  });
}

// ============================================
// Bulk Email Hook
// ============================================

export function useBulkEmail() {
  const navigate = useNavigate();

  return {
    openCampaignComposer: (segmentId: number, segmentName: string) => {
      // Navigate to campaign composer with segment pre-selected
      const params = new URLSearchParams({
        segment_id: String(segmentId),
        segment_name: segmentName,
        type: 'email',
      });
      navigate(`/customer-success?tab=campaigns&action=new&${params.toString()}`);
    },

    mutation: useMutation({
      mutationFn: async ({
        segmentId,
        subject,
        templateId,
      }: {
        segmentId: number;
        subject?: string;
        templateId?: number;
      }): Promise<BulkEmailResponse> => {
        const response = await apiClient.post(`/cs/segments/${segmentId}/bulk-email`, {
          subject,
          template_id: templateId,
        });
        return response.data;
      },
    }),
  };
}

// ============================================
// Bulk Schedule Hook
// ============================================

export function useBulkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      segmentId,
      options,
    }: {
      segmentId: number;
      options: BulkScheduleOptions;
    }): Promise<BulkScheduleResponse> => {
      const response = await apiClient.post(`/cs/segments/${segmentId}/bulk-schedule`, {
        scheduled_date: options.scheduledDate,
        scheduled_time: options.scheduledTime,
        service_type: options.serviceType,
        priority: options.priority,
        assignment_method: options.assignmentMethod,
        assigned_user_id: options.assignedUserId,
        notes: options.notes,
        create_work_orders: options.createWorkOrders,
        send_notifications: options.sendNotifications,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: csKeys.tasks });
      queryClient.invalidateQueries({ queryKey: csKeys.segments });
    },
  });
}

// ============================================
// Bulk Tag Hook
// ============================================

export function useBulkTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      segmentId,
      tag,
      action = 'add',
    }: {
      segmentId: number;
      tag: string;
      action?: 'add' | 'remove';
    }): Promise<BulkTagResponse> => {
      const response = await apiClient.post(`/cs/segments/${segmentId}/bulk-tag`, {
        tag,
        action,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.segmentCustomers(variables.segmentId) });
      queryClient.invalidateQueries({ queryKey: csKeys.segments });
    },
  });
}

// ============================================
// Bulk Assign Hook
// ============================================

export function useBulkAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      segmentId,
      assignedUserId,
      assignmentMethod = 'specific',
    }: {
      segmentId: number;
      assignedUserId?: number;
      assignmentMethod?: 'auto' | 'specific' | 'round_robin';
    }): Promise<BulkAssignResponse> => {
      const response = await apiClient.post(`/cs/segments/${segmentId}/bulk-assign`, {
        assigned_user_id: assignedUserId,
        assignment_method: assignmentMethod,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: csKeys.segmentCustomers(variables.segmentId) });
      queryClient.invalidateQueries({ queryKey: csKeys.segments });
    },
  });
}

// ============================================
// Create Call List Hook
// ============================================

export function useCreateCallList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      segmentId,
      name,
      priority = 'medium',
    }: {
      segmentId: number;
      name?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    }) => {
      const response = await apiClient.post(`/cs/segments/${segmentId}/create-call-list`, {
        name,
        priority,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.tasks });
    },
  });
}

// ============================================
// Bulk Tasks Hook
// ============================================

export function useBulkTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      segmentId,
      taskType,
      title,
      description,
      dueDate,
      priority = 'medium',
      assignedUserId,
    }: {
      segmentId: number;
      taskType: string;
      title: string;
      description?: string;
      dueDate?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      assignedUserId?: number;
    }) => {
      const response = await apiClient.post(`/cs/segments/${segmentId}/bulk-tasks`, {
        task_type: taskType,
        title,
        description,
        due_date: dueDate,
        priority,
        assigned_user_id: assignedUserId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.tasks });
    },
  });
}

// ============================================
// Bulk Work Orders Hook
// ============================================

export function useBulkWorkOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      segmentId,
      workOrderType,
      title,
      description,
      scheduledDate,
      priority = 'medium',
      assignedUserId,
    }: {
      segmentId: number;
      workOrderType: string;
      title: string;
      description?: string;
      scheduledDate?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      assignedUserId?: number;
    }) => {
      const response = await apiClient.post(`/cs/segments/${segmentId}/bulk-work-orders`, {
        work_order_type: workOrderType,
        title,
        description,
        scheduled_date: scheduledDate,
        priority,
        assigned_user_id: assignedUserId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: csKeys.tasks });
    },
  });
}

// ============================================
// Launch Campaign Hook
// ============================================

export function useLaunchCampaignForSegment() {
  const navigate = useNavigate();

  return {
    openCampaignLauncher: (segmentId: number, segmentName: string) => {
      const params = new URLSearchParams({
        segment_id: String(segmentId),
        segment_name: segmentName,
        action: 'launch',
      });
      navigate(`/customer-success?tab=campaigns&${params.toString()}`);
    },
  };
}

// ============================================
// Combined Hook for All Segment Actions
// ============================================

export function useSegmentActions(segmentId: number, segmentName: string) {
  const exportMutation = useExportSegment();
  const bulkEmail = useBulkEmail();
  const bulkSchedule = useBulkSchedule();
  const bulkTag = useBulkTag();
  const bulkAssign = useBulkAssign();
  const createCallList = useCreateCallList();
  const bulkTasks = useBulkTasks();
  const bulkWorkOrders = useBulkWorkOrders();
  const launchCampaign = useLaunchCampaignForSegment();

  return {
    // Export
    exportSegment: (options: ExportOptions) =>
      exportMutation.mutateAsync({ segmentId, options }),
    isExporting: exportMutation.isPending,

    // Email
    openEmailComposer: () => bulkEmail.openCampaignComposer(segmentId, segmentName),

    // Schedule
    scheduleService: (options: BulkScheduleOptions) =>
      bulkSchedule.mutateAsync({ segmentId, options }),
    isScheduling: bulkSchedule.isPending,

    // Tag
    addTag: (tag: string) => bulkTag.mutateAsync({ segmentId, tag, action: 'add' }),
    removeTag: (tag: string) => bulkTag.mutateAsync({ segmentId, tag, action: 'remove' }),
    isTagging: bulkTag.isPending,

    // Assign
    assignToRep: (userId?: number, method?: 'auto' | 'specific' | 'round_robin') =>
      bulkAssign.mutateAsync({ segmentId, assignedUserId: userId, assignmentMethod: method }),
    isAssigning: bulkAssign.isPending,

    // Call List
    createCallList: (name?: string, priority?: 'low' | 'medium' | 'high' | 'critical') =>
      createCallList.mutateAsync({ segmentId, name, priority }),
    isCreatingCallList: createCallList.isPending,

    // Tasks
    createTasks: (params: Omit<Parameters<typeof bulkTasks.mutateAsync>[0], 'segmentId'>) =>
      bulkTasks.mutateAsync({ segmentId, ...params }),
    isCreatingTasks: bulkTasks.isPending,

    // Work Orders
    createWorkOrders: (params: Omit<Parameters<typeof bulkWorkOrders.mutateAsync>[0], 'segmentId'>) =>
      bulkWorkOrders.mutateAsync({ segmentId, ...params }),
    isCreatingWorkOrders: bulkWorkOrders.isPending,

    // Campaign
    openCampaignLauncher: () => launchCampaign.openCampaignLauncher(segmentId, segmentName),
  };
}
