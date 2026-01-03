import { useState } from 'react';
import { useCalls, useCallDispositions, type Call, type CallFilters } from '../api/calls.ts';
import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { formatDate } from '@/lib/utils.ts';

interface CallListProps {
  customerId?: number;
  onCallSelect?: (call: Call) => void;
}

export function CallList({ customerId, onCallSelect }: CallListProps) {
  const [filters, setFilters] = useState<CallFilters>({
    page: 1,
    page_size: 20,
    customer_id: customerId,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('');

  const { data, isLoading, error } = useCalls({
    ...filters,
    direction: directionFilter || undefined,
    search: searchTerm || undefined,
  });
  const { data: dispositions } = useCallDispositions();

  const calls = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / (filters.page_size || 20));

  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return '-';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const getDispositionColor = (dispositionName: string | null | undefined): string => {
    if (!dispositionName) return '#6B7280';
    const disp = dispositions?.find((d) => d.name === dispositionName);
    return disp?.color || '#6B7280';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1, search: searchTerm }));
  };

  if (error) {
    return (
      <div className="bg-bg-error/10 border border-border-error rounded-lg p-4 text-text-error">
        Error loading calls: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">🔍</span>
            <Input
              type="text"
              placeholder="Search by phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <div className="flex gap-2">
          <select
            value={directionFilter}
            onChange={(e) => {
              setDirectionFilter(e.target.value);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
            aria-label="Filter by direction"
          >
            <option value="">All Directions</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-bg-muted rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && calls.length === 0 && (
        <div className="text-center py-12 border border-border rounded-lg">
          <span className="text-4xl mb-4 block">📞</span>
          <h3 className="text-lg font-medium text-text-primary mb-2">No calls found</h3>
          <p className="text-text-muted">
            {searchTerm || directionFilter
              ? 'Try adjusting your filters'
              : 'Call logs will appear here'}
          </p>
        </div>
      )}

      {/* Call list */}
      {!isLoading && calls.length > 0 && (
        <div className="space-y-2">
          {calls.map((call) => (
            <div
              key={call.id}
              onClick={() => onCallSelect?.(call)}
              className={`
                p-4 rounded-lg border border-border bg-bg-primary
                hover:bg-bg-hover transition-colors
                ${onCallSelect ? 'cursor-pointer' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`
                      p-2 rounded-full text-lg
                      ${call.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'}
                    `}
                  >
                    {call.direction === 'inbound' ? '📥' : '📤'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">
                        {call.direction === 'inbound'
                          ? formatPhoneNumber(call.caller_number)
                          : formatPhoneNumber(call.called_number)}
                      </span>
                      <Badge variant={call.direction === 'inbound' ? 'success' : 'info'}>
                        {call.direction}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-muted mt-1">
                      <span>{call.call_date ? formatDate(call.call_date) : '-'}</span>
                      <span>{call.call_time || ''}</span>
                      <span>{formatDuration(call.duration_seconds)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {call.call_disposition && (
                    <Badge
                      style={{ backgroundColor: getDispositionColor(call.call_disposition) }}
                      className="text-white"
                    >
                      {call.call_disposition}
                    </Badge>
                  )}
                  {call.recording_url && (
                    <a
                      href={call.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-primary hover:underline"
                    >
                      🎙️ Recording
                    </a>
                  )}
                </div>
              </div>
              {call.notes && (
                <p className="mt-2 text-sm text-text-muted pl-14">{call.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-text-muted">
            Showing {((filters.page || 1) - 1) * (filters.page_size || 20) + 1} to{' '}
            {Math.min((filters.page || 1) * (filters.page_size || 20), total)} of {total} calls
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
              disabled={(filters.page || 1) <= 1}
            >
              ← Previous
            </Button>
            <span className="text-sm text-text-muted">
              Page {filters.page || 1} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
              disabled={(filters.page || 1) >= totalPages}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
