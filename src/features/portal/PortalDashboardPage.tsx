import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePortalCustomer, usePortalWorkOrders, usePortalInvoices } from '@/api/hooks/usePortal';

/**
 * Customer Portal Dashboard
 * Shows overview of upcoming appointments, recent invoices, and quick actions
 */
export function PortalDashboardPage() {
  const { data: customer, isLoading: customerLoading } = usePortalCustomer();
  const { data: workOrders = [], isLoading: workOrdersLoading } = usePortalWorkOrders();
  const { data: invoices = [], isLoading: invoicesLoading } = usePortalInvoices();

  const upcomingAppointments = workOrders.filter(
    wo => wo.status === 'scheduled' && wo.scheduled_date
  ).slice(0, 3);

  const pendingInvoices = invoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue');
  const totalDue = pendingInvoices.reduce((sum, inv) => sum + (inv.amount - inv.amount_paid), 0);

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome back, {customer?.first_name || 'Customer'}!
        </h1>
        <p className="text-text-secondary mt-1">
          Here's an overview of your account with MAC Septic Services
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-muted">Upcoming Appointments</p>
                <p className="text-3xl font-bold text-text-primary">{upcomingAppointments.length}</p>
              </div>
              <div className="text-4xl">📅</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-muted">Outstanding Balance</p>
                <p className="text-3xl font-bold text-text-primary">
                  ${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-muted">Total Services</p>
                <p className="text-3xl font-bold text-text-primary">{workOrders.length}</p>
              </div>
              <div className="text-4xl">🔧</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Appointments</CardTitle>
            <Link to="/portal/work-orders">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {workOrdersLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <p className="mb-4">No upcoming appointments</p>
                <Link to="/portal/request-service">
                  <Button>Request Service</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map(wo => (
                  <div key={wo.id} className="flex items-center justify-between p-4 bg-surface-hover rounded-lg">
                    <div>
                      <p className="font-medium text-text-primary">{wo.service_type}</p>
                      <p className="text-sm text-text-secondary">
                        {wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        }) : 'TBD'}
                      </p>
                      {wo.technician_name && (
                        <p className="text-sm text-text-muted">Tech: {wo.technician_name}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      wo.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      wo.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                      wo.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {wo.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link to="/portal/invoices">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No invoices yet
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.slice(0, 5).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-4 bg-surface-hover rounded-lg">
                    <div>
                      <p className="font-medium text-text-primary">Invoice #{inv.invoice_number}</p>
                      <p className="text-sm text-text-secondary">
                        Due: {new Date(inv.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-text-primary">
                        ${(inv.amount - inv.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                        inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/portal/request-service">
              <Button variant="secondary" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">📞</span>
                <span>Request Service</span>
              </Button>
            </Link>
            <Link to="/portal/invoices">
              <Button variant="secondary" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">💳</span>
                <span>Pay Invoice</span>
              </Button>
            </Link>
            <Link to="/portal/work-orders">
              <Button variant="secondary" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">📋</span>
                <span>View History</span>
              </Button>
            </Link>
            <a href="tel:+15125550123">
              <Button variant="secondary" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">☎️</span>
                <span>Call Us</span>
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
