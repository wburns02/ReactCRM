import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Route/Navigation view for technicians
 * Shows optimized route through today's jobs
 */
export function RouteView() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['technician-jobs', 'today'],
    queryFn: async () => {
      const response = await apiClient.get('/work-orders/', {
        params: { status: 'scheduled', limit: 20 }
      });
      return response.data.items || response.data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <h1 className="text-xl font-semibold text-text-primary mb-4">Today's Route</h1>

      {/* Map Placeholder */}
      <div className="bg-bg-card border border-border rounded-lg h-48 mb-4 flex items-center justify-center">
        <div className="text-center text-text-muted">
          <span className="text-4xl block mb-2">🗺️</span>
          <p>Map view coming soon</p>
        </div>
      </div>

      {/* Route Summary */}
      <div className="bg-bg-card border border-border rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-2xl font-bold text-text-primary">{jobs?.length || 0}</p>
            <p className="text-sm text-text-muted">Stops today</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">--</p>
            <p className="text-sm text-text-muted">Est. miles</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">--</p>
            <p className="text-sm text-text-muted">Est. hours</p>
          </div>
        </div>
      </div>

      {/* Stop List */}
      <h2 className="font-medium text-text-primary mb-3">Route Stops</h2>
      <div className="space-y-2">
        {jobs?.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <p>No stops scheduled for today</p>
          </div>
        ) : (
          jobs?.map((job: { id: number; customer_name: string; address: string; scheduled_time: string }, index: number) => (
            <Link
              key={job.id}
              to={`/field/route/${job.id}`}
              className="flex items-center gap-4 bg-bg-card border border-border rounded-lg p-3 hover:border-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">{job.customer_name}</p>
                <p className="text-sm text-text-muted truncate">{job.address}</p>
              </div>
              <div className="text-sm text-text-secondary">
                {job.scheduled_time || 'TBD'}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Start Navigation Button */}
      {jobs?.length > 0 && (
        <button className="w-full mt-6 py-3 bg-primary text-white rounded-lg font-medium flex items-center justify-center gap-2">
          <span>🧭</span> Start Navigation
        </button>
      )}
    </div>
  );
}
