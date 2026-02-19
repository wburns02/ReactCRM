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
import { useAuth } from "@/features/auth/useAuth.ts";
import {
  ClipboardList,
  Users,
  DollarSign,
  Wrench,
  CalendarCheck,
  PhoneCall,
  Calendar,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

export function DashboardPage() {
  const { data, isLoading } = useDashboardStats();
  const { user } = useAuth();

  const stats = data?.stats;
  const recentProspects = data?.recent_prospects || [];
  const recentCustomers = data?.recent_customers || [];
  const todaysWorkOrders = data?.today_jobs || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6">
      {/* Role-Specific Dashboard (for demo users) */}
      <RoleDashboard />

      {/* Welcome Banner */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-[#0c1929] via-[#132a4a] to-[#1a3a6a] p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z\' fill=\'%23fff\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }} />
        <div className="relative">
          <h1 className="text-2xl font-semibold">
            {greeting}, {user?.first_name || "there"}
          </h1>
          <p className="text-white/60 mt-1 text-sm">
            Here's what's happening with your business today
          </p>
          {!isLoading && stats && (
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">
                <CalendarCheck className="w-3.5 h-3.5 text-[#2aabe1]" />
                {stats.today_jobs ?? 0} jobs today
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                {stats.in_progress_work_orders ?? 0} in progress
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                {stats.upcoming_followups ?? 0} follow-ups
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Total Prospects */}
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Prospects</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  {isLoading ? "..." : (stats?.total_prospects ?? 0)}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {stats?.active_prospects ?? 0} active
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Customers */}
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Customers</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  {isLoading ? "..." : (stats?.total_customers ?? 0)}
                </p>
                <p className="text-xs text-text-muted mt-1">All time</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Value */}
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">Pipeline Value</p>
                <p className="text-3xl font-bold text-success mt-1">
                  {isLoading ? "..." : formatCurrency(stats?.pipeline_value ?? 0)}
                </p>
                <p className="text-xs text-text-muted mt-1">Total estimated</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Orders */}
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">Work Orders</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  {isLoading ? "..." : (stats?.total_work_orders ?? 0)}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {stats?.scheduled_work_orders ?? 0} scheduled,{" "}
                  {stats?.in_progress_work_orders ?? 0} in progress
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today's Jobs */}
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">Today's Jobs</p>
                <p className="text-3xl font-bold text-primary mt-1">
                  {isLoading ? "..." : (stats?.today_jobs ?? 0)}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Scheduled for today
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups */}
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">
                  Upcoming Follow-ups
                </p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  {isLoading ? "..." : (stats?.upcoming_followups ?? 0)}
                </p>
                <p className="text-xs text-text-muted mt-1">Next 7 days</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Dispatch Stats */}
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
              <Button>
                <Calendar className="w-4 h-4" />
                View Schedule
              </Button>
            </Link>
            <Link to="/work-orders">
              <Button variant="secondary">
                <Wrench className="w-4 h-4" />
                Work Orders
              </Button>
            </Link>
            <Link to="/prospects">
              <Button variant="secondary">
                <ClipboardList className="w-4 h-4" />
                Prospects
              </Button>
            </Link>
            <Link to="/customers">
              <Button variant="secondary">
                <Users className="w-4 h-4" />
                Customers
              </Button>
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
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View schedule
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysWorkOrders.slice(0, 5).map((wo) => (
                <Link
                  key={wo.id}
                  to={`/work-orders/${wo.id}`}
                  className="block p-3 rounded-lg border border-border hover:bg-bg-hover hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-text-primary group-hover:text-primary transition-colors">
                        {wo.customer_name || `Customer #${wo.customer_id}`}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {JOB_TYPE_LABELS[wo.job_type as JobType] || wo.job_type}
                        {wo.time_window_start &&
                          ` - ${wo.time_window_start.slice(0, 5)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <ArrowUpRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
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
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View all
                <ChevronRight className="w-4 h-4" />
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
                    className="block p-3 rounded-lg border border-border hover:bg-bg-hover hover:border-primary/20 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-text-primary group-hover:text-primary transition-colors">
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
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View all
                <ChevronRight className="w-4 h-4" />
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
                    className="block p-3 rounded-lg border border-border hover:bg-bg-hover hover:border-primary/20 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-text-primary group-hover:text-primary transition-colors">
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
