import { Badge } from '@/components/ui/Badge.tsx';
import { EQUIPMENT_STATUS_LABELS, type EquipmentStatus } from '@/api/types/equipment.ts';

interface EquipmentStatusBadgeProps {
  status: EquipmentStatus;
  className?: string;
}

/**
 * Equipment status badge with color coding
 */
export function EquipmentStatusBadge({ status, className }: EquipmentStatusBadgeProps) {
  const variantMap: Record<EquipmentStatus, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
    available: 'success',
    in_use: 'info',
    maintenance: 'warning',
    retired: 'default',
  };

  return (
    <Badge variant={variantMap[status]} className={className}>
      {EQUIPMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
