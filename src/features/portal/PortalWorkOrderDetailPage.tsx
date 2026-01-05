/**
 * Portal Work Order Detail Page
 * Shows detailed view of a work order with technician tracking
 */
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePortalWorkOrder, usePortalCustomer } from '@/api/hooks/usePortal';
import { TechnicianArrivalTracker } from './components/TechnicianArrivalTracker';

export function PortalWorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workOrder, isLoading } = usePortalWorkOrder(id || '');
  const { data: customer } = usePortalCustomer();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-4">📋</p>
        <p className="text-text-muted mb-4">Work order not found</p>
        <Button onClick={() => navigate('/portal/work-orders')}>
          View All Work Orders
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="primary">Scheduled</Badge>;
      case 'in_progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const isActiveOrder = workOrder.status === 'scheduled' || workOrder.status === 'in_progress';

  // Parse customer coordinates from address if available (would need geocoding in real app)
  // For now, use default coordinates
  const customerLat = 30.2672; // Austin, TX
  const customerLng = -97.7431;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <div>
        <Link
          to="/portal/work-orders"
          className="text-sm text-text-muted hover:text-text-primary flex items-center gap-1"
        >
          <span>&larr;</span> Back to Work Orders
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-text-primary">
              Work Order #{workOrder.work_order_number}
            </h1>
            {getStatusBadge(workOrder.status)}
          </div>
          <p className="text-text-secondary">{workOrder.service_type}</p>
        </div>
        {workOrder.status === 'scheduled' && (
          <Button variant="secondary">Reschedule</Button>
        )}
      </div>

      {/* Technician Tracking for Active Orders */}
      {isActiveOrder && workOrder.technician_id && (
        <TechnicianArrivalTracker
          workOrderId={workOrder.id}
          technicianName={workOrder.technician_name}
          technicianPhone={workOrder.technician_phone}
          customerLat={customerLat}
          customerLng={customerLng}
        />
      )}

      {/* Work Order Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appointment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <p className="text-sm text-text-muted">Scheduled Date</p>
                <p className="font-medium text-text-primary">
                  {workOrder.scheduled_date
                    ? new Date(workOrder.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'To be scheduled'}
                </p>
              </div>
            </div>

            {workOrder.scheduled_time && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">🕐</span>
                <div>
                  <p className="text-sm text-text-muted">Time Window</p>
                  <p className="font-medium text-text-primary">{workOrder.scheduled_time}</p>
                </div>
              </div>
            )}

            {workOrder.technician_name && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">👷</span>
                <div>
                  <p className="text-sm text-text-muted">Technician</p>
                  <p className="font-medium text-text-primary">{workOrder.technician_name}</p>
                  {workOrder.technician_phone && (
                    <a
                      href={`tel:${workOrder.technician_phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {workOrder.technician_phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {workOrder.completed_date && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-sm text-text-muted">Completed</p>
                  <p className="font-medium text-text-primary">
                    {new Date(workOrder.completed_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Service Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📍</span>
              <div className="flex-1">
                <p className="font-medium text-text-primary">
                  {workOrder.service_address || (
                    customer && `${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}`
                  )}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    workOrder.service_address ||
                      (customer && `${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}`) ||
                      ''
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  View on Map
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {workOrder.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary whitespace-pre-wrap">{workOrder.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      {workOrder.items && workOrder.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Service Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-text-primary">{item.description}</p>
                    <p className="text-sm text-text-muted">
                      {item.quantity} x ${item.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-medium text-text-primary">
                    ${item.total.toFixed(2)}
                  </p>
                </div>
              ))}
              {workOrder.total_amount && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <p className="font-semibold text-text-primary">Total</p>
                  <p className="font-bold text-lg text-text-primary">
                    ${workOrder.total_amount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Amount (if no line items) */}
      {workOrder.total_amount && (!workOrder.items || workOrder.items.length === 0) && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total Amount</span>
              <span className="text-2xl font-bold text-text-primary">
                ${workOrder.total_amount.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            {workOrder.status === 'completed' && (
              <Link to="/portal/invoices">
                <Button variant="primary">View Invoice</Button>
              </Link>
            )}
            <Link to="/portal/request-service">
              <Button variant="secondary">Request Similar Service</Button>
            </Link>
            <a href="tel:+15125550123">
              <Button variant="ghost">Need Help? Call Us</Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <TimelineItem
              icon="📝"
              title="Work Order Created"
              date={workOrder.scheduled_date || 'N/A'}
              isComplete
            />
            <TimelineItem
              icon="📅"
              title="Scheduled"
              date={workOrder.scheduled_date}
              isComplete={!!workOrder.scheduled_date}
            />
            {workOrder.status === 'in_progress' && (
              <TimelineItem
                icon="🚗"
                title="Technician En Route"
                date="In Progress"
                isActive
              />
            )}
            <TimelineItem
              icon="✅"
              title="Completed"
              date={workOrder.completed_date}
              isComplete={workOrder.status === 'completed'}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface TimelineItemProps {
  icon: string;
  title: string;
  date?: string | null;
  isComplete?: boolean;
  isActive?: boolean;
}

function TimelineItem({ icon, title, date, isComplete, isActive }: TimelineItemProps) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          isActive
            ? 'bg-yellow-100 animate-pulse'
            : isComplete
            ? 'bg-green-100'
            : 'bg-gray-100'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p
          className={`font-medium ${
            isComplete || isActive ? 'text-text-primary' : 'text-text-muted'
          }`}
        >
          {title}
        </p>
        {date && (
          <p className="text-sm text-text-muted">
            {typeof date === 'string' && date.includes('-')
              ? new Date(date).toLocaleDateString()
              : date}
          </p>
        )}
      </div>
      {isComplete && <span className="text-green-500">✓</span>}
      {isActive && (
        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
      )}
    </div>
  );
}

export default PortalWorkOrderDetailPage;
