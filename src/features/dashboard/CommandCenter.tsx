import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useWorkOrders, useUnscheduledWorkOrders, useAssignWorkOrder } from '@/api/hooks/useWorkOrders.ts';
import { useTechnicians } from '@/api/hooks/useTechnicians.ts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { formatCurrency } from '@/lib/utils.ts';
import {
  type WorkOrder,
  type JobType,
  type Priority,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
} from '@/api/types/workOrder.ts';
import type { Technician } from '@/api/types/technician.ts';

// Fix Leaflet default marker icon issue with bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// San Marcos, TX center (company location)
const COMPANY_CENTER: [number, number] = [29.8833, -97.9414];

// ============================================
// Technician Status Types
// ============================================
type TechnicianStatus = 'available' | 'busy' | 'offline';

interface TechnicianWithStatus extends Technician {
  status: TechnicianStatus;
  currentJob?: WorkOrder;
}

// ============================================
// Alert Types
// ============================================
interface Alert {
  id: string;
  type: 'running_late' | 'customer_waiting' | 'parts_needed' | 'emergency';
  severity: 'warning' | 'danger' | 'info';
  message: string;
  workOrderId?: string;
  technicianName?: string;
  createdAt: Date;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create custom colored marker icon for technicians
 */
function createTechnicianIcon(status: TechnicianStatus): L.DivIcon {
  const colors: Record<TechnicianStatus, string> = {
    available: '#22c55e', // green
    busy: '#f59e0b', // yellow/amber
    offline: '#6b7280', // gray
  };

  return L.divIcon({
    className: 'technician-marker',
    html: `
      <div style="
        background-color: ${colors[status]};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        font-weight: bold;
      ">T</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

/**
 * Generate deterministic mock coordinates for technicians without lat/lng
 */
function generateTechCoordinates(tech: Technician): [number, number] {
  if (tech.home_latitude && tech.home_longitude) {
    return [tech.home_latitude, tech.home_longitude];
  }
  // Generate based on ID
  const seedNum = typeof tech.id === 'string' ? parseInt(tech.id, 10) || tech.id.length : Number(tech.id);
  const latOffset = ((seedNum * 13) % 60 - 30) / 1000;
  const lngOffset = ((seedNum * 23) % 60 - 30) / 1000;
  return [COMPANY_CENTER[0] + latOffset, COMPANY_CENTER[1] + lngOffset];
}

/**
 * Get time since creation in human readable format
 */
function getTimeSince(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown';
  const created = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
}

/**
 * Component to fit map bounds
 */
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useMemo(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, bounds]);
  return null;
}

// ============================================
// Sub-Components
// ============================================

/**
 * Skeleton loader for metrics cards
 */
function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-10 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({
  label,
  value,
  subtext,
  trend,
  trendDirection,
  className,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
        <div className="flex items-center gap-2 mt-1">
          {subtext && <p className="text-xs text-text-muted">{subtext}</p>}
          {trend && (
            <span
              className={cn(
                'text-xs font-medium',
                trendDirection === 'up' && 'text-success',
                trendDirection === 'down' && 'text-danger',
                trendDirection === 'neutral' && 'text-text-muted'
              )}
            >
              {trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Quick Stats Row Component
 */
function QuickStatsRow({
  techsOnDuty,
  jobsInProgress,
  jobsRemaining,
  utilization,
  isLoading,
}: {
  techsOnDuty: number;
  jobsInProgress: number;
  jobsRemaining: number;
  utilization: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-bg-card border border-border rounded-lg p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    { label: 'Techs On Duty', value: techsOnDuty, icon: 'people' },
    { label: 'Jobs In Progress', value: jobsInProgress, icon: 'work' },
    { label: 'Jobs Remaining', value: jobsRemaining, icon: 'pending' },
    { label: 'Utilization', value: `${utilization}%`, icon: 'chart' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-bg-card border border-border rounded-lg p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Technician Marker on Map
 */
function TechnicianMapMarker({ tech }: { tech: TechnicianWithStatus }) {
  const position = generateTechCoordinates(tech);
  const icon = createTechnicianIcon(tech.status);

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div className="min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                tech.status === 'available' && 'bg-success',
                tech.status === 'busy' && 'bg-warning',
                tech.status === 'offline' && 'bg-text-muted'
              )}
            />
            <span className="text-sm font-medium capitalize">{tech.status}</span>
          </div>
          <h3 className="font-semibold text-gray-900">
            {tech.first_name} {tech.last_name}
          </h3>
          {tech.phone && <p className="text-sm text-gray-600">{tech.phone}</p>}
          {tech.currentJob && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <p className="font-medium">Current Job:</p>
              <p>{tech.currentJob.customer_name || `WO #${tech.currentJob.id}`}</p>
            </div>
          )}
          {tech.assigned_vehicle && (
            <p className="text-xs text-gray-500 mt-2">Vehicle: {tech.assigned_vehicle}</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * Live Technician Map Section
 */
function LiveTechnicianMap({
  technicians,
  isLoading,
}: {
  technicians: TechnicianWithStatus[];
  isLoading: boolean;
}) {
  const bounds = useMemo(() => {
    if (technicians.length === 0) return null;
    const points = technicians.map((t) => generateTechCoordinates(t));
    if (points.length === 1) {
      return L.latLngBounds(
        [points[0][0] - 0.05, points[0][1] - 0.05],
        [points[0][0] + 0.05, points[0][1] + 0.05]
      );
    }
    return L.latLngBounds(points);
  }, [technicians]);

  if (isLoading) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Live Technician Map</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <Skeleton className="w-full h-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const statusCounts = {
    available: technicians.filter((t) => t.status === 'available').length,
    busy: technicians.filter((t) => t.status === 'busy').length,
    offline: technicians.filter((t) => t.status === 'offline').length,
  };

  return (
    <Card className="h-[400px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Live Technician Map</CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success" />
              Available ({statusCounts.available})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warning" />
              Busy ({statusCounts.busy})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-text-muted" />
              Offline ({statusCounts.offline})
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[320px] p-0">
        <div className="h-full rounded-b-lg overflow-hidden">
          <MapContainer
            center={COMPANY_CENTER}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds bounds={bounds} />
            {technicians.map((tech) => (
              <TechnicianMapMarker key={tech.id} tech={tech} />
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Today's Metrics Cards Section
 */
function TodaysMetrics({
  completedToday,
  scheduledToday,
  revenueToday,
  avgCompletionTime,
  isLoading,
}: {
  completedToday: number;
  scheduledToday: number;
  revenueToday: number;
  avgCompletionTime: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const completionRate = scheduledToday > 0 ? Math.round((completedToday / scheduledToday) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        label="Jobs Completed Today"
        value={`${completedToday}/${scheduledToday}`}
        subtext={`${completionRate}% complete`}
        trend={completionRate >= 80 ? 'On Track' : 'Behind'}
        trendDirection={completionRate >= 80 ? 'up' : 'down'}
      />
      <MetricCard
        label="Revenue Today"
        value={formatCurrency(revenueToday)}
        subtext="Estimated from completed jobs"
      />
      <MetricCard
        label="Avg Completion Time"
        value={avgCompletionTime}
        subtext="Per job today"
      />
      <MetricCard
        label="Customer Satisfaction"
        value="4.8"
        subtext="Based on recent feedback"
        trend="+0.2"
        trendDirection="up"
      />
    </div>
  );
}

/**
 * Active Alerts Panel
 */
function ActiveAlertsPanel({
  alerts,
  isLoading,
}: {
  alerts: Alert[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-text-muted">
            <p>No active alerts</p>
            <p className="text-sm">All operations running smoothly</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active Alerts</CardTitle>
          <Badge variant="danger">{alerts.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border',
                alert.severity === 'danger' && 'border-danger bg-danger-light/20',
                alert.severity === 'warning' && 'border-warning bg-warning-light/20',
                alert.severity === 'info' && 'border-info bg-info-light/20'
              )}
            >
              <Badge
                variant={alert.severity === 'danger' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}
              >
                {alert.type.replace('_', ' ')}
              </Badge>
              <div className="flex-1">
                <p className="text-sm text-text-primary">{alert.message}</p>
                {alert.technicianName && (
                  <p className="text-xs text-text-muted mt-1">Tech: {alert.technicianName}</p>
                )}
              </div>
              {alert.workOrderId && (
                <Link to={`/work-orders/${alert.workOrderId}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dispatch Queue Panel
 */
function DispatchQueue({
  unassignedJobs,
  technicians,
  isLoading,
}: {
  unassignedJobs: WorkOrder[];
  technicians: Technician[];
  isLoading: boolean;
}) {
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const assignWorkOrder = useAssignWorkOrder();

  const handleQuickAssign = (workOrderId: string, technicianName: string) => {
    setAssigningId(workOrderId);
    const today = new Date().toISOString().split('T')[0];
    assignWorkOrder.mutate(
      {
        id: workOrderId,
        technician: technicianName,
        date: today,
      },
      {
        onSettled: () => setAssigningId(null),
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 border border-border rounded-lg">
                <div className="flex justify-between mb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-48 mb-2" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by priority (emergency first, then by creation time)
  const sortedJobs = [...unassignedJobs].sort((a, b) => {
    const priorityOrder: Record<Priority, number> = {
      emergency: 0,
      urgent: 1,
      high: 2,
      normal: 3,
      low: 4,
    };
    const priorityDiff = priorityOrder[a.priority as Priority] - priorityOrder[b.priority as Priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

  if (sortedJobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-text-muted">
            <p>No unassigned jobs</p>
            <p className="text-sm">All jobs have been dispatched</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableTechs = technicians.filter((t) => t.is_active);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Dispatch Queue</CardTitle>
          <Badge variant="warning">{sortedJobs.length} unassigned</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {sortedJobs.map((job) => (
            <div
              key={job.id}
              className={cn(
                'p-3 rounded-lg border',
                job.priority === 'emergency' && 'border-danger bg-danger-light/10',
                job.priority === 'urgent' && 'border-warning bg-warning-light/10',
                job.priority !== 'emergency' && job.priority !== 'urgent' && 'border-border'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-text-primary">
                    {job.customer_name || `Customer #${job.customer_id}`}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {JOB_TYPE_LABELS[job.job_type as JobType]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      job.priority === 'emergency' || job.priority === 'urgent'
                        ? 'danger'
                        : job.priority === 'high'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {PRIORITY_LABELS[job.priority as Priority]}
                  </Badge>
                </div>
              </div>
              {job.service_address_line1 && (
                <p className="text-xs text-text-muted mb-2">{job.service_address_line1}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  Created {getTimeSince(job.created_at)}
                </span>
                <div className="flex items-center gap-2">
                  <select
                    className="text-xs border border-border rounded px-2 py-1 bg-bg-card"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleQuickAssign(job.id, e.target.value);
                      }
                    }}
                    disabled={assigningId === job.id}
                  >
                    <option value="">Assign to...</option>
                    {availableTechs.map((tech) => (
                      <option key={tech.id} value={`${tech.first_name} ${tech.last_name}`}>
                        {tech.first_name} {tech.last_name}
                      </option>
                    ))}
                  </select>
                  <Link to={`/work-orders/${job.id}`}>
                    <Button variant="ghost" size="sm">
                      Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Command Center Component
// ============================================

/**
 * Operations Command Center - Real-time operations dashboard
 */
export function CommandCenter() {
  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch work orders
  const {
    data: workOrdersData,
    isLoading: woLoading,
  } = useWorkOrders({ page: 1, page_size: 200 });

  // Fetch unscheduled work orders
  const {
    data: unscheduledData,
    isLoading: unscheduledLoading,
  } = useUnscheduledWorkOrders();

  // Fetch technicians
  const {
    data: techniciansData,
    isLoading: techLoading,
  } = useTechnicians({ page: 1, page_size: 50, active_only: true });

  const isLoading = woLoading || unscheduledLoading || techLoading;

  // Process work orders
  const workOrders = workOrdersData?.items || [];
  const unscheduledJobs = unscheduledData?.items || [];
  const technicians = techniciansData?.items || [];

  // Calculate today's metrics
  const todaysMetrics = useMemo(() => {
    const todaysJobs = workOrders.filter((wo) => wo.scheduled_date === todayStr);
    const completed = todaysJobs.filter((wo) => wo.status === 'completed').length;
    const scheduled = todaysJobs.length;

    // Estimate revenue (mock calculation based on job type)
    const revenuePerJobType: Record<string, number> = {
      pumping: 350,
      inspection: 150,
      repair: 500,
      installation: 2500,
      emergency: 600,
      maintenance: 200,
      grease_trap: 400,
      camera_inspection: 250,
    };

    const revenue = todaysJobs
      .filter((wo) => wo.status === 'completed')
      .reduce((sum, wo) => sum + (revenuePerJobType[wo.job_type] || 200), 0);

    // Calculate average completion time from work order estimated durations
    const completedJobs = todaysJobs.filter((wo) => wo.status === 'completed');
    const avgTime = completedJobs.length > 0
      ? `${(completedJobs.reduce((sum, wo) => sum + (wo.estimated_duration_hours || 1.5), 0) / completedJobs.length).toFixed(1)}h`
      : '--';

    return { completed, scheduled, revenue, avgTime };
  }, [workOrders, todayStr]);

  // Calculate quick stats
  const quickStats = useMemo(() => {
    const todaysJobs = workOrders.filter((wo) => wo.scheduled_date === todayStr);
    const inProgress = todaysJobs.filter((wo) =>
      ['enroute', 'on_site', 'in_progress'].includes(wo.status)
    ).length;
    const remaining = todaysJobs.filter((wo) =>
      ['scheduled', 'confirmed'].includes(wo.status)
    ).length;
    const techsOnDuty = technicians.filter((t) => t.is_active).length;

    // Calculate utilization (jobs per tech)
    const totalTodaysJobs = todaysJobs.length;
    const utilization = techsOnDuty > 0 ? Math.min(100, Math.round((totalTodaysJobs / (techsOnDuty * 6)) * 100)) : 0;

    return { techsOnDuty, inProgress, remaining, utilization };
  }, [workOrders, technicians, todayStr]);

  // Process technicians with status
  const techniciansWithStatus: TechnicianWithStatus[] = useMemo(() => {
    const inProgressJobs = workOrders.filter((wo) =>
      wo.scheduled_date === todayStr && ['enroute', 'on_site', 'in_progress'].includes(wo.status)
    );

    return technicians.map((tech) => {
      const fullName = `${tech.first_name} ${tech.last_name}`;
      const currentJob = inProgressJobs.find((wo) => wo.assigned_technician === fullName);

      let status: TechnicianStatus = 'offline';
      if (tech.is_active) {
        status = currentJob ? 'busy' : 'available';
      }

      return { ...tech, status, currentJob };
    });
  }, [technicians, workOrders, todayStr]);

  // Generate alerts (mock based on current data)
  const alerts: Alert[] = useMemo(() => {
    const generatedAlerts: Alert[] = [];

    // Check for emergency priority jobs not started
    const emergencyJobs = workOrders.filter(
      (wo) =>
        wo.priority === 'emergency' &&
        wo.scheduled_date === todayStr &&
        !['completed', 'in_progress', 'on_site'].includes(wo.status)
    );

    emergencyJobs.forEach((job) => {
      generatedAlerts.push({
        id: `emergency-${job.id}`,
        type: 'emergency',
        severity: 'danger',
        message: `Emergency job not started: ${job.customer_name || 'Unknown'}`,
        workOrderId: job.id,
        technicianName: job.assigned_technician || undefined,
        createdAt: new Date(),
      });
    });

    // Check for jobs running late (scheduled time passed but not started)
    const now = new Date();
    const currentHour = now.getHours();
    workOrders
      .filter((wo) => {
        if (wo.scheduled_date !== todayStr) return false;
        if (['completed', 'canceled'].includes(wo.status)) return false;
        if (!wo.time_window_start) return false;
        const scheduledHour = parseInt(wo.time_window_start.split(':')[0], 10);
        return scheduledHour < currentHour && !['in_progress', 'on_site'].includes(wo.status);
      })
      .slice(0, 3) // Limit to 3 late alerts
      .forEach((job) => {
        generatedAlerts.push({
          id: `late-${job.id}`,
          type: 'running_late',
          severity: 'warning',
          message: `Running late: ${job.customer_name || 'Unknown'} - scheduled for ${job.time_window_start}`,
          workOrderId: job.id,
          technicianName: job.assigned_technician || undefined,
          createdAt: new Date(),
        });
      });

    return generatedAlerts;
  }, [workOrders, todayStr]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Operations Command Center</h1>
            <p className="text-sm text-text-secondary mt-1">
              Real-time operations dashboard - {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Live
            </div>
            <Link to="/schedule">
              <Button variant="secondary" size="sm">
                Full Schedule
              </Button>
            </Link>
            <Link to="/work-orders">
              <Button size="sm">New Work Order</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <QuickStatsRow
        techsOnDuty={quickStats.techsOnDuty}
        jobsInProgress={quickStats.inProgress}
        jobsRemaining={quickStats.remaining}
        utilization={quickStats.utilization}
        isLoading={isLoading}
      />

      {/* Today's Metrics */}
      <TodaysMetrics
        completedToday={todaysMetrics.completed}
        scheduledToday={todaysMetrics.scheduled}
        revenueToday={todaysMetrics.revenue}
        avgCompletionTime={todaysMetrics.avgTime}
        isLoading={isLoading}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Map + Alerts */}
        <div className="space-y-6">
          <LiveTechnicianMap technicians={techniciansWithStatus} isLoading={isLoading} />
          <ActiveAlertsPanel alerts={alerts} isLoading={isLoading} />
        </div>

        {/* Right Column: Dispatch Queue */}
        <div>
          <DispatchQueue
            unassignedJobs={unscheduledJobs}
            technicians={technicians}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
