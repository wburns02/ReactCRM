import { Link } from "react-router-dom";
import { useProspects } from "@/api/hooks/useProspects.ts";
import { useCustomers } from "@/api/hooks/useCustomers.ts";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import { Button } from "@/components/ui/Button.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { formatCurrency, formatDate } from "@/lib/utils.ts";
import { PROSPECT_STAGE_LABELS } from "@/api/types/common.ts";
import {
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  type WorkOrderStatus,
  type JobType,
} from "@/api/types/workOrder.ts";
import { AIDispatchStats } from "@/features/ai-dispatch";
import { RoleDashboard } from "@/components/Dashboard";

/**
 * Dashboard page - overview of prospects and customers
 *
 * Features:
 * - Summary stat cards
 * - Recent prospects
 * - Recent customers
 * - Quick action buttons
 */
export function DashboardPage() {
  // Fetch data for stats
  const { data: prospectsData } = useProspects({ page: 1, page_size: 100 });
  const { data: customersData } = useCustomers({ page: 1, page_size: 100 });
  const { data: workOrdersData } = useWorkOrders({ page: 1, page_size: 100 });

  const prospects = prospectsData?.items || [];
  const customers = customersData?.items || [];
  const workOrders = workOrdersData?.items || [];

  // Calculate stats
  const totalProspects = prospectsData?.total || 0;
  const totalCustomers = customersData?.total || 0;

  const pipelineValue = prospects.reduce(
    (sum, p) => sum + (p.estimated_value || 0),
    0,
  );

  const activeProspects = prospects.filter(
    (p) => !["won", "lost"].includes(p.prospect_stage),
  ).length;

  // Work order stats
  const totalWorkOrders = workOrdersData?.total || 0;
  const scheduledWorkOrders = workOrders.filter((wo) =>
    ["scheduled", "confirmed"].includes(wo.status),
  ).length;
  const inProgressWorkOrders = workOrders.filter((wo) =>
    ["enroute", "on_site", "in_progress"].includes(wo.status),
  ).length;
  const todayStr = new Date().toISOString().split("T")[0];
  const todaysWorkOrders = workOrders.filter(
    (wo) => wo.scheduled_date === todayStr,
  );

  // Get upcoming follow-ups (next 7 days)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingFollowUps = prospects.filter((p) => {
    if (!p.next_follow_up_date) return false;
    const followUpDate = new Date(p.next_follow_up_date);
    return followUpDate >= now && followUpDate <= sevenDaysFromNow;
  });

  // Get recent items (last 5)
  const recentProspects = [...prospects]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  const recentCustomers = [...customers]
    .sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    })
    .slice(0, 5);

  return (
    <div className="p-6">
      {/* Role-Specific Dashboard (for demo users) */}
      <RoleDashboard />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          Overview of your CRM activity
        </p>
      </div>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Prospects */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Prospects</p>
                <p className="text-3xl font-bold text-text-primary mt-2">
                  {totalProspects}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {activeProspects} active
                </p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
          </CardContent>
        </Card>

        {/* Total Customers */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Customers</p>
                <p className="text-3xl font-bold text-text-primary mt-2">
                  {totalCustomers}
                </p>
                <p className="text-xs text-text-muted mt-1">All time</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Value */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Pipeline Value</p>
                <p className="text-3xl font-bold text-success mt-2">
                  {formatCurrency(pipelineValue)}
                </p>
                <p className="text-xs text-text-muted mt-1">Total estimated</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </CardContent>
        </Card>

        {/* Work Orders */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Work Orders</p>
                <p className="text-3xl font-bold text-text-primary mt-2">
                  {totalWorkOrders}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {scheduledWorkOrders} scheduled, {inProgressWorkOrders} in
                  progress
                </p>
              </div>
              <div className="text-4xl">🔧</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Today's Jobs */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Today's Jobs</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {todaysWorkOrders.length}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Scheduled for today
                </p>
              </div>
              <div className="text-4xl">📅</div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">
                  Upcoming Follow-ups
                </p>
                <p className="text-3xl font-bold text-text-primary mt-2">
                  {upcomingFollowUps.length}
                </p>
                <p className="text-xs text-text-muted mt-1">Next 7 days</p>
              </div>
              <div className="text-4xl">📞</div>
            </div>
          </CardContent>
        </Card>

        {/* AI Dispatch Stats - 2026 Differentiator */}
        <AIDispatchStats className="lg:col-span-2" />
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link to="/schedule">
              <Button>View Schedule</Button>
            </Link>
            <Link to="/work-orders">
              <Button variant="secondary">Work Orders</Button>
            </Link>
            <Link to="/prospects">
              <Button variant="secondary">Prospects</Button>
            </Link>
            <Link to="/customers">
              <Button variant="secondary">Customers</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Today's Jobs */}
      {todaysWorkOrders.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today's Jobs ({todaysWorkOrders.length})</CardTitle>
              <Link
                to="/schedule"
                className="text-sm text-primary hover:underline"
              >
                View schedule
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysWorkOrders.slice(0, 5).map((wo) => (
                <Link
                  key={wo.id}
                  to={`/work-orders/${wo.id}`}
                  className="block p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-text-primary">
                        {wo.customer_name || `Customer #${wo.customer_id}`}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {JOB_TYPE_LABELS[wo.job_type as JobType] || wo.job_type}
                        {wo.time_window_start &&
                          ` - ${wo.time_window_start.slice(0, 5)}`}
                      </p>
                    </div>
                    <Badge
                      variant={
                        wo.status === "completed"
                          ? "success"
                          : wo.status === "in_progress"
                            ? "warning"
                            : "default"
                      }
                    >
                      {WORK_ORDER_STATUS_LABELS[wo.status as WorkOrderStatus] ||
                        wo.status}
                    </Badge>
                  </div>
                  {wo.assigned_technician && (
                    <p className="text-xs text-text-muted">
                      Assigned to: {wo.assigned_technician}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Prospects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Prospects</CardTitle>
              <Link
                to="/prospects"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentProspects.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                No prospects yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentProspects.map((prospect) => (
                  <Link
                    key={prospect.id}
                    to={`/prospects/${prospect.id}`}
                    className="block p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-text-primary">
                          {prospect.first_name} {prospect.last_name}
                        </p>
                        {prospect.company_name && (
                          <p className="text-sm text-text-secondary">
                            {prospect.company_name}
                          </p>
                        )}
                      </div>
                      <Badge variant="stage" stage={prospect.prospect_stage}>
                        {PROSPECT_STAGE_LABELS[prospect.prospect_stage]}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>{formatDate(prospect.created_at)}</span>
                      {prospect.estimated_value && (
                        <span className="text-success font-medium">
                          {formatCurrency(prospect.estimated_value)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Customers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Customers</CardTitle>
              <Link
                to="/customers"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentCustomers.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                No customers yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentCustomers.map((customer) => (
                  <Link
                    key={customer.id}
                    to={`/customers/${customer.id}`}
                    className="block p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-text-primary">
                          {customer.first_name} {customer.last_name}
                        </p>
                        {customer.city && customer.state && (
                          <p className="text-sm text-text-secondary">
                            {customer.city}, {customer.state}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={customer.is_active ? "success" : "default"}
                      >
                        {customer.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {customer.created_at && (
                      <div className="text-xs text-text-muted">
                        {formatDate(customer.created_at)}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups Detail */}
        {upcomingFollowUps.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Upcoming Follow-ups (Next 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingFollowUps.map((prospect) => (
                  <Link
                    key={prospect.id}
                    to={`/prospects/${prospect.id}`}
                    className="block p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-primary">
                          {prospect.first_name} {prospect.last_name}
                        </p>
                        {prospect.company_name && (
                          <p className="text-sm text-text-secondary">
                            {prospect.company_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="stage" stage={prospect.prospect_stage}>
                          {PROSPECT_STAGE_LABELS[prospect.prospect_stage]}
                        </Badge>
                        <p className="text-xs text-text-muted mt-1">
                          📅 {formatDate(prospect.next_follow_up_date)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
