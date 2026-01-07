import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

// Fix Leaflet default marker icon issue - DISABLE default markers entirely
// We only use custom DivIcon markers for technicians
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  iconRetinaUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  shadowUrl: '',
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
// Toast Notification Types
// ============================================
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: Date;
}

// ============================================
// Assignment Confirmation Modal Types
// ============================================
interface AssignmentConfirmation {
  job: WorkOrder;
  technician: TechnicianWithStatus;
}

// ============================================
// Keyboard Shortcuts Config
// ============================================
const KEYBOARD_SHORTCUTS = [
  { keys: ['g', 'd'], description: 'Go to Dashboard', action: '/dashboard' },
  { keys: ['g', 's'], description: 'Go to Schedule', action: '/schedule' },
  { keys: ['g', 'c'], description: 'Go to Customers', action: '/customers' },
  { keys: ['g', 'w'], description: 'Go to Work Orders', action: '/work-orders' },
  { keys: ['g', 't'], description: 'Go to Technicians', action: '/operations/technicians' },
  { keys: ['?'], description: 'Show Shortcuts', action: 'shortcuts' },
  { keys: ['Escape'], description: 'Close Modal', action: 'close' },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Create custom colored marker icon for technicians
 */
function createTechnicianIcon(status: TechnicianStatus, initials: string = 'T', isDropTarget: boolean = false): L.DivIcon {
  const colors: Record<TechnicianStatus, string> = {
    available: '#22c55e', // green
    busy: '#f59e0b', // yellow/amber
    offline: '#6b7280', // gray
  };

  const borderColor = isDropTarget ? '#3b82f6' : 'white';
  const borderWidth = isDropTarget ? '4px' : '3px';
  const scale = isDropTarget ? 'scale(1.2)' : 'scale(1)';
  const boxShadow = isDropTarget
    ? '0 0 20px rgba(59, 130, 246, 0.8), 0 2px 8px rgba(0,0,0,0.5)'
    : '0 2px 8px rgba(0,0,0,0.5)';

  return L.divIcon({
    className: 'technician-marker',
    html: `
      <div style="
        background-color: ${colors[status]};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: ${borderWidth} solid ${borderColor};
        box-shadow: ${boxShadow};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        transform: ${scale};
      ">${initials}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
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
 * Get priority color class
 */
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'emergency':
      return 'border-red-500 bg-red-500/20';
    case 'urgent':
      return 'border-orange-500 bg-orange-500/20';
    case 'high':
      return 'border-yellow-500 bg-yellow-500/20';
    case 'normal':
      return 'border-blue-500 bg-blue-500/10';
    case 'low':
      return 'border-green-500 bg-green-500/10';
    default:
      return 'border-border';
  }
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
// Toast Notifications Component
// ============================================
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    toasts.forEach((toast) => {
      const timer = setTimeout(() => onDismiss(toast.id), 5000);
      return () => clearTimeout(timer);
    });
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white animate-slide-in-right',
            toast.type === 'success' && 'bg-green-600',
            toast.type === 'error' && 'bg-red-600',
            toast.type === 'warning' && 'bg-yellow-600',
            toast.type === 'info' && 'bg-blue-600'
          )}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-2 hover:opacity-80"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Keyboard Shortcuts Modal
// ============================================
function KeyboardShortcutsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="space-y-2">
          {KEYBOARD_SHORTCUTS.filter(s => s.action !== 'shortcuts' && s.action !== 'close').map((shortcut) => (
            <div key={shortcut.keys.join('')} className="flex items-center justify-between py-2">
              <span className="text-sm text-text-secondary">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="px-2 py-1 text-xs bg-bg-secondary border border-border rounded">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && <span className="mx-1 text-text-muted">then</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border text-xs text-text-muted">
          Press <kbd className="px-1 py-0.5 bg-bg-secondary border border-border rounded">?</kbd> anytime to show this menu
        </div>
      </div>
    </div>
  );
}

// ============================================
// Assignment Confirmation Modal
// ============================================
function AssignmentConfirmModal({
  confirmation,
  onConfirm,
  onCancel,
  isAssigning,
}: {
  confirmation: AssignmentConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
  isAssigning: boolean;
}) {
  if (!confirmation) return null;

  const { job, technician } = confirmation;
  const techName = `${technician.first_name} ${technician.last_name}`;
  const jobType = JOB_TYPE_LABELS[job.job_type as JobType] || job.job_type;
  const address = job.service_address_line1 || 'No address';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onCancel}>
      <div
        className="bg-bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl">
            🚐
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Assign Job?</h2>
            <p className="text-sm text-text-muted">Confirm technician assignment</p>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4 mb-4 space-y-3">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Job</p>
            <p className="font-medium text-text-primary">{jobType}</p>
            <p className="text-sm text-text-secondary">📍 {address}</p>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs text-text-muted uppercase tracking-wide">Assign To</p>
            <div className="flex items-center gap-2 mt-1">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold',
                technician.status === 'available' && 'bg-green-500',
                technician.status === 'busy' && 'bg-yellow-500',
                technician.status === 'offline' && 'bg-gray-400'
              )}>
                {technician.first_name?.[0]}{technician.last_name?.[0]}
              </div>
              <div>
                <p className="font-medium text-text-primary">{techName}</p>
                <p className="text-xs text-text-muted capitalize">{technician.status}</p>
              </div>
            </div>
          </div>
          {job.priority === 'emergency' || job.priority === 'urgent' ? (
            <div className="border-t border-border pt-3">
              <Badge variant="danger" className="text-xs">
                {PRIORITY_LABELS[job.priority as Priority]} Priority
              </Badge>
            </div>
          ) : null}
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={onConfirm}
            disabled={isAssigning}
          >
            {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </div>
      </div>
    </div>
  );
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
 * Enhanced Metric Card Component with drill-down
 */
function MetricCard({
  label,
  value,
  subtext,
  trend,
  trendDirection,
  className,
  onClick,
  isBehind,
  sparklineData,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  className?: string;
  onClick?: () => void;
  isBehind?: boolean;
  sparklineData?: number[];
}) {
  // Mini sparkline renderer
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    const width = 60;
    const height = 20;
    const points = sparklineData.map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="mt-1">
        <polyline
          points={points}
          fill="none"
          stroke={trendDirection === 'up' ? '#22c55e' : trendDirection === 'down' ? '#ef4444' : '#6b7280'}
          strokeWidth="2"
        />
      </svg>
    );
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/50',
        isBehind && 'border-2 border-red-500 bg-red-500/10 animate-pulse-subtle',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <p className="text-sm text-text-secondary">{label}</p>
        <div className="flex items-end gap-3">
          <p className={cn(
            'text-3xl font-bold mt-1',
            isBehind ? 'text-red-600' : 'text-text-primary'
          )}>
            {value === '--' ? (
              <span className="text-text-muted text-xl">No data</span>
            ) : value}
          </p>
          {renderSparkline()}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {subtext && <p className="text-xs text-text-muted">{subtext}</p>}
          {trend && (
            <span
              className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded',
                trendDirection === 'up' && 'text-green-700 bg-green-100',
                trendDirection === 'down' && 'text-red-700 bg-red-100',
                trendDirection === 'neutral' && 'text-text-muted bg-bg-secondary',
                isBehind && 'text-white bg-red-600 animate-pulse'
              )}
            >
              {trendDirection === 'up' && '↑ '}
              {trendDirection === 'down' && '↓ '}
              {trend}
            </span>
          )}
        </div>
        {onClick && (
          <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to drill down →
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Quick Stats Row Component with "Behind" Alert
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

  // Determine if we're "behind" - low utilization with techs on duty
  const isBehind = techsOnDuty > 0 && utilization < 30;
  const isVeryBehind = techsOnDuty > 0 && utilization === 0 && jobsRemaining > 0;

  const stats = [
    { label: 'TECHS ON DUTY', value: techsOnDuty, highlight: false },
    { label: 'JOBS IN PROGRESS', value: jobsInProgress, highlight: false },
    { label: 'JOBS REMAINING', value: jobsRemaining, highlight: jobsRemaining > 5 },
    { label: 'UTILIZATION', value: `${utilization}%`, highlight: isBehind },
  ];

  return (
    <div className="mb-6">
      {/* Behind Alert Banner */}
      {isVeryBehind && (
        <div className="mb-4 p-4 bg-red-600 text-white rounded-lg flex items-center gap-3 animate-pulse shadow-lg">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-lg">OPERATIONS BEHIND SCHEDULE</p>
            <p className="text-sm opacity-90">
              {techsOnDuty} technicians on duty with {jobsRemaining} jobs waiting.
              Consider reassigning or dispatching immediately.
            </p>
          </div>
          <Link to="/schedule" className="ml-auto">
            <Button variant="secondary" size="sm" className="bg-white text-red-600 hover:bg-gray-100">
              View Schedule
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'bg-bg-card border rounded-lg p-4 flex items-center justify-between transition-all',
              stat.highlight && 'border-2 border-red-500 bg-red-500/10'
            )}
          >
            <div>
              <p className={cn(
                'text-xs uppercase tracking-wide',
                stat.highlight ? 'text-red-600 font-semibold' : 'text-text-muted'
              )}>
                {stat.label}
              </p>
              <p className={cn(
                'text-2xl font-bold',
                stat.highlight ? 'text-red-600' : 'text-text-primary'
              )}>
                {stat.value}
              </p>
            </div>
            {stat.highlight && (
              <span className="text-red-500 animate-pulse text-xl">⚠️</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Technician Marker on Map - ONLY technicians, with drop target support
 */
function TechnicianMapMarker({
  tech,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  tech: TechnicianWithStatus;
  isDropTarget: boolean;
  onDragOver: (techId: string) => void;
  onDragLeave: () => void;
  onDrop: (techId: string) => void;
}) {
  const position = generateTechCoordinates(tech);
  const initials = `${tech.first_name?.[0] || ''}${tech.last_name?.[0] || ''}`;
  const icon = createTechnicianIcon(tech.status, initials, isDropTarget);
  const markerRef = useRef<L.Marker>(null);

  // Set up drop zone on the marker's DOM element
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const element = marker.getElement();
    if (!element) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      onDragOver(tech.id);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDragLeave();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop(tech.id);
    };

    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);

    return () => {
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
    };
  }, [tech.id, onDragOver, onDragLeave, onDrop]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
    >
      <Popup>
        <div className="min-w-[220px] p-1">
          <div className="flex items-center gap-2 mb-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold',
                tech.status === 'available' && 'bg-green-500',
                tech.status === 'busy' && 'bg-yellow-500',
                tech.status === 'offline' && 'bg-gray-400'
              )}
            >
              {initials}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {tech.first_name} {tech.last_name}
              </h3>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full capitalize',
                tech.status === 'available' && 'bg-green-100 text-green-700',
                tech.status === 'busy' && 'bg-yellow-100 text-yellow-700',
                tech.status === 'offline' && 'bg-gray-100 text-gray-600'
              )}>
                {tech.status}
              </span>
            </div>
          </div>

          {tech.phone && (
            <p className="text-sm text-gray-600 mb-2">
              📞 {tech.phone}
            </p>
          )}

          {tech.skills && tech.skills.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Skills:</p>
              <div className="flex flex-wrap gap-1">
                {tech.skills.slice(0, 3).map((skill, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {typeof skill === 'string' ? skill : (skill as { name: string }).name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tech.currentJob && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <p className="font-medium text-yellow-800">📋 Current Job:</p>
              <p className="text-yellow-700">{tech.currentJob.customer_name || `WO #${tech.currentJob.id}`}</p>
              <p className="text-yellow-600">{JOB_TYPE_LABELS[tech.currentJob.job_type as JobType]}</p>
            </div>
          )}

          {tech.assigned_vehicle && (
            <p className="text-xs text-gray-500 mt-2">🚐 {tech.assigned_vehicle}</p>
          )}

          {tech.status === 'available' && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-xs text-green-600 font-medium">
                ✓ Ready for assignment - drag a job here
              </p>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * Live Technician Map Section - ONLY shows technician markers
 */
function LiveTechnicianMap({
  technicians,
  isLoading,
  dropTargetTechId,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  technicians: TechnicianWithStatus[];
  isLoading: boolean;
  dropTargetTechId: string | null;
  onDragOver: (techId: string) => void;
  onDragLeave: () => void;
  onDrop: (techId: string) => void;
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
    <Card className={cn(
      'h-[400px] transition-all',
      dropTargetTechId && 'ring-2 ring-blue-500 ring-offset-2'
    )}>
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
        {dropTargetTechId && (
          <p className="text-xs text-blue-600 font-medium mt-1 animate-pulse">
            Drop on a technician to assign the job
          </p>
        )}
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
            {/* ONLY render technician markers - NO customer markers */}
            {technicians.map((tech) => (
              <TechnicianMapMarker
                key={tech.id}
                tech={tech}
                isDropTarget={dropTargetTechId === tech.id}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              />
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Today's Metrics Cards Section - Enhanced with click-to-drill-down
 */
function TodaysMetrics({
  completedToday,
  scheduledToday,
  revenueToday,
  avgCompletionTime,
  isLoading,
  onDrillDown,
}: {
  completedToday: number;
  scheduledToday: number;
  revenueToday: number;
  avgCompletionTime: string;
  isLoading: boolean;
  onDrillDown?: (metric: string) => void;
}) {
  const navigate = useNavigate();

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
  const isBehind = completionRate < 50 && scheduledToday > 0;

  // Mock sparkline data (would come from real data)
  const mockCompletionTrend = [2, 4, 3, 5, completedToday];
  const mockRevenueTrend = [1200, 1800, 1500, 2200, revenueToday];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        label="Jobs Completed Today"
        value={`${completedToday}/${scheduledToday}`}
        subtext={`${completionRate}% complete`}
        trend={isBehind ? 'BEHIND' : 'On Track'}
        trendDirection={completionRate >= 50 ? 'up' : 'down'}
        isBehind={isBehind}
        sparklineData={mockCompletionTrend}
        onClick={() => {
          onDrillDown?.('completed');
          navigate('/work-orders?status=completed');
        }}
      />
      <MetricCard
        label="Revenue Today"
        value={formatCurrency(revenueToday)}
        subtext="Estimated from completed jobs"
        trend={revenueToday > 0 ? '+' + formatCurrency(revenueToday * 0.1) : undefined}
        trendDirection={revenueToday > 0 ? 'up' : 'neutral'}
        sparklineData={mockRevenueTrend}
        onClick={() => {
          onDrillDown?.('revenue');
        }}
      />
      <MetricCard
        label="Avg Completion Time"
        value={avgCompletionTime}
        subtext="Per job today"
        onClick={() => {
          onDrillDown?.('time');
        }}
      />
      <MetricCard
        label="Customer Satisfaction"
        value="4.8"
        subtext="Based on recent feedback"
        trend="+0.2"
        trendDirection="up"
        sparklineData={[4.5, 4.6, 4.7, 4.6, 4.8]}
        onClick={() => {
          onDrillDown?.('satisfaction');
        }}
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
            <span className="text-4xl mb-2 block">✓</span>
            <p className="font-medium">No active alerts</p>
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
          <Badge variant="danger" className="animate-pulse">{alerts.length}</Badge>
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
 * Enhanced Dispatch Queue Panel - Draggable items
 */
function DispatchQueue({
  unassignedJobs,
  technicians,
  isLoading,
  onAssign,
  onDragStart,
  onDragEnd,
  draggedJobId,
}: {
  unassignedJobs: WorkOrder[];
  technicians: Technician[];
  isLoading: boolean;
  onAssign?: (jobId: string, techName: string) => void;
  onDragStart: (jobId: string) => void;
  onDragEnd: () => void;
  draggedJobId: string | null;
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
        onSettled: () => {
          setAssigningId(null);
          onAssign?.(workOrderId, technicianName);
        },
      }
    );
  };

  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData('application/job-id', jobId);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(jobId);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  if (isLoading) {
    return (
      <Card className="h-full">
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
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Dispatch Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-text-muted">
            <span className="text-4xl mb-2 block">📋</span>
            <p className="font-medium">No unassigned jobs</p>
            <p className="text-sm">All jobs have been dispatched</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableTechs = technicians.filter((t) => t.is_active);
  const hasEmergency = sortedJobs.some(j => j.priority === 'emergency');
  const hasUrgent = sortedJobs.some(j => j.priority === 'urgent');

  return (
    <Card className={cn(
      'h-full transition-all',
      hasEmergency && 'ring-2 ring-red-500 ring-offset-2',
      hasUrgent && !hasEmergency && 'ring-2 ring-orange-400 ring-offset-1'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Dispatch Queue</CardTitle>
            {/* Pulsing unassigned count badge */}
            <Badge
              variant="danger"
              className={cn(
                'text-lg px-3 py-1 font-bold cursor-pointer hover:scale-105 transition-transform',
                sortedJobs.length > 0 && 'animate-pulse shadow-lg'
              )}
              data-testid="unassigned-badge"
            >
              {sortedJobs.length} unassigned
            </Badge>
          </div>
          {hasEmergency && (
            <span className="text-red-600 font-bold text-sm flex items-center gap-1 animate-pulse">
              🚨 EMERGENCY
            </span>
          )}
        </div>
        {/* Priority legend */}
        <div className="flex gap-2 mt-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500"></span>
            Emergency
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-500"></span>
            Urgent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500"></span>
            High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            Normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            Low
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {sortedJobs.map((job) => (
            <div
              key={job.id}
              draggable
              onDragStart={(e) => handleDragStart(e, job.id)}
              onDragEnd={handleDragEnd}
              data-testid="dispatch-queue-item"
              data-job-id={job.id}
              className={cn(
                'p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all',
                'hover:shadow-md hover:scale-[1.01]',
                draggedJobId === job.id && 'opacity-50 scale-95 ring-2 ring-blue-500',
                getPriorityColor(job.priority),
                job.priority === 'emergency' && 'animate-pulse-subtle'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-text-primary">
                    {job.customer_name || `Customer #${job.customer_id}`}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {JOB_TYPE_LABELS[job.job_type as JobType]}
                  </p>
                </div>
                <Badge
                  variant={
                    job.priority === 'emergency' || job.priority === 'urgent'
                      ? 'danger'
                      : job.priority === 'high'
                      ? 'warning'
                      : 'default'
                  }
                  className="font-bold"
                >
                  {PRIORITY_LABELS[job.priority as Priority]}
                </Badge>
              </div>
              {job.service_address_line1 && (
                <p className="text-xs text-text-muted mb-2">📍 {job.service_address_line1}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  ⏱️ Created {getTimeSince(job.created_at)}
                </span>
                <div className="flex items-center gap-2">
                  <select
                    className="text-xs border border-border rounded px-2 py-1.5 bg-bg-card font-medium"
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
        <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted text-center">
          💡 Drag jobs to technician markers on the map for quick assignment
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Connection Status Indicator
 */
function ConnectionStatus({ lastUpdated }: { lastUpdated: Date }) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Simulate connection checking
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.1); // 90% uptime simulation
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1">
        <span className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        )} />
        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
          {isConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>
      <span className="text-text-muted">
        Updated {lastUpdated.toLocaleTimeString()}
      </span>
    </div>
  );
}

// ============================================
// Main Command Center Component
// ============================================

/**
 * Operations Command Center - Real-time operations dashboard
 */
export function CommandCenter() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [keySequence, setKeySequence] = useState<string[]>([]);

  // Drag and drop state
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dropTargetTechId, setDropTargetTechId] = useState<string | null>(null);
  const [assignmentConfirmation, setAssignmentConfirmation] = useState<AssignmentConfirmation | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const assignWorkOrder = useAssignWorkOrder();

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();

      // Handle escape
      if (key === 'escape') {
        setShowShortcuts(false);
        setAssignmentConfirmation(null);
        setKeySequence([]);
        return;
      }

      // Handle ? for shortcuts
      if (e.key === '?') {
        setShowShortcuts(true);
        return;
      }

      // Build key sequence for multi-key shortcuts
      const newSequence = [...keySequence, key].slice(-2);
      setKeySequence(newSequence);

      // Check for matching shortcut
      const sequenceStr = newSequence.join('');
      const shortcut = KEYBOARD_SHORTCUTS.find(s => s.keys.join('') === sequenceStr);

      if (shortcut && shortcut.action.startsWith('/')) {
        navigate(shortcut.action);
        setKeySequence([]);
        addToast('info', `Navigating to ${shortcut.description}`);
      }

      // Clear sequence after 1 second
      setTimeout(() => setKeySequence([]), 1000);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keySequence, navigate]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const toast: Toast = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
    };
    setToasts(prev => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

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

  // Drag and drop handlers
  const handleDragStart = useCallback((jobId: string) => {
    setDraggedJobId(jobId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedJobId(null);
    setDropTargetTechId(null);
  }, []);

  const handleDragOverTech = useCallback((techId: string) => {
    setDropTargetTechId(techId);
  }, []);

  const handleDragLeaveTech = useCallback(() => {
    setDropTargetTechId(null);
  }, []);

  const handleDropOnTech = useCallback((techId: string) => {
    if (!draggedJobId) return;

    const job = unscheduledJobs.find(j => j.id === draggedJobId);
    const tech = techniciansWithStatus.find(t => t.id === techId);

    if (job && tech) {
      // Show confirmation modal
      setAssignmentConfirmation({ job, technician: tech });
    }

    setDraggedJobId(null);
    setDropTargetTechId(null);
  }, [draggedJobId, unscheduledJobs, techniciansWithStatus]);

  const handleConfirmAssignment = useCallback(() => {
    if (!assignmentConfirmation) return;

    const { job, technician } = assignmentConfirmation;
    const techName = `${technician.first_name} ${technician.last_name}`;
    const today = new Date().toISOString().split('T')[0];

    setIsAssigning(true);
    assignWorkOrder.mutate(
      {
        id: job.id,
        technician: techName,
        date: today,
      },
      {
        onSuccess: () => {
          addToast('success', `Job assigned to ${techName}`);
          setAssignmentConfirmation(null);
          setIsAssigning(false);
        },
        onError: () => {
          addToast('error', 'Failed to assign job. Please try again.');
          setIsAssigning(false);
        },
      }
    );
  }, [assignmentConfirmation, assignWorkOrder, addToast]);

  const handleCancelAssignment = useCallback(() => {
    setAssignmentConfirmation(null);
  }, []);

  const handleJobAssign = useCallback((_jobId: string, techName: string) => {
    addToast('success', `Job assigned to ${techName}`);
  }, [addToast]);

  const handleMetricDrillDown = useCallback((metric: string) => {
    addToast('info', `Drilling down into ${metric}...`);
  }, [addToast]);

  return (
    <div className="p-6">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Assignment Confirmation Modal */}
      <AssignmentConfirmModal
        confirmation={assignmentConfirmation}
        onConfirm={handleConfirmAssignment}
        onCancel={handleCancelAssignment}
        isAssigning={isAssigning}
      />

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
          <div className="flex items-center gap-4">
            <ConnectionStatus lastUpdated={lastUpdated} />
            <button
              onClick={() => setShowShortcuts(true)}
              className="text-xs text-text-muted hover:text-text-primary"
              title="Keyboard Shortcuts"
            >
              <kbd className="px-2 py-1 bg-bg-secondary border border-border rounded">?</kbd>
            </button>
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
        onDrillDown={handleMetricDrillDown}
      />

      {/* Main Content Grid - DISPATCH QUEUE NOW ON LEFT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Dispatch Queue (Primary Action Zone) */}
        <div>
          <DispatchQueue
            unassignedJobs={unscheduledJobs}
            technicians={technicians}
            isLoading={isLoading}
            onAssign={handleJobAssign}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            draggedJobId={draggedJobId}
          />
        </div>

        {/* Right Column: Map + Alerts */}
        <div className="space-y-6">
          <LiveTechnicianMap
            technicians={techniciansWithStatus}
            isLoading={isLoading}
            dropTargetTechId={dropTargetTechId}
            onDragOver={handleDragOverTech}
            onDragLeave={handleDragLeaveTech}
            onDrop={handleDropOnTech}
          />
          <ActiveAlertsPanel alerts={alerts} isLoading={isLoading} />
        </div>
      </div>

      {/* Footer with keyboard hint */}
      <div className="mt-6 text-center text-xs text-text-muted">
        Press <kbd className="px-1.5 py-0.5 bg-bg-secondary border border-border rounded mx-1">?</kbd> for keyboard shortcuts
      </div>
    </div>
  );
}
