/**
 * Operations Command Center
 * Real-time view of field operations, technician locations, and alerts
 */
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useTechnicianLocations,
  useOperationsAlerts,
  useTodayStats,
  useDispatchQueue,
  useAcknowledgeOperationsAlert,
  useAcceptDispatchSuggestion,
} from '@/api/hooks/useAnalytics';
import type { TechnicianLocation, OperationsAlert, DispatchQueueItem } from '@/api/types/analytics';
import { formatCurrency, cn } from '@/lib/utils';
import { getErrorMessage } from '@/api/client';

export function OperationsCommandCenter() {
  const { data: locations, isLoading: locationsLoading } = useTechnicianLocations();
  const { data: alerts, isLoading: alertsLoading } = useOperationsAlerts(false);
  const { data: stats, isLoading: statsLoading } = useTodayStats();
  const { data: queue, isLoading: queueLoading } = useDispatchQueue();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Operations Command Center</h1>
          <p className="text-text-secondary">
            Real-time field operations monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 bg-success rounded-full animate-pulse" />
          <span className="text-sm text-text-muted">Live</span>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-background-secondary animate-pulse rounded-lg" />
          ))
        ) : stats ? (
          <>
            <StatCard
              label="Jobs Today"
              value={`${stats.jobs_completed}/${stats.total_jobs_scheduled}`}
              subtext={`${((stats.completion_rate) * 100).toFixed(0)}% complete`}
              variant={stats.completion_rate >= 0.8 ? 'success' : 'warning'}
            />
            <StatCard
              label="In Progress"
              value={stats.jobs_in_progress.toString()}
              subtext={`${stats.jobs_pending} pending`}
            />
            <StatCard
              label="Techs Active"
              value={`${stats.technicians_active}/${stats.technicians_active + stats.technicians_available}`}
              subtext={`${stats.technicians_available} available`}
              variant="info"
            />
            <StatCard
              label="Avg Response"
              value={`${stats.average_response_time}m`}
              subtext="Response time"
              variant={stats.average_response_time <= 30 ? 'success' : 'warning'}
            />
            <StatCard
              label="Revenue Today"
              value={formatCurrency(stats.revenue_today)}
              subtext={`${stats.invoices_sent} invoices`}
              variant="success"
            />
            <StatCard
              label="Avg Wait"
              value={`${stats.customer_wait_time}m`}
              subtext="Customer wait"
              variant={stats.customer_wait_time <= 15 ? 'success' : 'danger'}
            />
          </>
        ) : null}
      </div>

      {/* Alerts Bar */}
      {alerts && alerts.length > 0 && (
        <AlertsBar alerts={alerts} loading={alertsLoading} />
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technician Locations */}
        <div className="lg:col-span-2">
          <TechnicianMap locations={locations || []} loading={locationsLoading} />
        </div>

        {/* Dispatch Queue */}
        <DispatchQueueCard queue={queue || []} loading={queueLoading} />
      </div>

      {/* Technician Status List */}
      <TechnicianStatusList locations={locations || []} loading={locationsLoading} />
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  variant = 'default',
}: {
  label: string;
  value: string;
  subtext?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const variantStyles = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-error',
    info: 'text-info',
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
        <p className={cn('text-2xl font-bold', variantStyles[variant])}>{value}</p>
        {subtext && <p className="text-xs text-text-muted mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function AlertsBar({
  alerts,
  loading,
}: {
  alerts: OperationsAlert[];
  loading: boolean;
}) {
  const acknowledgeAlert = useAcknowledgeOperationsAlert();

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert.mutateAsync(alertId);
    } catch (error) {
      alert(`Error: ${getErrorMessage(error)}`);
    }
  };

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const highAlerts = alerts.filter((a) => a.severity === 'high');

  if (loading) {
    return <div className="h-16 bg-background-secondary animate-pulse rounded-lg" />;
  }

  return (
    <Card className={cn(
      'border-l-4',
      criticalAlerts.length > 0 ? 'border-l-error' : 'border-l-warning'
    )}>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl">
              {criticalAlerts.length > 0 ? '🚨' : '⚠️'}
            </span>
            <div>
              <span className="font-medium">
                {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
              </span>
              {criticalAlerts.length > 0 && (
                <Badge className="ml-2 bg-error text-white">
                  {criticalAlerts.length} Critical
                </Badge>
              )}
              {highAlerts.length > 0 && (
                <Badge className="ml-2 bg-warning text-white">
                  {highAlerts.length} High
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Show first alert preview */}
            <span className="text-sm text-text-secondary max-w-md truncate">
              {alerts[0]?.title}: {alerts[0]?.message}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAcknowledge(alerts[0].id)}
              disabled={acknowledgeAlert.isPending}
            >
              Acknowledge
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TechnicianMap({
  locations,
  loading,
}: {
  locations: TechnicianLocation[];
  loading: boolean;
}) {
  // In a real implementation, this would use Leaflet or Google Maps
  // For now, we'll show a placeholder with technician counts by status
  const statusCounts = locations.reduce((acc, loc) => {
    acc[loc.status] = (acc[loc.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="h-96">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Live Technician Map</CardTitle>
          <div className="flex gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge
                key={status}
                className={cn(
                  'text-xs',
                  status === 'available' && 'bg-success text-white',
                  status === 'en_route' && 'bg-info text-white',
                  status === 'on_job' && 'bg-primary text-white',
                  status === 'break' && 'bg-warning text-white',
                  status === 'offline' && 'bg-text-muted text-white'
                )}
              >
                {count} {status.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        {loading ? (
          <div className="h-full bg-background-secondary animate-pulse rounded" />
        ) : (
          <div className="h-full bg-background-secondary rounded-lg flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl">🗺️</span>
              <p className="text-text-muted mt-2">
                Interactive map showing {locations.length} technicians
              </p>
              <p className="text-xs text-text-secondary mt-1">
                (Map integration with Leaflet/Google Maps)
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DispatchQueueCard({
  queue,
  loading,
}: {
  queue: DispatchQueueItem[];
  loading: boolean;
}) {
  const acceptSuggestion = useAcceptDispatchSuggestion();

  const handleAccept = async (workOrderId: string, technicianId: string) => {
    try {
      await acceptSuggestion.mutateAsync({
        work_order_id: workOrderId,
        technician_id: technicianId,
      });
    } catch (error) {
      alert(`Error: ${getErrorMessage(error)}`);
    }
  };

  const priorityStyles = {
    emergency: 'border-l-error bg-error/5',
    high: 'border-l-warning bg-warning/5',
    normal: 'border-l-info',
    low: 'border-l-border',
  };

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Dispatch Queue</CardTitle>
          <Badge variant="outline">{queue.length} waiting</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full bg-background-secondary animate-pulse rounded" />
        ) : !queue.length ? (
          <div className="h-full flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <span className="text-3xl">✅</span>
              <p className="mt-2">Queue clear</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((item) => (
              <div
                key={item.work_order_id}
                className={cn(
                  'p-3 rounded-lg border-l-4',
                  priorityStyles[item.priority]
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.customer_name}</p>
                    <p className="text-xs text-text-muted truncate">
                      {item.service_type}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      'text-xs shrink-0',
                      item.wait_minutes > 30 ? 'bg-error text-white' :
                      item.wait_minutes > 15 ? 'bg-warning text-white' :
                      'bg-text-muted text-white'
                    )}
                  >
                    {item.wait_minutes}m wait
                  </Badge>
                </div>

                {item.suggested_technician_name && (
                  <div className="mt-2 p-2 bg-background rounded text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">AI suggests:</span>
                      <span className="font-medium">{item.suggested_technician_name}</span>
                      {item.confidence_score && (
                        <Badge className="text-xs bg-success text-white">
                          {(item.confidence_score * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                    {item.suggestion_reason && (
                      <p className="text-xs text-text-muted mt-1">
                        {item.suggestion_reason}
                      </p>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() =>
                        handleAccept(item.work_order_id, item.suggested_technician_id!)
                      }
                      disabled={acceptSuggestion.isPending}
                    >
                      Accept & Dispatch
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TechnicianStatusList({
  locations,
  loading,
}: {
  locations: TechnicianLocation[];
  loading: boolean;
}) {
  const [filter, setFilter] = useState<string>('all');

  const statusLabels = {
    available: { label: 'Available', icon: '✓', color: 'bg-success' },
    en_route: { label: 'En Route', icon: '🚗', color: 'bg-info' },
    on_job: { label: 'On Job', icon: '🔧', color: 'bg-primary' },
    break: { label: 'Break', icon: '☕', color: 'bg-warning' },
    offline: { label: 'Offline', icon: '⭕', color: 'bg-text-muted' },
  };

  const filteredLocations = locations.filter((loc) =>
    filter === 'all' ? true : loc.status === filter
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Technician Status</CardTitle>
          <div className="flex gap-1">
            {['all', 'available', 'en_route', 'on_job', 'break', 'offline'].map((s) => (
              <Button
                key={s}
                variant={filter === s ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? 'All' : statusLabels[s as keyof typeof statusLabels]?.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-40 bg-background-secondary animate-pulse rounded" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredLocations.map((loc) => {
              const statusInfo = statusLabels[loc.status];
              return (
                <div
                  key={loc.technician_id}
                  className="p-3 bg-background-secondary rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-3 h-3 rounded-full', statusInfo.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{loc.technician_name}</p>
                      <p className="text-xs text-text-muted">
                        {statusInfo.icon} {statusInfo.label}
                      </p>
                    </div>
                  </div>
                  {loc.current_customer && (
                    <p className="text-sm text-text-secondary mt-2 truncate">
                      @ {loc.current_customer}
                    </p>
                  )}
                  {loc.eta_minutes && (
                    <p className="text-sm text-info mt-1">
                      ETA: {loc.eta_minutes} min
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
