/**
 * Schedule Optimizer Utilities
 * Optimization algorithms for scheduling work orders
 */

import type {
  WorkOrder,
  SchedulingConflict,
  SchedulingSuggestion,
} from "@/api/types/workOrder.ts";
import type { Technician } from "@/api/types/technician.ts";
import {
  parseISO,
  format,
  addMinutes,
  isWithinInterval,
  differenceInMinutes,
} from "date-fns";

/**
 * Calculate travel time between two coordinates (Haversine formula)
 * Returns estimated minutes based on average driving speed
 */
export function calculateTravelTime(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  avgSpeedMph: number = 35,
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in miles

  // Convert to minutes based on average speed
  const travelTimeHours = distance / avgSpeedMph;
  return Math.ceil(travelTimeHours * 60);
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates (in miles)
 */
export function calculateDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Detect scheduling conflicts for a work order
 */
export function detectConflicts(
  workOrder: WorkOrder,
  allWorkOrders: WorkOrder[],
  _technicians?: Technician[],
): SchedulingConflict[] {
  const conflicts: SchedulingConflict[] = [];

  if (!workOrder.scheduled_date) return conflicts;

  const woDate = workOrder.scheduled_date;
  const woStart = workOrder.time_window_start;
  const woDuration = workOrder.estimated_duration_hours || 1;

  // Filter work orders for same date and technician
  const sameDayOrders = allWorkOrders.filter(
    (wo) =>
      wo.id !== workOrder.id &&
      wo.scheduled_date === woDate &&
      wo.assigned_technician === workOrder.assigned_technician &&
      workOrder.assigned_technician, // Only check if technician is assigned
  );

  // Check for time overlaps
  sameDayOrders.forEach((other) => {
    if (!woStart || !other.time_window_start) return;

    const woStartTime = parseTimeString(woStart);
    const woEndTime = addMinutes(woStartTime, woDuration * 60);
    const otherStartTime = parseTimeString(other.time_window_start);
    const otherDuration = other.estimated_duration_hours || 1;
    const otherEndTime = addMinutes(otherStartTime, otherDuration * 60);

    // Check for overlap
    if (
      isWithinInterval(woStartTime, {
        start: otherStartTime,
        end: otherEndTime,
      }) ||
      isWithinInterval(otherStartTime, { start: woStartTime, end: woEndTime })
    ) {
      conflicts.push({
        type: "overlap",
        workOrderId: other.id,
        technicianId: workOrder.assigned_technician || undefined,
        message: `Overlaps with work order for ${other.customer_name || "Customer #" + other.customer_id}`,
        severity: "error",
      });
    }

    // Check for tight travel time between jobs
    if (
      workOrder.service_latitude &&
      workOrder.service_longitude &&
      other.service_latitude &&
      other.service_longitude
    ) {
      const travelTime = calculateTravelTime(
        { lat: other.service_latitude, lng: other.service_longitude },
        { lat: workOrder.service_latitude, lng: workOrder.service_longitude },
      );

      const gapMinutes = differenceInMinutes(woStartTime, otherEndTime);

      if (gapMinutes > 0 && gapMinutes < travelTime) {
        conflicts.push({
          type: "travel_time",
          workOrderId: other.id,
          technicianId: workOrder.assigned_technician || undefined,
          message: `Insufficient travel time (${gapMinutes}min available, ${travelTime}min needed)`,
          severity: "warning",
        });
      }
    }
  });

  // Check technician capacity (max jobs per day)
  const technicianJobCount = sameDayOrders.length + 1;
  if (technicianJobCount > 8) {
    conflicts.push({
      type: "capacity",
      workOrderId: workOrder.id,
      technicianId: workOrder.assigned_technician || undefined,
      message: `Technician has ${technicianJobCount} jobs scheduled (high workload)`,
      severity: "warning",
    });
  }

  return conflicts;
}

/**
 * Parse time string (HH:mm or HH:mm:ss) to Date
 */
function parseTimeString(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Find optimal slot for a work order
 */
export function findOptimalSlot(
  workOrder: WorkOrder,
  technicians: Technician[],
  existingWorkOrders: WorkOrder[],
  targetDate: string,
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = [];

  // Get active technicians
  const activeTechnicians = technicians.filter((tech) => tech.is_active);

  activeTechnicians.forEach((tech) => {
    const techName = tech.full_name || `${tech.first_name} ${tech.last_name}`;

    // Get technician's existing jobs for the day
    const techJobs = existingWorkOrders.filter(
      (wo) =>
        wo.scheduled_date === targetDate && wo.assigned_technician === techName,
    );

    // Calculate score based on various factors
    let score = 100;
    const reasons: string[] = [];

    // Skill matching
    if (tech.skills && workOrder.job_type) {
      const jobTypeSkillMap: Record<string, string> = {
        pumping: "pumping",
        inspection: "inspection",
        repair: "repair",
        installation: "installation",
        emergency: "emergency_response",
        maintenance: "maintenance",
        grease_trap: "pumping",
        camera_inspection: "camera_inspection",
      };

      const requiredSkill = jobTypeSkillMap[workOrder.job_type];
      if (requiredSkill && tech.skills.includes(requiredSkill)) {
        score += 15;
        reasons.push(`Skilled in ${workOrder.job_type}`);
      } else {
        score -= 10;
      }
    }

    // Workload balance (fewer jobs = higher score)
    const workloadScore = Math.max(0, 20 - techJobs.length * 3);
    score += workloadScore;
    if (techJobs.length < 4) {
      reasons.push(`Light workload (${techJobs.length} jobs)`);
    } else if (techJobs.length >= 7) {
      reasons.push(`Heavy workload (${techJobs.length} jobs)`);
      score -= 20;
    }

    // Proximity scoring
    let travelTime: number | undefined;
    let proximity: number | undefined;

    if (
      workOrder.service_latitude &&
      workOrder.service_longitude &&
      tech.home_latitude &&
      tech.home_longitude
    ) {
      proximity = calculateDistance(
        { lat: tech.home_latitude, lng: tech.home_longitude },
        { lat: workOrder.service_latitude, lng: workOrder.service_longitude },
      );

      travelTime = calculateTravelTime(
        { lat: tech.home_latitude, lng: tech.home_longitude },
        { lat: workOrder.service_latitude, lng: workOrder.service_longitude },
      );

      // Closer technicians get higher scores
      if (proximity < 10) {
        score += 20;
        reasons.push(`Close proximity (${proximity.toFixed(1)} miles)`);
      } else if (proximity < 25) {
        score += 10;
        reasons.push(`Reasonable distance (${proximity.toFixed(1)} miles)`);
      } else {
        score -= 10;
        reasons.push(`Far distance (${proximity.toFixed(1)} miles)`);
      }
    }

    // Find best available time slot
    const availableSlot = findAvailableTimeSlot(
      techJobs,
      workOrder.estimated_duration_hours || 1,
    );

    if (!availableSlot) {
      score -= 50;
      reasons.push("No available time slots");
    }

    // Emergency priority boost
    if (
      workOrder.priority === "emergency" &&
      tech.skills?.includes("emergency_response")
    ) {
      score += 25;
      reasons.push("Emergency response certified");
    }

    suggestions.push({
      technicianId: tech.id,
      technicianName: techName,
      suggestedDate: targetDate,
      suggestedTime: availableSlot || "08:00",
      score: Math.max(0, Math.min(100, score)),
      reasons,
      estimatedTravelTime: travelTime,
      proximity,
    });
  });

  // Sort by score descending
  return suggestions.sort((a, b) => b.score - a.score);
}

/**
 * Find an available time slot for a technician
 */
function findAvailableTimeSlot(
  existingJobs: WorkOrder[],
  durationHours: number,
): string | null {
  // Working hours: 6am to 8pm
  const workStart = 6;
  const workEnd = 20;
  const durationMinutes = durationHours * 60;

  // Get all busy time ranges
  const busyRanges: { start: number; end: number }[] = existingJobs
    .filter((job) => job.time_window_start)
    .map((job) => {
      const [hours, minutes] = job.time_window_start!.split(":").map(Number);
      const startMinutes = hours * 60 + minutes;
      const duration = (job.estimated_duration_hours || 1) * 60;
      return {
        start: startMinutes,
        end: startMinutes + duration + 30, // Add 30min buffer
      };
    })
    .sort((a, b) => a.start - b.start);

  // Find gaps
  let currentTime = workStart * 60;

  for (const range of busyRanges) {
    if (range.start - currentTime >= durationMinutes) {
      // Found a gap
      const hours = Math.floor(currentTime / 60);
      const mins = currentTime % 60;
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    }
    currentTime = Math.max(currentTime, range.end);
  }

  // Check if there's time at the end
  if (workEnd * 60 - currentTime >= durationMinutes) {
    const hours = Math.floor(currentTime / 60);
    const mins = currentTime % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  return null;
}

/**
 * Get available time slots for a day
 */
export function getAvailableSlots(
  date: string,
  technicianId: string | undefined,
  existingWorkOrders: WorkOrder[],
  _slotDurationMinutes: number = 60,
): { start: string; end: string; available: boolean }[] {
  const slots: { start: string; end: string; available: boolean }[] = [];

  // Working hours: 6am to 8pm
  for (let hour = 6; hour < 20; hour++) {
    const startTime = `${String(hour).padStart(2, "0")}:00`;
    const endTime = `${String(hour + 1).padStart(2, "0")}:00`;

    // Check if slot is available
    const techJobs = existingWorkOrders.filter(
      (wo) =>
        wo.scheduled_date === date &&
        (!technicianId || wo.assigned_technician === technicianId),
    );

    const isAvailable = !techJobs.some((job) => {
      if (!job.time_window_start) return false;
      const [jobHour] = job.time_window_start.split(":").map(Number);
      const jobDuration = job.estimated_duration_hours || 1;
      return hour >= jobHour && hour < jobHour + jobDuration;
    });

    slots.push({
      start: startTime,
      end: endTime,
      available: isAvailable,
    });
  }

  return slots;
}

/**
 * Calculate technician utilization for a date range
 */
export function calculateTechnicianUtilization(
  technicianName: string,
  workOrders: WorkOrder[],
  startDate: string,
  endDate: string,
): { date: string; utilization: number; jobCount: number }[] {
  const results: { date: string; utilization: number; jobCount: number }[] = [];
  const workingHours = 10; // 6am to 4pm = 10 hours

  // Get all dates in range
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const current = new Date(start);

  while (current <= end) {
    const dateStr = format(current, "yyyy-MM-dd");

    // Get jobs for this technician on this date
    const dayJobs = workOrders.filter(
      (wo) =>
        wo.scheduled_date === dateStr &&
        wo.assigned_technician === technicianName,
    );

    // Calculate total hours scheduled
    const totalHours = dayJobs.reduce(
      (sum, job) => sum + (job.estimated_duration_hours || 1),
      0,
    );

    results.push({
      date: dateStr,
      utilization: Math.min(100, (totalHours / workingHours) * 100),
      jobCount: dayJobs.length,
    });

    current.setDate(current.getDate() + 1);
  }

  return results;
}

/**
 * Optimize route order for multiple jobs
 */
export function optimizeRouteOrder(
  workOrders: WorkOrder[],
  startPoint?: { lat: number; lng: number },
): WorkOrder[] {
  if (workOrders.length <= 1) return workOrders;

  // Filter work orders with valid coordinates
  const withCoords = workOrders.filter(
    (wo) => wo.service_latitude && wo.service_longitude,
  );
  const withoutCoords = workOrders.filter(
    (wo) => !wo.service_latitude || !wo.service_longitude,
  );

  if (withCoords.length === 0) return workOrders;

  // Simple nearest neighbor algorithm
  const ordered: WorkOrder[] = [];
  const remaining = [...withCoords];

  // Start from the start point or first job
  let current = startPoint || {
    lat: remaining[0].service_latitude!,
    lng: remaining[0].service_longitude!,
  };

  while (remaining.length > 0) {
    // Find nearest job
    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((wo, idx) => {
      const dist = calculateDistance(current, {
        lat: wo.service_latitude!,
        lng: wo.service_longitude!,
      });
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    const nearest = remaining.splice(nearestIdx, 1)[0];
    ordered.push(nearest);
    current = {
      lat: nearest.service_latitude!,
      lng: nearest.service_longitude!,
    };
  }

  // Add jobs without coordinates at the end
  return [...ordered, ...withoutCoords];
}
