/**
 * Embeddable Status Tracking Widget
 * Real-time work order status tracking for customers
 * Can be embedded in external websites or sent via email link
 */
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

// ============================================
// Widget Configuration Types
// ============================================

export interface StatusWidgetConfig {
  /** Work order ID or tracking code */
  trackingId?: string;
  /** Company ID for API calls */
  companyId: string;
  /** Primary brand color */
  primaryColor?: string;
  /** Company logo URL */
  logoUrl?: string;
  /** Company name */
  companyName?: string;
  /** Show technician info */
  showTechnicianInfo?: boolean;
  /** Show ETA */
  showETA?: boolean;
  /** Enable live tracking map */
  enableLiveTracking?: boolean;
  /** Auto-refresh interval (ms) */
  refreshInterval?: number;
  /** Custom CSS class */
  className?: string;
}

// ============================================
// Status Types
// ============================================

type WorkOrderStatus =
  | 'pending'
  | 'scheduled'
  | 'assigned'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

interface TechnicianInfo {
  name: string;
  photoUrl?: string;
  phone?: string;
  rating?: number;
}

interface StatusUpdate {
  status: WorkOrderStatus;
  timestamp: string;
  message?: string;
}

interface WorkOrderDetails {
  id: string;
  trackingCode: string;
  status: WorkOrderStatus;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedArrival?: string;
  address: string;
  technician?: TechnicianInfo;
  statusHistory: StatusUpdate[];
  customerNotes?: string;
  technicianNotes?: string;
  technicianLocation?: {
    lat: number;
    lng: number;
    lastUpdate: string;
  };
}

// ============================================
// Status Configuration
// ============================================

const statusConfig: Record<WorkOrderStatus, {
  label: string;
  color: 'warning' | 'info' | 'primary' | 'success' | 'danger' | 'secondary';
  icon: string;
  step: number;
}> = {
  pending: { label: 'Pending', color: 'secondary', icon: '1', step: 1 },
  scheduled: { label: 'Scheduled', color: 'info', icon: '2', step: 2 },
  assigned: { label: 'Technician Assigned', color: 'info', icon: '3', step: 3 },
  en_route: { label: 'On The Way', color: 'warning', icon: '4', step: 4 },
  arrived: { label: 'Arrived', color: 'primary', icon: '5', step: 5 },
  in_progress: { label: 'In Progress', color: 'primary', icon: '6', step: 6 },
  completed: { label: 'Completed', color: 'success', icon: '7', step: 7 },
  cancelled: { label: 'Cancelled', color: 'danger', icon: 'X', step: -1 },
};

// ============================================
// Component
// ============================================

export function StatusWidget({
  trackingId: initialTrackingId,
  companyId,
  primaryColor = '#2563eb',
  logoUrl,
  companyName = 'Service Provider',
  showTechnicianInfo = true,
  showETA = true,
  enableLiveTracking = false,
  refreshInterval = 30000, // 30 seconds
  className,
}: StatusWidgetConfig) {
  const [trackingId, setTrackingId] = useState(initialTrackingId || '');
  const [searchInput, setSearchInput] = useState('');
  const [workOrder, setWorkOrder] = useState<WorkOrderDetails | null>(null);
  const [loading, setLoading] = useState(!!initialTrackingId);
  const [error, setError] = useState<string | null>(null);

  // Load work order details
  const loadWorkOrder = async (id: string) => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v2/widgets/status/${id}`, {
        headers: {
          'X-Widget-Company': companyId,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Work order not found. Please check your tracking code.');
        }
        throw new Error('Failed to load status');
      }

      const data = await response.json();
      setWorkOrder(data);
      setTrackingId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setWorkOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    if (initialTrackingId) {
      loadWorkOrder(initialTrackingId);
    }
  }, [initialTrackingId]);

  useEffect(() => {
    if (!trackingId || !workOrder) return;
    if (workOrder.status === 'completed' || workOrder.status === 'cancelled') return;

    const interval = setInterval(() => {
      loadWorkOrder(trackingId);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [trackingId, workOrder?.status, refreshInterval]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      loadWorkOrder(searchInput.trim());
    }
  };

  // Format date/time
  const formatDateTime = (dateStr: string, timeStr?: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    };
    let formatted = date.toLocaleDateString('en-US', options);
    if (timeStr) {
      formatted += ` at ${timeStr}`;
    }
    return formatted;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Custom CSS variables for branding
  const brandStyles = {
    '--widget-primary': primaryColor,
  } as React.CSSProperties;

  // Search form view
  if (!workOrder && !loading) {
    return (
      <Card className={cn('max-w-md mx-auto', className)} style={brandStyles}>
        <CardHeader className="text-center">
          {logoUrl && (
            <img src={logoUrl} alt={companyName} className="h-10 mx-auto mb-2" />
          )}
          <CardTitle>Track Your Service</CardTitle>
          <p className="text-sm text-text-muted">
            Enter your tracking code to see the status of your service
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter tracking code (e.g., WO-12345)"
                className="text-center font-mono"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!searchInput.trim()}
              style={{ backgroundColor: primaryColor }}
            >
              Track Service
            </Button>
          </form>
          <p className="text-xs text-text-muted text-center mt-4">
            Your tracking code was sent to your email when the service was scheduled.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card className={cn('max-w-md mx-auto', className)} style={brandStyles}>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <p className="text-center text-text-muted mt-4">Loading status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!workOrder) return null;

  const currentStatus = statusConfig[workOrder.status];
  const isActive = workOrder.status !== 'completed' && workOrder.status !== 'cancelled';

  return (
    <Card className={cn('max-w-md mx-auto', className)} style={brandStyles}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            {logoUrl && (
              <img src={logoUrl} alt={companyName} className="h-8 mb-1" />
            )}
            <p className="text-xs text-text-muted font-mono">
              #{workOrder.trackingCode}
            </p>
          </div>
          <Badge variant={currentStatus.color} size="lg">
            {currentStatus.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {/* Service Info */}
        <div className="space-y-2">
          <h3 className="font-medium text-text-primary">{workOrder.serviceType}</h3>
          <p className="text-sm text-text-secondary">{workOrder.address}</p>
          <p className="text-sm text-text-muted">
            Scheduled: {formatDateTime(workOrder.scheduledDate, workOrder.scheduledTime)}
          </p>
        </div>

        {/* ETA Banner */}
        {showETA && workOrder.estimatedArrival && isActive && (
          <div
            className="p-4 rounded-lg text-center"
            style={{ backgroundColor: `${primaryColor}10` }}
          >
            <p className="text-sm text-text-secondary">Estimated Arrival</p>
            <p className="text-2xl font-bold" style={{ color: primaryColor }}>
              {workOrder.estimatedArrival}
            </p>
          </div>
        )}

        {/* Technician Info */}
        {showTechnicianInfo && workOrder.technician && (
          <div className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
            {workOrder.technician.photoUrl ? (
              <img
                src={workOrder.technician.photoUrl}
                alt={workOrder.technician.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-medium" style={{ color: primaryColor }}>
                  {workOrder.technician.name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-text-primary">{workOrder.technician.name}</p>
              <p className="text-sm text-text-muted">Your Technician</p>
              {workOrder.technician.rating && (
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-warning">{'*'.repeat(Math.round(workOrder.technician.rating))}</span>
                  <span className="text-text-muted">{workOrder.technician.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            {workOrder.technician.phone && workOrder.status === 'en_route' && (
              <a
                href={`tel:${workOrder.technician.phone}`}
                className="p-2 rounded-full hover:bg-bg-muted transition-colors"
              >
                <svg className="w-5 h-5" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Live Tracking Map Placeholder */}
        {enableLiveTracking && workOrder.technicianLocation && workOrder.status === 'en_route' && (
          <div className="h-48 bg-bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto text-text-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-text-muted">Live tracking map</p>
              <p className="text-xs text-text-muted">
                Last update: {formatTimestamp(workOrder.technicianLocation.lastUpdate)}
              </p>
            </div>
          </div>
        )}

        {/* Progress Timeline */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-text-primary">Status History</h4>
          <div className="space-y-0">
            {workOrder.statusHistory.map((update, index) => {
              const config = statusConfig[update.status];
              const isLast = index === workOrder.statusHistory.length - 1;

              return (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                        isLast
                          ? 'text-white'
                          : 'bg-bg-muted text-text-muted'
                      )}
                      style={isLast ? { backgroundColor: primaryColor } : undefined}
                    >
                      {config.icon}
                    </div>
                    {index < workOrder.statusHistory.length - 1 && (
                      <div className="w-0.5 h-8 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className={cn(
                      'text-sm font-medium',
                      isLast ? 'text-text-primary' : 'text-text-secondary'
                    )}>
                      {config.label}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatTimestamp(update.timestamp)}
                    </p>
                    {update.message && (
                      <p className="text-sm text-text-secondary mt-1">{update.message}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completed Summary */}
        {workOrder.status === 'completed' && workOrder.technicianNotes && (
          <div className="p-4 bg-success/10 rounded-lg">
            <h4 className="text-sm font-medium text-success mb-2">Service Complete</h4>
            <p className="text-sm text-text-secondary">{workOrder.technicianNotes}</p>
          </div>
        )}

        {/* Track Another */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setWorkOrder(null);
            setTrackingId('');
            setSearchInput('');
          }}
        >
          Track Another Service
        </Button>
      </CardContent>
    </Card>
  );
}
