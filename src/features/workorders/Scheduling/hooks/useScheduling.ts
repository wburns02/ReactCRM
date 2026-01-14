/**
 * Scheduling Hooks
 * Custom hooks for scheduling-related operations
 */

import { useMemo } from "react";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";
import type {
  WorkOrder,
  SchedulingConflict,
  SchedulingSuggestion,
} from "@/api/types/workOrder.ts";
import {
  detectConflicts,
  findOptimalSlot,
  getAvailableSlots,
  calculateTechnicianUtilization,
} from "../utils/scheduleOptimizer.ts";
import { format, eachDayOfInterval, parseISO } from "date-fns";

/**
 * Query keys for scheduling
 */
export const schedulingKeys = {
  all: ["scheduling"] as const,
  availability: (date: string, technicianId?: string) =>
    [...schedulingKeys.all, "availability", date, technicianId] as const,
  conflicts: (workOrderId: string) =>
    [...schedulingKeys.all, "conflicts", workOrderId] as const,
  capacity: (startDate: string, endDate: string) =>
    [...schedulingKeys.all, "capacity", startDate, endDate] as const,
};

/**
 * Hook to get available time slots for a specific date and optional technician
 */
export function useAvailableSlots(date: string, technicianId?: string) {
  const { data: workOrdersData } = useWorkOrders({ page: 1, page_size: 500 });
  const { data: techniciansData } = useTechnicians();

  const technicianName = useMemo(() => {
    if (!technicianId || !techniciansData?.items) return undefined;
    const tech = techniciansData.items.find((t) => t.id === technicianId);
    return tech
      ? tech.full_name || `${tech.first_name} ${tech.last_name}`
      : undefined;
  }, [technicianId, techniciansData]);

  const slots = useMemo(() => {
    if (!workOrdersData?.items) return [];
    return getAvailableSlots(date, technicianName, workOrdersData.items);
  }, [date, technicianName, workOrdersData]);

  return {
    slots,
    isLoading: !workOrdersData,
  };
}

/**
 * Hook to detect scheduling conflicts for a work order
 */
export function useConflicts(workOrder: WorkOrder | null) {
  const { data: workOrdersData } = useWorkOrders({ page: 1, page_size: 500 });
  const { data: techniciansData } = useTechnicians();

  const conflicts = useMemo((): SchedulingConflict[] => {
    if (!workOrder || !workOrdersData?.items) return [];
    return detectConflicts(
      workOrder,
      workOrdersData.items,
      techniciansData?.items,
    );
  }, [workOrder, workOrdersData, techniciansData]);

  return {
    conflicts,
    hasErrors: conflicts.some((c) => c.severity === "error"),
    hasWarnings: conflicts.some((c) => c.severity === "warning"),
  };
}

/**
 * Hook to calculate technician capacity/utilization for a date range
 */
export function useTechnicianCapacity(startDate: string, endDate: string) {
  const { data: workOrdersData, isLoading: woLoading } = useWorkOrders({
    page: 1,
    page_size: 500,
  });
  const { data: techniciansData, isLoading: techLoading } = useTechnicians();

  const capacityData = useMemo(() => {
    if (!workOrdersData?.items || !techniciansData?.items) return [];

    const activeTechnicians = techniciansData.items.filter((t) => t.is_active);

    return activeTechnicians.map((tech) => {
      const techName = tech.full_name || `${tech.first_name} ${tech.last_name}`;
      const utilization = calculateTechnicianUtilization(
        techName,
        workOrdersData.items,
        startDate,
        endDate,
      );

      return {
        technician: tech,
        technicianName: techName,
        days: utilization,
        averageUtilization:
          utilization.reduce((sum, d) => sum + d.utilization, 0) /
          utilization.length,
        totalJobs: utilization.reduce((sum, d) => sum + d.jobCount, 0),
      };
    });
  }, [workOrdersData, techniciansData, startDate, endDate]);

  return {
    data: capacityData,
    isLoading: woLoading || techLoading,
    dates: useMemo(() => {
      return eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate),
      }).map((d) => format(d, "yyyy-MM-dd"));
    }, [startDate, endDate]),
  };
}

/**
 * Hook to get smart scheduling suggestions
 */
export function useSchedulingSuggestions(
  workOrder: WorkOrder | null,
  targetDate: string,
) {
  const { data: workOrdersData } = useWorkOrders({ page: 1, page_size: 500 });
  const { data: techniciansData } = useTechnicians();

  const suggestions = useMemo((): SchedulingSuggestion[] => {
    if (!workOrder || !workOrdersData?.items || !techniciansData?.items) {
      return [];
    }

    return findOptimalSlot(
      workOrder,
      techniciansData.items,
      workOrdersData.items,
      targetDate,
    );
  }, [workOrder, workOrdersData, techniciansData, targetDate]);

  return {
    suggestions,
    topSuggestion: suggestions[0] || null,
    isLoading: !workOrdersData || !techniciansData,
  };
}

/**
 * Hook to get work orders for a specific date range (calendar view)
 */
export function useCalendarWorkOrders(_startDate: string, _endDate: string) {
  const { data, isLoading, error } = useWorkOrders({ page: 1, page_size: 500 });

  const workOrdersByDate = useMemo(() => {
    if (!data?.items) return new Map<string, WorkOrder[]>();

    const map = new Map<string, WorkOrder[]>();

    data.items.forEach((wo) => {
      if (wo.scheduled_date) {
        const existing = map.get(wo.scheduled_date) || [];
        existing.push(wo);
        map.set(wo.scheduled_date, existing);
      }
    });

    return map;
  }, [data]);

  const getWorkOrdersForDate = (date: string): WorkOrder[] => {
    return workOrdersByDate.get(date) || [];
  };

  return {
    workOrders: data?.items || [],
    workOrdersByDate,
    getWorkOrdersForDate,
    isLoading,
    error,
  };
}

/**
 * Hook to get work orders for a technician on a specific day
 */
export function useTechnicianDaySchedule(technicianName: string, date: string) {
  const { data, isLoading } = useWorkOrders({ page: 1, page_size: 500 });

  const schedule = useMemo(() => {
    if (!data?.items) return [];

    return data.items
      .filter(
        (wo) =>
          wo.scheduled_date === date &&
          wo.assigned_technician === technicianName,
      )
      .sort((a, b) => {
        if (!a.time_window_start) return 1;
        if (!b.time_window_start) return -1;
        return a.time_window_start.localeCompare(b.time_window_start);
      });
  }, [data, technicianName, date]);

  const totalHours = useMemo(() => {
    return schedule.reduce(
      (sum, wo) => sum + (wo.estimated_duration_hours || 1),
      0,
    );
  }, [schedule]);

  return {
    schedule,
    totalHours,
    jobCount: schedule.length,
    isLoading,
  };
}

/**
 * Hook to get unscheduled work orders count by priority
 */
export function useUnscheduledStats() {
  const { data, isLoading } = useWorkOrders({ page: 1, page_size: 500 });

  const stats = useMemo(() => {
    if (!data?.items) {
      return {
        total: 0,
        emergency: 0,
        urgent: 0,
        high: 0,
        normal: 0,
        low: 0,
      };
    }

    const unscheduled = data.items.filter(
      (wo) => !wo.scheduled_date || wo.status === "draft",
    );

    return {
      total: unscheduled.length,
      emergency: unscheduled.filter((wo) => wo.priority === "emergency").length,
      urgent: unscheduled.filter((wo) => wo.priority === "urgent").length,
      high: unscheduled.filter((wo) => wo.priority === "high").length,
      normal: unscheduled.filter((wo) => wo.priority === "normal").length,
      low: unscheduled.filter((wo) => wo.priority === "low").length,
    };
  }, [data]);

  return {
    ...stats,
    isLoading,
  };
}

/**
 * Hook to get recurring schedule information
 */
export function useRecurringSchedule(customerId: string) {
  const { data, isLoading } = useWorkOrders({ page: 1, page_size: 100 });

  const recurringJobs = useMemo(() => {
    if (!data?.items) return [];

    // Find completed jobs for this customer to detect patterns
    return data.items
      .filter(
        (wo) =>
          wo.customer_id === customerId &&
          wo.status === "completed" &&
          wo.scheduled_date,
      )
      .sort((a, b) => {
        if (!a.scheduled_date || !b.scheduled_date) return 0;
        return a.scheduled_date.localeCompare(b.scheduled_date);
      });
  }, [data, customerId]);

  // Detect scheduling pattern
  const detectedPattern = useMemo(() => {
    if (recurringJobs.length < 2) return null;

    const intervals: number[] = [];
    for (let i = 1; i < recurringJobs.length; i++) {
      const prev = parseISO(recurringJobs[i - 1].scheduled_date!);
      const curr = parseISO(recurringJobs[i].scheduled_date!);
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
      );
      intervals.push(diffDays);
    }

    if (intervals.length === 0) return null;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Detect common patterns
    if (avgInterval >= 350 && avgInterval <= 380) {
      return {
        frequency: "yearly" as const,
        interval: 1,
        avgDays: avgInterval,
      };
    }
    if (avgInterval >= 85 && avgInterval <= 95) {
      return {
        frequency: "quarterly" as const,
        interval: 3,
        avgDays: avgInterval,
      };
    }
    if (avgInterval >= 28 && avgInterval <= 32) {
      return {
        frequency: "monthly" as const,
        interval: 1,
        avgDays: avgInterval,
      };
    }
    if (avgInterval >= 12 && avgInterval <= 16) {
      return {
        frequency: "biweekly" as const,
        interval: 2,
        avgDays: avgInterval,
      };
    }
    if (avgInterval >= 5 && avgInterval <= 9) {
      return {
        frequency: "weekly" as const,
        interval: 1,
        avgDays: avgInterval,
      };
    }

    return null;
  }, [recurringJobs]);

  return {
    recurringJobs,
    detectedPattern,
    isLoading,
  };
}
