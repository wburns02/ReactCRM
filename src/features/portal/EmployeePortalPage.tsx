import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuth } from '@/features/auth/useAuth.ts';

interface ScheduleItem {
  id: string;
  date: string;
  time: string;
  customer: string;
  address: string;
  serviceType: string;
}

interface RecentWorkOrder {
  id: string;
  date: string;
  customer: string;
  serviceType: string;
  status: 'completed' | 'in_progress' | 'cancelled';
}

// Mock schedule data
const MOCK_SCHEDULE: ScheduleItem[] = [
  { id: '1', date: 'Today', time: '9:00 AM', customer: 'John Smith', address: '123 Oak Lane, Austin TX', serviceType: 'Septic Pumping' },
  { id: '2', date: 'Today', time: '11:30 AM', customer: 'Sarah Johnson', address: '456 Pine St, Austin TX', serviceType: 'Grease Trap' },
  { id: '3', date: 'Today', time: '2:00 PM', customer: 'Mike Williams', address: '789 Elm Ave, Round Rock TX', serviceType: 'Inspection' },
  { id: '4', date: 'Tomorrow', time: '8:30 AM', customer: 'Emily Davis', address: '321 Maple Dr, Cedar Park TX', serviceType: 'Septic Pumping' },
  { id: '5', date: 'Tomorrow', time: '1:00 PM', customer: 'David Brown', address: '654 Cedar Ln, Pflugerville TX', serviceType: 'Emergency Service' },
];

// Mock recent work orders
const MOCK_WORK_ORDERS: RecentWorkOrder[] = [
  { id: 'WO-1234', date: '2024-03-15', customer: 'Lisa Anderson', serviceType: 'Septic Pumping', status: 'completed' },
  { id: 'WO-1233', date: '2024-03-14', customer: 'James Wilson', serviceType: 'Camera Inspection', status: 'completed' },
  { id: 'WO-1232', date: '2024-03-14', customer: 'Jennifer Taylor', serviceType: 'Grease Trap', status: 'completed' },
  { id: 'WO-1231', date: '2024-03-13', customer: 'Robert Martinez', serviceType: 'Septic Pumping', status: 'completed' },
  { id: 'WO-1230', date: '2024-03-12', customer: 'Michelle Garcia', serviceType: 'Line Jetting', status: 'completed' },
];

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  completed: 'success',
  in_progress: 'warning',
  cancelled: 'danger',
};

export function EmployeePortalPage() {
  const { user } = useAuth();

  // Stats based on mock data
  const todaySchedule = MOCK_SCHEDULE.filter((s) => s.date === 'Today');
  const completedThisWeek = MOCK_WORK_ORDERS.length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Welcome, {user?.first_name || 'Employee'}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Your personal dashboard and schedule
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Today's Jobs</div>
            <div className="text-3xl font-bold text-primary">{todaySchedule.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Completed This Week</div>
            <div className="text-3xl font-bold text-success">{completedThisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Next Job</div>
            <div className="text-lg font-bold text-text-primary">
              {todaySchedule[0]?.time || 'None scheduled'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Schedule</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {MOCK_SCHEDULE.map((item) => (
                <div key={item.id} className="p-4 hover:bg-bg-hover">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-medium text-text-primary">{item.customer}</span>
                      <Badge variant="default" className="ml-2">{item.date}</Badge>
                    </div>
                    <span className="text-sm font-medium text-primary">{item.time}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{item.address}</p>
                  <p className="text-sm text-text-secondary mt-1">
                    <span className="font-medium">Service:</span> {item.serviceType}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Work Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-bg-subtle border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Order</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Customer</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Service</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_WORK_ORDERS.map((wo) => (
                  <tr key={wo.id} className="hover:bg-bg-hover">
                    <td className="px-4 py-3 font-medium text-primary">{wo.id}</td>
                    <td className="px-4 py-3 text-text-primary">{wo.customer}</td>
                    <td className="px-4 py-3 text-text-secondary">{wo.serviceType}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATUS_COLORS[wo.status]}>
                        {wo.status === 'completed' ? 'Completed' : wo.status === 'in_progress' ? 'In Progress' : 'Cancelled'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <a href="/schedule" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
              View Full Schedule
            </a>
            <a href="/work-orders" className="px-4 py-2 bg-bg-subtle text-text-primary rounded-md hover:bg-bg-hover">
              My Work Orders
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
