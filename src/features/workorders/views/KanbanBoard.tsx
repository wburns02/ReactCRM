import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface WorkOrder {
  id: number;
  customer_name: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  priority: string;
  technician_name?: string;
}

/**
 * Kanban Board View for Work Orders
 */
export function KanbanBoard() {
  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders-kanban'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/work-orders/', {
          params: { limit: 100 }
        });
        return response.data.items || response.data || [];
      } catch {
        return [];
      }
    },
  });

  const columns = [
    { id: 'scheduled', label: 'Scheduled', color: 'border-info' },
    { id: 'dispatched', label: 'Dispatched', color: 'border-warning' },
    { id: 'in_progress', label: 'In Progress', color: 'border-primary' },
    { id: 'completed', label: 'Completed', color: 'border-success' },
  ];

  const getColumnOrders = (status: string) => {
    return workOrders?.filter((wo: WorkOrder) =>
      wo.status?.toLowerCase() === status.toLowerCase()
    ) || [];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-danger/20 text-danger';
      case 'urgent': return 'bg-danger text-white';
      case 'medium': return 'bg-warning/20 text-warning';
      default: return 'bg-text-muted/20 text-text-muted';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Work Orders Board</h1>
          <p className="text-text-muted">Kanban view of work order status</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/work-orders"
            className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover"
          >
            List View
          </Link>
          <Link
            to="/work-orders/calendar"
            className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover"
          >
            Calendar View
          </Link>
          <Link
            to="/work-orders/map"
            className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover"
          >
            Map View
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const orders = getColumnOrders(column.id);
            return (
              <div
                key={column.id}
                className={`flex-shrink-0 w-72 bg-bg-card rounded-lg border-t-4 ${column.color}`}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-text-primary">{column.label}</h3>
                    <span className="px-2 py-0.5 bg-bg-hover rounded-full text-sm text-text-muted">
                      {orders.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-96">
                  {orders.length === 0 ? (
                    <div className="p-4 text-center text-text-muted text-sm">
                      No work orders
                    </div>
                  ) : (
                    orders.map((wo: WorkOrder) => (
                      <Link
                        key={wo.id}
                        to={`/work-orders/${wo.id}`}
                        className="block p-3 bg-bg-body border border-border rounded-lg hover:border-primary transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs text-text-muted">#{wo.id}</span>
                          {wo.priority && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${getPriorityColor(wo.priority)}`}>
                              {wo.priority}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-text-primary text-sm mb-1">
                          {wo.customer_name}
                        </h4>
                        <p className="text-xs text-text-muted mb-2">{wo.service_type}</p>
                        <div className="flex items-center justify-between text-xs text-text-muted">
                          <span>{wo.scheduled_date}</span>
                          {wo.technician_name && (
                            <span className="truncate ml-2">{wo.technician_name}</span>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
