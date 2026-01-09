import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface WorkOrder {
  id: number;
  customer_name: string;
  address: string;
  service_type: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Map View for Work Orders
 */
export function MapView() {
  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders-map'],
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'bg-info text-info';
      case 'dispatched': return 'bg-warning text-warning';
      case 'in_progress': return 'bg-primary text-primary';
      case 'completed': return 'bg-success text-success';
      default: return 'bg-text-muted text-text-muted';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Work Orders Map</h1>
          <p className="text-text-muted">Geographic view of all work orders</p>
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
            to="/work-orders/board"
            className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover"
          >
            Board View
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-2">
          <div className="bg-bg-card border border-border rounded-lg h-[600px] flex items-center justify-center">
            <div className="text-center text-text-muted">
              <span className="text-5xl block mb-4">🗺️</span>
              <h3 className="font-medium text-text-primary mb-2">Map Integration</h3>
              <p className="text-sm">Google Maps or Mapbox integration required</p>
              <p className="text-xs mt-2">
                {workOrders?.length || 0} work orders ready to display
              </p>
            </div>
          </div>
        </div>

        {/* Work Order List */}
        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-medium text-text-primary">Work Orders ({workOrders?.length || 0})</h2>
          </div>
          <div className="overflow-auto max-h-[540px]">
            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : workOrders?.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                <p>No work orders</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {workOrders?.map((wo: WorkOrder) => (
                  <Link
                    key={wo.id}
                    to={`/work-orders/${wo.id}`}
                    className="block p-3 hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-1 ${getStatusColor(wo.status).replace('text-', 'bg-')}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-text-primary text-sm truncate">
                            {wo.customer_name}
                          </h4>
                          <span className="text-xs text-text-muted">#{wo.id}</span>
                        </div>
                        <p className="text-xs text-text-muted truncate">{wo.address}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-text-secondary">{wo.service_type}</span>
                          <span className="text-xs text-text-muted">{wo.scheduled_time}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 bg-bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium text-text-primary mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { status: 'Scheduled', color: 'bg-info' },
            { status: 'Dispatched', color: 'bg-warning' },
            { status: 'In Progress', color: 'bg-primary' },
            { status: 'Completed', color: 'bg-success' },
          ].map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
              <span className="text-sm text-text-secondary">{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
