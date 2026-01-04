import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { cn, formatDate } from '@/lib/utils.ts';
import type { Equipment } from '@/api/types/equipment.ts';

interface EquipmentHealthCardProps {
  /** Equipment item to display */
  equipment: Equipment;
  /** Optional class name */
  className?: string;
  /** Whether to show detailed breakdown */
  detailed?: boolean;
  /** Whether clicking navigates to health dashboard */
  linkToHealth?: boolean;
}

interface HealthData {
  healthScore: number;
  lastServiceDate: string | null;
  nextRecommendedService: string;
  riskFactors: string[];
}

/**
 * Calculate health score for a single equipment item
 */
function calculateHealth(equipment: Equipment): HealthData {
  const now = new Date();
  const riskFactors: string[] = [];

  // Age score (0-100)
  let ageScore = 100;
  if (equipment.created_at) {
    const ageInYears = (now.getTime() - new Date(equipment.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000);
    ageScore = Math.max(0, 100 - (ageInYears * 10));
    if (ageInYears > 7) {
      riskFactors.push('Equipment age exceeds 7 years');
    }
  }

  // Maintenance score (0-100)
  let maintenanceScore = 50;
  if (equipment.last_maintenance && equipment.next_maintenance) {
    const nextMaintenance = new Date(equipment.next_maintenance);
    const daysUntilNextMaintenance = (nextMaintenance.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

    if (daysUntilNextMaintenance < 0) {
      maintenanceScore = Math.max(0, 50 - Math.abs(daysUntilNextMaintenance));
      riskFactors.push('Maintenance overdue');
    } else if (daysUntilNextMaintenance < 14) {
      maintenanceScore = 60;
      riskFactors.push('Maintenance due soon');
    } else {
      maintenanceScore = 90;
    }
  } else if (!equipment.last_maintenance) {
    riskFactors.push('No maintenance history');
    maintenanceScore = 40;
  }

  // Status score
  let statusScore = 100;
  switch (equipment.status) {
    case 'available':
      statusScore = 100;
      break;
    case 'in_use':
      statusScore = 90;
      break;
    case 'maintenance':
      statusScore = 50;
      riskFactors.push('Under maintenance');
      break;
    case 'retired':
      statusScore = 0;
      riskFactors.push('Equipment retired');
      break;
  }

  // Overall health score
  const healthScore = Math.round(
    ageScore * 0.25 +
    maintenanceScore * 0.45 +
    statusScore * 0.30
  );

  // Calculate next recommended service
  let nextRecommendedService: string;
  if (equipment.next_maintenance) {
    nextRecommendedService = equipment.next_maintenance;
  } else {
    const serviceDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    nextRecommendedService = serviceDate.toISOString().split('T')[0];
  }

  return {
    healthScore,
    lastServiceDate: equipment.last_maintenance,
    nextRecommendedService,
    riskFactors,
  };
}

/**
 * EquipmentHealthCard - Display health information for a single equipment item
 *
 * Features:
 * - Health score gauge (0-100)
 * - Last and next service dates
 * - Risk factors
 * - Color-coded status
 */
export function EquipmentHealthCard({
  equipment,
  className,
  detailed = false,
  linkToHealth = false,
}: EquipmentHealthCardProps) {
  const health = useMemo(() => calculateHealth(equipment), [equipment]);

  // Get health color
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };

  const getHealthBadgeVariant = (score: number): 'success' | 'warning' | 'danger' => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const cardContent = (
    <Card className={cn(
      linkToHealth && 'cursor-pointer hover:border-primary transition-colors',
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{equipment.name}</CardTitle>
          <Badge variant={getHealthBadgeVariant(health.healthScore)}>
            {getHealthLabel(health.healthScore)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          {/* Health Score Circle */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-bg-muted"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${(health.healthScore / 100) * 151} 151`}
                strokeLinecap="round"
                className={getHealthColor(health.healthScore)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn('text-sm font-bold', getHealthColor(health.healthScore))}>
                {health.healthScore}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-muted mb-2">{equipment.type}</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Last Service:</span>
                <span className="text-text-primary font-medium">
                  {health.lastServiceDate ? formatDate(health.lastServiceDate) : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Next Service:</span>
                <span className={cn(
                  'font-medium',
                  new Date(health.nextRecommendedService) < new Date()
                    ? 'text-danger'
                    : 'text-text-primary'
                )}>
                  {formatDate(health.nextRecommendedService)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Factors (if detailed) */}
        {detailed && health.riskFactors.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-medium text-text-primary mb-1">Risk Factors:</p>
            <ul className="space-y-1">
              {health.riskFactors.map((risk, i) => (
                <li key={i} className="text-xs text-danger flex items-start gap-1">
                  <span>!</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Simple risk indicator (if not detailed) */}
        {!detailed && health.riskFactors.length > 0 && (
          <div className="mt-2">
            <Badge variant="danger" className="text-xs">
              {health.riskFactors.length} risk factor{health.riskFactors.length > 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (linkToHealth) {
    return (
      <Link to="/equipment/health" className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
