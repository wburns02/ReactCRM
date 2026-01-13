import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useEquipment } from "@/api/hooks/useEquipment.ts";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { cn, formatDate } from "@/lib/utils.ts";
import { useAIAnalyze } from "@/hooks/useAI";
import type { Equipment } from "@/api/types/equipment.ts";
import type { WorkOrder } from "@/api/types/workOrder.ts";

/**
 * Equipment health score factors and weights
 */
interface HealthFactors {
  ageScore: number; // Based on equipment age (newer = higher)
  maintenanceScore: number; // Based on maintenance history
  reliabilityScore: number; // Based on work order history
  statusScore: number; // Based on current status
}

interface EquipmentHealth {
  equipment: Equipment;
  healthScore: number;
  factors: HealthFactors;
  lastServiceDate: string | null;
  nextRecommendedService: string;
  predictedReplacementDate: string | null;
  riskFactors: string[];
  recommendations: string[];
}

/**
 * AI Predictive Maintenance Panel
 */
interface AIPredictiveMaintenanceProps {
  stats: { critical: number; warning: number; good: number; avgHealth: number; total: number };
  equipmentHealth: EquipmentHealth[];
}

function AIPredictiveMaintenance({ stats, equipmentHealth }: AIPredictiveMaintenanceProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const analyzeAI = useAIAnalyze();

  const generateInsights = async () => {
    const criticalEquipment = equipmentHealth.filter(eh => eh.healthScore < 50);
    const upcomingMaintenance = equipmentHealth.filter(eh => {
      const nextService = new Date(eh.nextRecommendedService);
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
      return nextService <= twoWeeksFromNow;
    });

    try {
      const result = await analyzeAI.mutateAsync({
        type: "maintenance",
        data: {
          total_equipment: stats.total,
          critical_count: stats.critical,
          warning_count: stats.warning,
          good_count: stats.good,
          avg_health: stats.avgHealth,
          critical_equipment: criticalEquipment.map(eh => ({
            name: eh.equipment.name,
            type: eh.equipment.type,
            health: eh.healthScore,
            risks: eh.riskFactors,
          })),
          upcoming_maintenance: upcomingMaintenance.length,
        },
        question: "Analyze equipment fleet health and provide predictive maintenance recommendations",
      });
      const formatted = result.analysis ||
        (result.summary + "\n\n" + (result.insights || []).join("\n"));
      setInsights(formatted || "Analysis complete.");
    } catch {
      setInsights(generateDemoMaintenanceInsights(stats, equipmentHealth));
    }
  };

  function generateDemoMaintenanceInsights(
    s: typeof stats,
    health: EquipmentHealth[]
  ): string {
    const criticalItems = health.filter(eh => eh.healthScore < 50);
    const overdueItems = health.filter(eh => {
      if (!eh.equipment.next_maintenance) return false;
      return new Date(eh.equipment.next_maintenance) < new Date();
    });

    let insights = `**AI Predictive Maintenance Analysis (Demo Mode)**\n\n`;
    insights += `**Fleet Overview:**\n`;
    insights += `- Total Equipment: ${s.total}\n`;
    insights += `- Average Fleet Health: ${s.avgHealth.toFixed(0)}%\n`;
    insights += `- Critical Items: ${s.critical}\n`;
    insights += `- Needs Attention: ${s.warning}\n\n`;

    if (criticalItems.length > 0) {
      insights += `**Immediate Action Required:**\n`;
      criticalItems.slice(0, 3).forEach(item => {
        insights += `- ${item.equipment.name}: Health ${item.healthScore}% - ${item.riskFactors[0] || "Needs inspection"}\n`;
      });
      insights += `\n`;
    }

    if (overdueItems.length > 0) {
      insights += `**Overdue Maintenance (${overdueItems.length} items):**\n`;
      insights += `Schedule maintenance for these items immediately to prevent failures.\n\n`;
    }

    insights += `**AI Predictions:**\n`;
    if (s.critical > 0) {
      insights += `- ${s.critical} equipment items at risk of failure within 30 days\n`;
    }
    if (s.avgHealth < 70) {
      insights += `- Fleet health below target. Recommend increasing maintenance frequency\n`;
    }
    if (s.avgHealth >= 80) {
      insights += `- Fleet is in good condition. Continue current maintenance schedule\n`;
    }

    insights += `\n**Recommendations:**\n`;
    insights += `1. ${s.critical > 0 ? "Address critical equipment immediately" : "No critical items - maintain current schedule"}\n`;
    insights += `2. ${s.warning > 2 ? "Schedule batch maintenance for warning items" : "Warning items are manageable"}\n`;
    insights += `3. Consider predictive replacement for equipment older than 8 years\n`;

    return insights;
  }

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>Get AI Predictive Maintenance Insights</span>
      </button>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>✨</span>
            AI Predictive Maintenance
          </CardTitle>
          <button
            onClick={() => setShowPanel(false)}
            className="text-text-muted hover:text-text-primary text-sm"
          >
            Close
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {!insights ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              AI will analyze your equipment fleet and provide predictive maintenance recommendations.
            </p>
            <Button
              onClick={generateInsights}
              disabled={analyzeAI.isPending}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {analyzeAI.isPending ? "Analyzing Fleet..." : "Analyze Equipment Fleet"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-text-secondary whitespace-pre-wrap">
              {insights}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={generateInsights}
              disabled={analyzeAI.isPending}
            >
              {analyzeAI.isPending ? "..." : "Refresh Analysis"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Model reliability ratings (mock data - in production, this would come from historical analysis)
 */
const MODEL_RELIABILITY: Record<string, number> = {
  pump: 85,
  vacuum: 80,
  camera: 90,
  truck: 75,
  trailer: 85,
  hydro_jetter: 78,
  locator: 92,
  generator: 82,
  compressor: 80,
  default: 80,
};

/**
 * Calculate health score for equipment
 */
function calculateEquipmentHealth(
  equipment: Equipment,
  workOrders: WorkOrder[],
): EquipmentHealth {
  const now = new Date();
  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  // Age score (0-100)
  // Assume average equipment lifespan is 10 years
  let ageScore = 100;
  if (equipment.created_at) {
    const ageInYears =
      (now.getTime() - new Date(equipment.created_at).getTime()) /
      (365 * 24 * 60 * 60 * 1000);
    ageScore = Math.max(0, 100 - ageInYears * 10);
    if (ageInYears > 7) {
      riskFactors.push(`Equipment is ${ageInYears.toFixed(1)} years old`);
      recommendations.push(
        "Consider planning for replacement within next 2-3 years",
      );
    } else if (ageInYears > 5) {
      recommendations.push("Schedule comprehensive inspection");
    }
  }

  // Maintenance score (0-100)
  let maintenanceScore = 50; // Default if no maintenance data
  if (equipment.last_maintenance && equipment.next_maintenance) {
    const lastMaintenance = new Date(equipment.last_maintenance);
    const nextMaintenance = new Date(equipment.next_maintenance);
    const daysSinceLastMaintenance =
      (now.getTime() - lastMaintenance.getTime()) / (24 * 60 * 60 * 1000);
    const daysUntilNextMaintenance =
      (nextMaintenance.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

    if (daysUntilNextMaintenance < 0) {
      // Overdue maintenance
      maintenanceScore = Math.max(0, 50 - Math.abs(daysUntilNextMaintenance));
      riskFactors.push(
        `Maintenance overdue by ${Math.abs(daysUntilNextMaintenance).toFixed(0)} days`,
      );
      recommendations.push("Schedule maintenance immediately");
    } else if (daysUntilNextMaintenance < 14) {
      maintenanceScore = 60;
      recommendations.push("Maintenance due soon - schedule within 2 weeks");
    } else if (daysSinceLastMaintenance < 30) {
      maintenanceScore = 100;
    } else if (daysSinceLastMaintenance < 90) {
      maintenanceScore = 85;
    } else {
      maintenanceScore = 70;
    }
  } else if (!equipment.last_maintenance) {
    riskFactors.push("No maintenance history recorded");
    recommendations.push("Schedule initial maintenance check");
    maintenanceScore = 40;
  }

  // Reliability score based on work order history
  // Look for repair/maintenance work orders related to this equipment
  const relatedWorkOrders = workOrders.filter(
    (wo) =>
      wo.notes?.toLowerCase().includes(equipment.name.toLowerCase()) ||
      wo.notes
        ?.toLowerCase()
        .includes(equipment.serial_number?.toLowerCase() || ""),
  );

  const recentRepairs = relatedWorkOrders.filter((wo) => {
    if (!wo.scheduled_date) return false;
    const woDate = new Date(wo.scheduled_date);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    return woDate >= sixMonthsAgo && wo.job_type === "repair";
  });

  let reliabilityScore =
    MODEL_RELIABILITY[equipment.type.toLowerCase()] ||
    MODEL_RELIABILITY.default;
  if (recentRepairs.length > 2) {
    reliabilityScore -= 20;
    riskFactors.push(`${recentRepairs.length} repairs in last 6 months`);
    recommendations.push("Investigate recurring issues");
  } else if (recentRepairs.length > 0) {
    reliabilityScore -= 10;
  }

  // Status score
  let statusScore = 100;
  switch (equipment.status) {
    case "available":
      statusScore = 100;
      break;
    case "in_use":
      statusScore = 90;
      break;
    case "maintenance":
      statusScore = 50;
      riskFactors.push("Currently under maintenance");
      break;
    case "retired":
      statusScore = 0;
      riskFactors.push("Equipment is retired");
      break;
  }

  // Calculate overall health score (weighted average)
  const weights = {
    age: 0.2,
    maintenance: 0.35,
    reliability: 0.3,
    status: 0.15,
  };

  const healthScore = Math.round(
    ageScore * weights.age +
      maintenanceScore * weights.maintenance +
      reliabilityScore * weights.reliability +
      statusScore * weights.status,
  );

  // Calculate predicted replacement date
  let predictedReplacementDate: string | null = null;
  if (equipment.created_at && healthScore < 50) {
    // Already in poor health, predict replacement soon
    const replacementDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    predictedReplacementDate = replacementDate.toISOString().split("T")[0];
  } else if (equipment.created_at) {
    // Estimate based on typical lifespan
    const purchaseDate = new Date(equipment.created_at);
    const estimatedLifespan = 10; // years
    const replacementDate = new Date(
      purchaseDate.getTime() + estimatedLifespan * 365 * 24 * 60 * 60 * 1000,
    );
    if (replacementDate > now) {
      predictedReplacementDate = replacementDate.toISOString().split("T")[0];
    }
  }

  // Calculate next recommended service
  let nextRecommendedService: string;
  if (equipment.next_maintenance) {
    nextRecommendedService = equipment.next_maintenance;
  } else {
    // Default to 90 days from now
    const serviceDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    nextRecommendedService = serviceDate.toISOString().split("T")[0];
  }

  return {
    equipment,
    healthScore,
    factors: {
      ageScore,
      maintenanceScore,
      reliabilityScore,
      statusScore,
    },
    lastServiceDate: equipment.last_maintenance,
    nextRecommendedService,
    predictedReplacementDate,
    riskFactors,
    recommendations,
  };
}

type SortField = "health" | "name" | "lastService" | "nextService";
type HealthFilter = "all" | "critical" | "warning" | "good";

/**
 * EquipmentHealthPage - Equipment health monitoring dashboard
 *
 * Features:
 * - Health score calculation (0-100) for all equipment
 * - Color-coded health indicators
 * - Factor breakdown (age, maintenance, reliability)
 * - Maintenance recommendations
 * - Predicted replacement dates
 */
export function EquipmentHealthPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("health");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(
    null,
  );

  // Fetch equipment and work orders
  const { data: equipmentData, isLoading: equipmentLoading } = useEquipment({
    page: 1,
    page_size: 200,
  });
  const { data: workOrdersData } = useWorkOrders({
    page: 1,
    page_size: 500,
  });

  // Calculate health for all equipment
  const equipmentHealth = useMemo(() => {
    const equipment = equipmentData?.items || [];
    const workOrders = workOrdersData?.items || [];
    return equipment.map((eq) => calculateEquipmentHealth(eq, workOrders));
  }, [equipmentData, workOrdersData]);

  // Filter and sort
  const filteredEquipment = useMemo(() => {
    let filtered = equipmentHealth;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (eh) =>
          eh.equipment.name.toLowerCase().includes(query) ||
          eh.equipment.type.toLowerCase().includes(query) ||
          eh.equipment.serial_number?.toLowerCase().includes(query),
      );
    }

    // Health filter
    switch (healthFilter) {
      case "critical":
        filtered = filtered.filter((eh) => eh.healthScore < 50);
        break;
      case "warning":
        filtered = filtered.filter(
          (eh) => eh.healthScore >= 50 && eh.healthScore < 80,
        );
        break;
      case "good":
        filtered = filtered.filter((eh) => eh.healthScore >= 80);
        break;
    }

    // Sort
    switch (sortBy) {
      case "health":
        filtered.sort((a, b) => a.healthScore - b.healthScore);
        break;
      case "name":
        filtered.sort((a, b) =>
          a.equipment.name.localeCompare(b.equipment.name),
        );
        break;
      case "lastService":
        filtered.sort((a, b) => {
          if (!a.lastServiceDate && !b.lastServiceDate) return 0;
          if (!a.lastServiceDate) return 1;
          if (!b.lastServiceDate) return -1;
          return (
            new Date(a.lastServiceDate).getTime() -
            new Date(b.lastServiceDate).getTime()
          );
        });
        break;
      case "nextService":
        filtered.sort((a, b) => {
          return (
            new Date(a.nextRecommendedService).getTime() -
            new Date(b.nextRecommendedService).getTime()
          );
        });
        break;
    }

    return filtered;
  }, [equipmentHealth, searchQuery, healthFilter, sortBy]);

  // Summary stats
  const stats = useMemo(() => {
    const critical = equipmentHealth.filter((eh) => eh.healthScore < 50).length;
    const warning = equipmentHealth.filter(
      (eh) => eh.healthScore >= 50 && eh.healthScore < 80,
    ).length;
    const good = equipmentHealth.filter((eh) => eh.healthScore >= 80).length;
    const avgHealth =
      equipmentHealth.reduce((sum, eh) => sum + eh.healthScore, 0) /
      (equipmentHealth.length || 1);

    return {
      critical,
      warning,
      good,
      avgHealth,
      total: equipmentHealth.length,
    };
  }, [equipmentHealth]);

  // Get health color
  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-danger";
  };

  const getHealthBadgeVariant = (
    score: number,
  ): "success" | "warning" | "danger" => {
    if (score >= 80) return "success";
    if (score >= 50) return "warning";
    return "danger";
  };

  if (equipmentLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-muted w-64 mb-6 rounded" />
          <div className="grid grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-bg-muted rounded" />
            ))}
          </div>
          <div className="h-96 bg-bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            to="/equipment"
            className="text-sm text-primary hover:underline mb-2 inline-block"
          >
            &larr; Back to Equipment
          </Link>
          <h1 className="text-2xl font-semibold text-text-primary">
            Equipment Health Dashboard
          </h1>
          <p className="text-text-secondary mt-1">
            Monitor equipment condition and plan maintenance
          </p>
        </div>
      </div>

      {/* AI Predictive Maintenance */}
      <div className="mb-6">
        <AIPredictiveMaintenance stats={stats} equipmentHealth={equipmentHealth} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary">Total Equipment</p>
            <p className="text-3xl font-bold text-text-primary mt-2">
              {stats.total}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary">Average Health</p>
            <p
              className={cn(
                "text-3xl font-bold mt-2",
                getHealthColor(stats.avgHealth),
              )}
            >
              {stats.avgHealth.toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-colors",
            healthFilter === "good" && "ring-2 ring-success",
          )}
          onClick={() =>
            setHealthFilter(healthFilter === "good" ? "all" : "good")
          }
        >
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary">Good Health (&gt;80%)</p>
            <p className="text-3xl font-bold text-success mt-2">{stats.good}</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-colors",
            healthFilter === "warning" && "ring-2 ring-warning",
          )}
          onClick={() =>
            setHealthFilter(healthFilter === "warning" ? "all" : "warning")
          }
        >
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary">
              Needs Attention (50-80%)
            </p>
            <p className="text-3xl font-bold text-warning mt-2">
              {stats.warning}
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-colors",
            healthFilter === "critical" && "ring-2 ring-danger",
          )}
          onClick={() =>
            setHealthFilter(healthFilter === "critical" ? "all" : "critical")
          }
        >
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary">Critical (&lt;50%)</p>
            <p className="text-3xl font-bold text-danger mt-2">
              {stats.critical}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="text"
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-48"
            >
              <option value="health">Sort by Health (Low to High)</option>
              <option value="name">Sort by Name</option>
              <option value="lastService">Sort by Last Service</option>
              <option value="nextService">Sort by Next Service</option>
            </Select>
            {healthFilter !== "all" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setHealthFilter("all")}
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Equipment List */}
      <div className="space-y-4">
        {filteredEquipment.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-text-muted">
                No equipment found matching your criteria
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEquipment.map((eh) => (
            <Card
              key={eh.equipment.id}
              className={cn(
                "cursor-pointer transition-all",
                selectedEquipment === eh.equipment.id
                  ? "ring-2 ring-primary"
                  : "hover:border-primary/50",
              )}
              onClick={() =>
                setSelectedEquipment(
                  selectedEquipment === eh.equipment.id
                    ? null
                    : eh.equipment.id,
                )
              }
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Health Score Circle */}
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          className="text-bg-muted"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${(eh.healthScore / 100) * 176} 176`}
                          strokeLinecap="round"
                          className={getHealthColor(eh.healthScore)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className={cn(
                            "text-lg font-bold",
                            getHealthColor(eh.healthScore),
                          )}
                        >
                          {eh.healthScore}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-text-primary">
                          {eh.equipment.name}
                        </h3>
                        <Badge variant={getHealthBadgeVariant(eh.healthScore)}>
                          {eh.healthScore >= 80
                            ? "Good"
                            : eh.healthScore >= 50
                              ? "Fair"
                              : "Poor"}
                        </Badge>
                        <Badge variant="default">{eh.equipment.status}</Badge>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {eh.equipment.type}
                        {eh.equipment.serial_number &&
                          ` - S/N: ${eh.equipment.serial_number}`}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                        <span>
                          Last Service:{" "}
                          {eh.lastServiceDate
                            ? formatDate(eh.lastServiceDate)
                            : "Never"}
                        </span>
                        <span>
                          Next Service: {formatDate(eh.nextRecommendedService)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Risk Indicators */}
                  {eh.riskFactors.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="danger">
                        {eh.riskFactors.length} Risk Factor
                        {eh.riskFactors.length > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {selectedEquipment === eh.equipment.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                      {/* Factor Breakdown */}
                      <div>
                        <h4 className="text-sm font-medium text-text-primary mb-2">
                          Health Factors
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">Age</span>
                            <span
                              className={getHealthColor(eh.factors.ageScore)}
                            >
                              {eh.factors.ageScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">
                              Maintenance
                            </span>
                            <span
                              className={getHealthColor(
                                eh.factors.maintenanceScore,
                              )}
                            >
                              {eh.factors.maintenanceScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">
                              Reliability
                            </span>
                            <span
                              className={getHealthColor(
                                eh.factors.reliabilityScore,
                              )}
                            >
                              {eh.factors.reliabilityScore.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">Status</span>
                            <span
                              className={getHealthColor(eh.factors.statusScore)}
                            >
                              {eh.factors.statusScore.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Predicted Replacement */}
                      <div>
                        <h4 className="text-sm font-medium text-text-primary mb-2">
                          Lifecycle
                        </h4>
                        <div className="space-y-2 text-sm">
                          {eh.equipment.created_at && (
                            <p className="text-text-secondary">
                              In service since:{" "}
                              {formatDate(eh.equipment.created_at)}
                            </p>
                          )}
                          {eh.predictedReplacementDate && (
                            <p className="text-text-secondary">
                              Est. replacement:{" "}
                              {formatDate(eh.predictedReplacementDate)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Risk Factors */}
                      {eh.riskFactors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-text-primary mb-2">
                            Risk Factors
                          </h4>
                          <ul className="space-y-1">
                            {eh.riskFactors.map((risk, i) => (
                              <li
                                key={i}
                                className="text-sm text-danger flex items-start gap-2"
                              >
                                <span className="text-danger">!</span>
                                {risk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {eh.recommendations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-text-primary mb-2">
                            Recommendations
                          </h4>
                          <ul className="space-y-1">
                            {eh.recommendations.map((rec, i) => (
                              <li
                                key={i}
                                className="text-sm text-text-secondary flex items-start gap-2"
                              >
                                <span className="text-primary">-</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/equipment/${eh.equipment.id}`}>
                        <Button size="sm" variant="secondary">
                          View Details
                        </Button>
                      </Link>
                      <Button size="sm" variant="secondary">
                        Schedule Maintenance
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
