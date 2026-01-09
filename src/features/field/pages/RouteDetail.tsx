import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Route detail with directions to a specific job
 */
export function RouteDetail() {
  const { jobId } = useParams<{ jobId: string }>();

  const { data: job, isLoading } = useQuery({
    queryKey: ['work-order', jobId],
    queryFn: async () => {
      const response = await apiClient.get(`/work-orders/${jobId}`);
      return response.data;
    },
    enabled: !!jobId,
  });

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleOpenMaps = () => {
    if (job?.address) {
      const encoded = encodeURIComponent(job.address);
      // Try to open in native maps app
      window.open(`https://maps.google.com/maps?daddr=${encoded}`, '_blank');
    }
  };

  return (
    <div className="p-4 pb-24">
      {/* Back Button */}
      <Link to="/field/route" className="flex items-center gap-2 text-text-secondary mb-4">
        <span>&larr;</span> Back to Route
      </Link>

      {/* Destination Card */}
      <div className="bg-bg-card rounded-lg border border-border p-4 mb-4">
        <h1 className="text-lg font-semibold text-text-primary mb-1">
          {job?.customer_name || `Job #${jobId}`}
        </h1>
        <p className="text-text-secondary">{job?.service_type}</p>
        <p className="text-sm text-text-muted mt-2 flex items-center gap-1">
          <span>📍</span> {job?.address || 'No address'}
        </p>
      </div>

      {/* Map Placeholder */}
      <div className="bg-bg-card border border-border rounded-lg h-64 mb-4 flex items-center justify-center">
        <div className="text-center text-text-muted">
          <span className="text-4xl block mb-2">🗺️</span>
          <p>Directions map coming soon</p>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">--</p>
          <p className="text-sm text-text-muted">Distance</p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">--</p>
          <p className="text-sm text-text-muted">ETA</p>
        </div>
      </div>

      {/* Contact Customer */}
      {job?.customer_phone && (
        <a
          href={`tel:${job.customer_phone}`}
          className="block w-full py-3 bg-bg-card border border-border rounded-lg text-center font-medium text-text-primary mb-4"
        >
          <span className="mr-2">📞</span> Call Customer
        </a>
      )}

      {/* Actions */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-bg-body border-t border-border">
        <div className="flex gap-3">
          <Link
            to={`/field/job/${jobId}`}
            className="flex-1 py-3 bg-bg-card border border-border rounded-lg text-center font-medium text-text-primary"
          >
            View Job
          </Link>
          <button
            onClick={handleOpenMaps}
            className="flex-1 py-3 bg-primary text-white rounded-lg font-medium"
          >
            Open in Maps
          </button>
        </div>
      </div>
    </div>
  );
}
