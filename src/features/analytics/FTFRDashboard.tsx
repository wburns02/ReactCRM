import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { cn, formatDate } from "@/lib/utils.ts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { WorkOrder } from "@/api/types/workOrder.ts";
import { JOB_TYPE_LABELS, type JobType } from "@/api/types/workOrder.ts";

/**
 * Time period options for FTFR analysis
 */
type TimePeriod = "week" | "month" | "quarter" | "year";

interface FTFRMetrics {
  totalJobs: number;
  firstTimeFixCount: number;
  ftfrRate: number;
  returnVisits: number;
  trend: number; // percentage change from previous period
}

interface TechnicianFTFR {
  id: string;
  name: string;
  totalJobs: number;
  firstTimeFixCount: number;
  ftfrRate: number;
}

interface JobTypeFTFR {
  jobType: string;
  label: string;
  totalJobs: number;
  firstTimeFixCount: number;
  ftfrRate: number;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

/**
 * Calculate FTFR metrics from work orders
 * A job is considered "first-time fix" if:
 * - Status is completed
 * - No subsequent work order for same customer within 14 days with similar job type
 */
function calculateFTFRMetrics(
  workOrders: WorkOrder[],
  startDate: Date,
  endDate: Date,
): FTFRMetrics {
  // Filter work orders in the date range
  const ordersInRange = workOrders.filter((wo) => {
    if (!wo.scheduled_date || wo.status !== "completed") return false;
    const woDate = new Date(wo.scheduled_date);
    return woDate >= startDate && woDate <= endDate;
  });

  const totalJobs = ordersInRange.length;
  if (totalJobs === 0) {
    return {
      totalJobs: 0,
      firstTimeFixCount: 0,
      ftfrRate: 0,
      returnVisits: 0,
      trend: 0,
    };
  }

  // Identify return visits (same customer, similar job type within 14 days)
  const returnVisitIds = new Set<string>();

  ordersInRange.forEach((wo) => {
    if (!wo.scheduled_date || !wo.customer_id) return;
    const woDate = new Date(wo.scheduled_date);
    const fourteenDaysLater = new Date(
      woDate.getTime() + 14 * 24 * 60 * 60 * 1000,
    );

    // Find any subsequent work order for same customer
    const hasReturnVisit = workOrders.some((other) => {
      if (other.id === wo.id || other.customer_id !== wo.customer_id)
        return false;
      if (!other.scheduled_date || other.status !== "completed") return false;
      const otherDate = new Date(other.scheduled_date);
      // Check if it's within 14 days after the original job
      return otherDate > woDate && otherDate <= fourteenDaysLater;
    });

    if (hasReturnVisit) {
      returnVisitIds.add(wo.id);
    }
  });

  const returnVisits = returnVisitIds.size;
  const firstTimeFixCount = totalJobs - returnVisits;
  const ftfrRate = (firstTimeFixCount / totalJobs) * 100;

  // Calculate previous period for trend
  const periodLength = endDate.getTime() - startDate.getTime();
  const prevStartDate = new Date(startDate.getTime() - periodLength);
  const prevEndDate = startDate;

  const prevOrdersInRange = workOrders.filter((wo) => {
    if (!wo.scheduled_date || wo.status !== "completed") return false;
    const woDate = new Date(wo.scheduled_date);
    return woDate >= prevStartDate && woDate < prevEndDate;
  });

  let trend = 0;
  if (prevOrdersInRange.length > 0) {
    const prevReturnVisits = prevOrdersInRange.filter((wo) => {
      if (!wo.scheduled_date || !wo.customer_id) return false;
      const woDate = new Date(wo.scheduled_date);
      const fourteenDaysLater = new Date(
        woDate.getTime() + 14 * 24 * 60 * 60 * 1000,
      );

      return workOrders.some((other) => {
        if (other.id === wo.id || other.customer_id !== wo.customer_id)
          return false;
        if (!other.scheduled_date || other.status !== "completed") return false;
        const otherDate = new Date(other.scheduled_date);
        return otherDate > woDate && otherDate <= fourteenDaysLater;
      });
    }).length;

    const prevFTFR =
      ((prevOrdersInRange.length - prevReturnVisits) /
        prevOrdersInRange.length) *
      100;
    trend = ftfrRate - prevFTFR;
  }

  return { totalJobs, firstTimeFixCount, ftfrRate, returnVisits, trend };
}

/**
 * Calculate FTFR by technician
 */
function calculateTechnicianFTFR(
  workOrders: WorkOrder[],
  startDate: Date,
  endDate: Date,
): TechnicianFTFR[] {
  const technicianMap = new Map<
    string,
    { totalJobs: number; returnVisits: number }
  >();

  const ordersInRange = workOrders.filter((wo) => {
    if (
      !wo.scheduled_date ||
      wo.status !== "completed" ||
      !wo.assigned_technician
    )
      return false;
    const woDate = new Date(wo.scheduled_date);
    return woDate >= startDate && woDate <= endDate;
  });

  ordersInRange.forEach((wo) => {
    const tech = wo.assigned_technician!;
    if (!technicianMap.has(tech)) {
      technicianMap.set(tech, { totalJobs: 0, returnVisits: 0 });
    }
    const stats = technicianMap.get(tech)!;
    stats.totalJobs++;

    // Check for return visit
    if (wo.scheduled_date && wo.customer_id) {
      const woDate = new Date(wo.scheduled_date);
      const fourteenDaysLater = new Date(
        woDate.getTime() + 14 * 24 * 60 * 60 * 1000,
      );

      const hasReturnVisit = workOrders.some((other) => {
        if (other.id === wo.id || other.customer_id !== wo.customer_id)
          return false;
        if (!other.scheduled_date || other.status !== "completed") return false;
        const otherDate = new Date(other.scheduled_date);
        return otherDate > woDate && otherDate <= fourteenDaysLater;
      });

      if (hasReturnVisit) {
        stats.returnVisits++;
      }
    }
  });

  return Array.from(technicianMap.entries()).map(([name, stats]) => ({
    id: name,
    name,
    totalJobs: stats.totalJobs,
    firstTimeFixCount: stats.totalJobs - stats.returnVisits,
    ftfrRate: ((stats.totalJobs - stats.returnVisits) / stats.totalJobs) * 100,
  }));
}

/**
 * Calculate FTFR by job type
 */
function calculateJobTypeFTFR(
  workOrders: WorkOrder[],
  startDate: Date,
  endDate: Date,
): JobTypeFTFR[] {
  const jobTypeMap = new Map<
    string,
    { totalJobs: number; returnVisits: number }
  >();

  const ordersInRange = workOrders.filter((wo) => {
    if (!wo.scheduled_date || wo.status !== "completed") return false;
    const woDate = new Date(wo.scheduled_date);
    return woDate >= startDate && woDate <= endDate;
  });

  ordersInRange.forEach((wo) => {
    const jobType = wo.job_type;
    if (!jobTypeMap.has(jobType)) {
      jobTypeMap.set(jobType, { totalJobs: 0, returnVisits: 0 });
    }
    const stats = jobTypeMap.get(jobType)!;
    stats.totalJobs++;

    // Check for return visit
    if (wo.scheduled_date && wo.customer_id) {
      const woDate = new Date(wo.scheduled_date);
      const fourteenDaysLater = new Date(
        woDate.getTime() + 14 * 24 * 60 * 60 * 1000,
      );

      const hasReturnVisit = workOrders.some((other) => {
        if (other.id === wo.id || other.customer_id !== wo.customer_id)
          return false;
        if (!other.scheduled_date || other.status !== "completed") return false;
        const otherDate = new Date(other.scheduled_date);
        return otherDate > woDate && otherDate <= fourteenDaysLater;
      });

      if (hasReturnVisit) {
        stats.returnVisits++;
      }
    }
  });

  return Array.from(jobTypeMap.entries()).map(([jobType, stats]) => ({
    jobType,
    label: JOB_TYPE_LABELS[jobType as JobType] || jobType,
    totalJobs: stats.totalJobs,
    firstTimeFixCount: stats.totalJobs - stats.returnVisits,
    ftfrRate: ((stats.totalJobs - stats.returnVisits) / stats.totalJobs) * 100,
  }));
}

/**
 * Get date range based on time period
 */
function getDateRange(period: TimePeriod): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "week":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case "quarter":
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case "year":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
  }

  return { startDate, endDate };
}

const COLORS = [
  "#22c55e",
  "#0091ae",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
];

/**
 * FTFRDashboard - First-Time Fix Rate analytics dashboard
 *
 * Displays overall FTFR metrics, breakdowns by technician and job type,
 * with trend indicators and drill-down capabilities.
 */
export function FTFRDashboard() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(
    null,
  );

  // Fetch work orders data
  const { data: workOrdersData, isLoading: workOrdersLoading } = useWorkOrders({
    page: 1,
    page_size: 1000,
  });
  // Calculate metrics based on selected time period
  const { startDate, endDate } = useMemo(
    () => getDateRange(timePeriod),
    [timePeriod],
  );

  const metrics = useMemo(() => {
    const workOrders = workOrdersData?.items || [];
    return calculateFTFRMetrics(workOrders, startDate, endDate);
  }, [workOrdersData, startDate, endDate]);

  const technicianFTFR = useMemo(() => {
    const workOrders = workOrdersData?.items || [];
    return calculateTechnicianFTFR(workOrders, startDate, endDate).sort(
      (a, b) => b.ftfrRate - a.ftfrRate,
    );
  }, [workOrdersData, startDate, endDate]);

  const jobTypeFTFR = useMemo(() => {
    const workOrders = workOrdersData?.items || [];
    return calculateJobTypeFTFR(workOrders, startDate, endDate).sort(
      (a, b) => b.totalJobs - a.totalJobs,
    );
  }, [workOrdersData, startDate, endDate]);

  // Low performers (FTFR < 80%)
  const lowPerformers = technicianFTFR.filter(
    (t) => t.ftfrRate < 80 && t.totalJobs >= 3,
  );

  // Get FTFR color based on rate
  const getFTFRColor = (rate: number) => {
    if (rate >= 90) return "text-success";
    if (rate >= 80) return "text-warning";
    return "text-danger";
  };

  const getFTFRBadgeVariant = (
    rate: number,
  ): "success" | "warning" | "danger" => {
    if (rate >= 90) return "success";
    if (rate >= 80) return "warning";
    return "danger";
  };

  if (workOrdersLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-muted w-64 mb-6 rounded" />
          <div className="grid grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-bg-muted rounded" />
            ))}
          </div>
          <div className="h-80 bg-bg-muted rounded" />
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
            to="/reports"
            className="text-sm text-primary hover:underline mb-2 inline-block"
          >
            &larr; Back to Reports
          </Link>
          <h1 className="text-2xl font-semibold text-text-primary">
            First-Time Fix Rate (FTFR) Dashboard
          </h1>
          <p className="text-text-secondary mt-1">
            Analyze service quality and technician effectiveness
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            className="w-40"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
            <option value="year">Last Year</option>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Overall FTFR */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">
                  First-Time Fix Rate
                </p>
                <p
                  className={cn(
                    "text-4xl font-bold mt-2",
                    getFTFRColor(metrics.ftfrRate),
                  )}
                >
                  {metrics.ftfrRate.toFixed(1)}%
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {metrics.trend !== 0 && (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        metrics.trend > 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {metrics.trend > 0 ? "+" : ""}
                      {metrics.trend.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-xs text-text-muted">
                    vs previous period
                  </span>
                </div>
              </div>
              <div className="text-4xl opacity-20">
                {metrics.ftfrRate >= 90
                  ? "+++"
                  : metrics.ftfrRate >= 80
                    ? "++"
                    : "+"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Jobs */}
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-text-secondary">
                Total Completed Jobs
              </p>
              <p className="text-3xl font-bold text-text-primary mt-2">
                {metrics.totalJobs}
              </p>
              <p className="text-xs text-text-muted mt-2">
                {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* First-Time Fixes */}
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-text-secondary">First-Time Fixes</p>
              <p className="text-3xl font-bold text-success mt-2">
                {metrics.firstTimeFixCount}
              </p>
              <p className="text-xs text-text-muted mt-2">
                Jobs resolved without return visit
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Return Visits */}
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-text-secondary">
                Return Visits Required
              </p>
              <p className="text-3xl font-bold text-danger mt-2">
                {metrics.returnVisits}
              </p>
              <p className="text-xs text-text-muted mt-2">
                Same customer within 14 days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* FTFR by Technician */}
        <Card>
          <CardHeader>
            <CardTitle>FTFR by Technician</CardTitle>
          </CardHeader>
          <CardContent>
            {technicianFTFR.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                No technician data available
              </p>
            ) : (
              <div className="space-y-3">
                {technicianFTFR.slice(0, 10).map((tech) => (
                  <div
                    key={tech.id}
                    className={cn(
                      "p-3 rounded-lg border transition-colors cursor-pointer",
                      selectedTechnician === tech.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-bg-hover",
                    )}
                    onClick={() =>
                      setSelectedTechnician(
                        selectedTechnician === tech.id ? null : tech.id,
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-text-primary">
                          {tech.name}
                        </span>
                        <Badge variant={getFTFRBadgeVariant(tech.ftfrRate)}>
                          {tech.ftfrRate.toFixed(0)}%
                        </Badge>
                      </div>
                      <span className="text-sm text-text-muted">
                        {tech.totalJobs} jobs
                      </span>
                    </div>
                    <div className="w-full bg-bg-muted rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          tech.ftfrRate >= 90
                            ? "bg-success"
                            : tech.ftfrRate >= 80
                              ? "bg-warning"
                              : "bg-danger",
                        )}
                        style={{ width: `${tech.ftfrRate}%` }}
                      />
                    </div>
                    {selectedTechnician === tech.id && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-text-muted">First-Time Fixes</p>
                            <p className="font-medium text-success">
                              {tech.firstTimeFixCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-muted">Return Visits</p>
                            <p className="font-medium text-danger">
                              {tech.totalJobs - tech.firstTimeFixCount}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* FTFR by Job Type */}
        <Card>
          <CardHeader>
            <CardTitle>FTFR by Job Type</CardTitle>
          </CardHeader>
          <CardContent>
            {jobTypeFTFR.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                No job type data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={jobTypeFTFR}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="totalJobs"
                    nameKey="label"
                    label={(props: {
                      name?: string;
                      payload?: { label?: string; ftfrRate?: number };
                    }) =>
                      `${props.payload?.label || props.name || ""}: ${(props.payload?.ftfrRate || 0).toFixed(0)}%`
                    }
                  >
                    {jobTypeFTFR.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(
                      value,
                      _name,
                      props: {
                        payload?: { ftfrRate?: number; label?: string };
                      },
                    ) => [
                      `${value} jobs (${(props.payload?.ftfrRate || 0).toFixed(1)}% FTFR)`,
                      props.payload?.label || "",
                    ]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Type Bar Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>FTFR Comparison by Job Type</CardTitle>
        </CardHeader>
        <CardContent>
          {jobTypeFTFR.length === 0 ? (
            <p className="text-text-muted text-center py-8">
              No data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jobTypeFTFR}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="ftfrRate"
                  fill="#0091ae"
                  name="FTFR"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Low Performers Analysis */}
      {lowPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>Low Performance Analysis</CardTitle>
              <Badge variant="danger">
                {lowPerformers.length} technicians below 80%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowPerformers.map((tech) => (
                <div
                  key={tech.id}
                  className="p-4 rounded-lg border border-danger/20 bg-danger/5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-text-primary">
                        {tech.name}
                      </h4>
                      <p className="text-sm text-danger">
                        {tech.ftfrRate.toFixed(1)}% FTFR (
                        {tech.totalJobs - tech.firstTimeFixCount} return visits)
                      </p>
                    </div>
                    <Badge variant="danger">{tech.ftfrRate.toFixed(0)}%</Badge>
                  </div>
                  <div className="bg-bg-body rounded p-3">
                    <p className="text-sm font-medium text-text-primary mb-2">
                      Recommended Actions:
                    </p>
                    <ul className="text-sm text-text-secondary space-y-1">
                      <li>- Review recent return visit cases for patterns</li>
                      <li>- Schedule additional training on common issues</li>
                      <li>
                        - Consider pairing with higher-performing technician
                      </li>
                      <li>- Verify proper diagnostic tools are being used</li>
                    </ul>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link to={`/technicians/${tech.id}`}>
                      <Button size="sm" variant="secondary">
                        View Profile
                      </Button>
                    </Link>
                    <Link
                      to={`/work-orders?technician=${tech.id}&status=requires_followup`}
                    >
                      <Button size="sm" variant="secondary">
                        View Return Visits
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
