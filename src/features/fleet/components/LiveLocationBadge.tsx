import { Badge } from '@/components/ui/Badge.tsx';
import { useFleetLocations } from '../api.ts';

interface LiveLocationBadgeProps {
  driverId?: string;
  driverName?: string;
}

/**
 * Small badge showing tech's last known location
 * Can be used in technician cards or work order details
 */
export function LiveLocationBadge({ driverId, driverName: _driverName }: LiveLocationBadgeProps) {
  const { data: vehicles, isLoading } = useFleetLocations();

  if (isLoading || !vehicles || !driverId) {
    return null;
  }

  const vehicle = vehicles.find((v) => v.driver_id === driverId);

  if (!vehicle) {
    return null;
  }

  const formatLastUpdate = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={
          vehicle.status === 'moving'
            ? 'success'
            : vehicle.status === 'stopped'
              ? 'danger'
              : 'default'
        }
        className="text-xs"
      >
        📍 {vehicle.status === 'moving' ? 'En Route' : 'Stopped'}
      </Badge>
      <span className="text-xs text-text-muted">
        {formatLastUpdate(vehicle.location.updated_at)}
      </span>
    </div>
  );
}
