import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  useEmployeeDashboard,
  useEmployeeJobs,
  useTimeClockStatus,
  useClockIn,
  useClockOut,
  useStartJob,
} from "@/api/hooks/useEmployee";
import type { EmployeeJob } from "@/api/types/employee";
import { formatDate } from "@/lib/utils";
import { MobileWorkOrderView } from "@/features/mobile/MobileWorkOrderView";
import type { WorkOrder } from "@/api/types/workOrder";

/**
 * Time Clock Component
 */
function TimeClock() {
  const { data: status, isLoading } = useTimeClockStatus();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [gettingLocation, setGettingLocation] = useState(false);

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(loc);
          setGettingLocation(false);
          resolve(loc);
        },
        (error) => {
          setGettingLocation(false);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  };

  const handleClockIn = async () => {
    try {
      const loc = await getLocation();
      await clockIn.mutateAsync({
        latitude: loc.lat,
        longitude: loc.lng,
      });
    } catch (error) {
      // Clock in without location if GPS fails
      await clockIn.mutateAsync({
        latitude: undefined,
        longitude: undefined,
      });
    }
  };

  const handleClockOut = async () => {
    try {
      const loc = await getLocation();
      await clockOut.mutateAsync({
        latitude: loc.lat,
        longitude: loc.lng,
      });
    } catch (error) {
      // Clock out without location if GPS fails
      await clockOut.mutateAsync({
        latitude: undefined,
        longitude: undefined,
      });
    }
  };

  const isClockedIn = status?.status === "clocked_in";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-text-primary">Time Clock</h3>
          <p className="text-sm text-text-secondary">
            {isClockedIn ? "Currently clocked in" : "Not clocked in"}
          </p>
        </div>
        <Badge variant={isClockedIn ? "success" : "secondary"}>
          {isClockedIn ? "Working" : "Off"}
        </Badge>
      </div>

      {isClockedIn && status?.clock_in && (
        <div className="mb-4 p-3 bg-bg-muted rounded-lg">
          <div className="text-xs text-text-secondary">Clocked in at</div>
          <div className="text-lg font-mono text-text-primary">
            {new Date(status.clock_in).toLocaleTimeString()}
          </div>
        </div>
      )}

      <Button
        variant={isClockedIn ? "danger" : "primary"}
        className="w-full h-14 text-lg font-semibold"
        onClick={isClockedIn ? handleClockOut : handleClockIn}
        disabled={
          isLoading ||
          clockIn.isPending ||
          clockOut.isPending ||
          gettingLocation
        }
      >
        {gettingLocation
          ? "Getting Location..."
          : clockIn.isPending || clockOut.isPending
            ? "Processing..."
            : isClockedIn
              ? "Clock Out"
              : "Clock In"}
      </Button>

      {location && (
        <div className="mt-2 text-xs text-text-secondary text-center">
          GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </div>
      )}
    </Card>
  );
}

/**
 * Job Card Component
 */
function JobCard({
  job,
  onSelect,
  onStart,
}: {
  job: EmployeeJob;
  onSelect: () => void;
  onStart: () => void;
}) {
  const statusColors: Record<
    string,
    "default" | "warning" | "success" | "danger" | "secondary"
  > = {
    scheduled: "default",
    en_route: "warning",
    in_progress: "warning",
    completed: "success",
    cancelled: "danger",
  };

  const priorityColors: Record<string, string> = {
    low: "text-text-secondary",
    medium: "text-text-primary",
    high: "text-warning",
    urgent: "text-danger",
  };

  return (
    <Card
      className="p-4 cursor-pointer hover:bg-bg-muted/50 transition-colors"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-text-primary">{job.customer_name}</h4>
          <p className="text-sm text-text-secondary">{job.service_type}</p>
        </div>
        <Badge variant={statusColors[job.status] || "secondary"}>
          {job.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="space-y-1 text-sm text-text-secondary mb-3">
        <div className="flex items-center gap-2">
          <span>📍</span>
          <span>
            {job.address}
            {job.city && `, ${job.city}`}
          </span>
        </div>
        {job.time_window_start && (
          <div className="flex items-center gap-2">
            <span>🕐</span>
            <span>
              {job.time_window_start}
              {job.time_window_end && ` - ${job.time_window_end}`}
            </span>
          </div>
        )}
        {job.priority && (
          <div
            className={`flex items-center gap-2 ${priorityColors[job.priority]}`}
          >
            <span>⚡</span>
            <span className="capitalize">{job.priority} Priority</span>
          </div>
        )}
      </div>

      {job.status === "scheduled" && (
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
        >
          Start Job
        </Button>
      )}
      {(job.status === "en_route" || job.status === "in_progress") && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={onSelect}
        >
          Continue Job
        </Button>
      )}
    </Card>
  );
}

/**
 * Jobs List Component
 */
function JobsList({
  onSelectJob,
}: {
  onSelectJob: (job: EmployeeJob) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const { data: jobs, isLoading, error } = useEmployeeJobs(today);
  const startJob = useStartJob();

  const handleStartJob = async (job: EmployeeJob) => {
    try {
      // Get location
      let location: { lat: number; lng: number } | undefined;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
              });
            },
          );
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch {
          // Continue without location
        }
      }

      await startJob.mutateAsync({
        jobId: job.id,
        latitude: location?.lat,
        longitude: location?.lng,
      });
      onSelectJob(job);
    } catch (error) {
      console.error("Failed to start job:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 text-center">
        <p className="text-danger">Failed to load jobs</p>
      </Card>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="font-medium text-text-primary mb-2">
          No Jobs Scheduled
        </h3>
        <p className="text-sm text-text-secondary">
          You have no jobs scheduled for today.
        </p>
      </Card>
    );
  }

  // Sort jobs: in_progress first, then en_route, then scheduled
  const sortedJobs = [...jobs].sort((a, b) => {
    const order: Record<string, number> = {
      in_progress: 0,
      en_route: 1,
      scheduled: 2,
      completed: 3,
      cancelled: 4,
    };
    return (order[a.status] || 5) - (order[b.status] || 5);
  });

  return (
    <div className="space-y-3">
      {sortedJobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onSelect={() => onSelectJob(job)}
          onStart={() => handleStartJob(job)}
        />
      ))}
    </div>
  );
}

/**
 * Dashboard Stats Component
 */
function DashboardStats() {
  const { data: stats, isLoading } = useEmployeeDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-3 animate-pulse">
            <div className="h-4 bg-bg-muted rounded w-16 mb-2"></div>
            <div className="h-8 bg-bg-muted rounded w-12"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <Card className="p-3 text-center">
        <div className="text-xs text-text-secondary mb-1">Today</div>
        <div className="text-2xl font-bold text-text-primary">
          {stats?.jobs_today || 0}
        </div>
        <div className="text-xs text-text-secondary">jobs</div>
      </Card>
      <Card className="p-3 text-center">
        <div className="text-xs text-text-secondary mb-1">Done</div>
        <div className="text-2xl font-bold text-success">
          {stats?.jobs_completed_today || 0}
        </div>
        <div className="text-xs text-text-secondary">completed</div>
      </Card>
      <Card className="p-3 text-center">
        <div className="text-xs text-text-secondary mb-1">Hours</div>
        <div className="text-2xl font-bold text-text-primary">
          {(stats?.hours_today || 0).toFixed(1)}
        </div>
        <div className="text-xs text-text-secondary">worked</div>
      </Card>
    </div>
  );
}

/**
 * Main Employee Portal Page
 */
export function EmployeePortalPage() {
  const [selectedJob, setSelectedJob] = useState<EmployeeJob | null>(null);
  const today = formatDate(new Date().toISOString());

  // Convert EmployeeJob to WorkOrder format for MobileWorkOrderView
  const convertToWorkOrder = (job: EmployeeJob): WorkOrder => {
    // Map employee job status to work order status
    const statusMap: Record<string, WorkOrder["status"]> = {
      scheduled: "scheduled",
      en_route: "enroute",
      in_progress: "in_progress",
      completed: "completed",
      cancelled: "canceled",
    };

    return {
      id: job.id,
      customer_id: "",
      customer_name: job.customer_name,
      job_type: "pumping" as const, // Default to pumping since service_type might not match
      status: statusMap[job.status] || "scheduled",
      priority: "normal",
      scheduled_date: job.scheduled_date || null,
      time_window_start: job.time_window_start || null,
      time_window_end: job.time_window_end || null,
      estimated_duration_hours: job.estimated_duration_minutes
        ? job.estimated_duration_minutes / 60
        : null,
      assigned_technician: null,
      assigned_vehicle: null,
      service_address_line1: job.address || null,
      service_address_line2: null,
      service_city: job.city || null,
      service_state: job.state || null,
      service_postal_code: job.zip || null,
      service_latitude: job.latitude || null,
      service_longitude: job.longitude || null,
      checklist: null,
      notes: job.notes || null,
      created_at: null,
      updated_at: null,
    };
  };

  // If a job is selected, show the mobile work order view
  if (selectedJob) {
    return (
      <MobileWorkOrderView
        workOrder={convertToWorkOrder(selectedJob)}
        onComplete={(_data) => {
          setSelectedJob(null);
        }}
        onCancel={() => setSelectedJob(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg-body">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-text-primary">
            Employee Portal
          </h1>
          <p className="text-sm text-text-secondary">{today}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Stats */}
        <DashboardStats />

        {/* Time Clock */}
        <TimeClock />

        {/* Today's Jobs */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Today's Jobs
          </h2>
          <JobsList onSelectJob={setSelectedJob} />
        </div>
      </div>
    </div>
  );
}
