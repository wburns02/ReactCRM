import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface Job {
  id: number;
  customer_name: string;
  address: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  priority: string;
}

/**
 * Technician's job list - mobile-first design
 */
export function MyJobsPage() {
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today');

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['technician-jobs', filter],
    queryFn: async () => {
      const response = await apiClient.get('/work-orders/', {
        params: {
          status: filter === 'today' ? 'scheduled' : undefined,
          limit: 50
        }
      });
      return response.data.items || response.data || [];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'bg-info/20 text-info';
      case 'in_progress': return 'bg-warning/20 text-warning';
      case 'completed': return 'bg-success/20 text-success';
      case 'cancelled': return 'bg-danger/20 text-danger';
      default: return 'bg-text-muted/20 text-text-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-danger';
      case 'urgent': return 'text-danger font-bold';
      case 'medium': return 'text-warning';
      default: return 'text-text-muted';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-danger">
        <p>Failed to load jobs</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-primary underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['today', 'upcoming', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-bg-card text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Job Count */}
      <p className="text-sm text-text-muted mb-4">
        {jobs?.length || 0} jobs {filter === 'today' ? 'today' : ''}
      </p>

      {/* Job Cards */}
      <div className="space-y-3">
        {jobs?.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <p className="text-4xl mb-2">📋</p>
            <p>No jobs scheduled</p>
          </div>
        ) : (
          jobs?.map((job: Job) => (
            <Link
              key={job.id}
              to={`/field/job/${job.id}`}
              className="block bg-bg-card rounded-lg border border-border p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-text-primary">{job.customer_name}</h3>
                  <p className="text-sm text-text-secondary">{job.service_type}</p>
                </div>
                <span className={`text-xs font-medium ${getPriorityColor(job.priority)}`}>
                  {job.priority?.toUpperCase()}
                </span>
              </div>

              <p className="text-sm text-text-muted mb-3 flex items-center gap-1">
                <span>📍</span> {job.address}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {job.scheduled_time || 'TBD'}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                  {job.status?.replace('_', ' ')}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
