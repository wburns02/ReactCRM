import { Link } from "react-router-dom";
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
import { useDashboardStats } from "@/api/hooks/useDashboardStats";

/**
 * Dashboard page - overview of prospects and customers
 *
 * Uses a single aggregated API call (/dashboard/stats) instead of
 * fetching 100 prospects + 100 customers + 100 work orders separately.
 * This reduces LCP from ~24s to <2s.
 */
export function DashboardPage() {
  const { data, isLoading } = useDashboardStats();

  const stats = data?.stats;
  const recentProspects = data?.recent_prospects || [];
  const recentCustomers = data?.recent_customers || [];
  const todaysWorkOrders = data?.today_jobs || [];

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
                  {isLoading ? "..." : (stats?.total_prospects ?? 0)}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {stats?.active_prospects ?? 0} active
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
                  {isLoading ? "..." : (stats?.total_customers ?? 0)}
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
                  {isLoading ? "..." : formatCurrency(stats?.pipeline_value ?? 0)}
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
                  {isLoading ? "..." : (stats?.total_work_orders ?? 0)}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {stats?.scheduled_work_orders ?? 0} scheduled,{" "}
                  {stats?.in_progress_work_orders ?? 0} in progress
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
                  {isLoading ? "..." : (stats?.today_jobs ?? 0)}
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
                  {isLoading ? "..." : (stats?.upcoming_followups ?? 0)}
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
                {isLoading ? "Loading..." : "No prospects yet"}
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
                      {prospect.prospect_stage && (
                        <Badge variant="stage" stage={prospect.prospect_stage}>
                          {PROSPECT_STAGE_LABELS[prospect.prospect_stage] || prospect.prospect_stage}
                        </Badge>
                      )}
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
                {isLoading ? "Loading..." : "No customers yet"}
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
      </div>
    </div>
  );
}
