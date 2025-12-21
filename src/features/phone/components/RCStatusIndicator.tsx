import { useRCStatus } from '../api.ts';
import { Badge } from '@/components/ui/Badge.tsx';

/**
 * RingCentral connection status indicator
 * Shows in app header/toolbar
 */
export function RCStatusIndicator() {
  const { data: status, isLoading } = useRCStatus();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-bg-hover">
        <div className="w-2 h-2 rounded-full bg-text-muted animate-pulse" />
        <span className="text-xs text-text-muted">Checking...</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-bg-hover">
      <div
        className={`w-2 h-2 rounded-full ${
          status.connected ? 'bg-success' : 'bg-text-muted'
        }`}
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">
          RingCentral: {status.connected ? 'Connected' : 'Disconnected'}
        </span>
        {status.connected && status.extension && (
          <Badge variant="default" className="text-xs">
            Ext. {status.extension}
          </Badge>
        )}
      </div>
    </div>
  );
}
