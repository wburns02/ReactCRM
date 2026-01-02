import { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  lastSync?: string;
  onConfigure?: () => void;
  onDisconnect?: () => void;
  onTest?: () => void;
  isLoading?: boolean;
}

/**
 * Card showing integration status and actions
 *
 * Memoized for performance.
 */
export const IntegrationCard = memo(function IntegrationCard({
  name,
  description,
  icon,
  connected,
  lastSync,
  onConfigure,
  onDisconnect,
  onTest,
  isLoading,
}: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{icon}</div>
            <div>
              <CardTitle>{name}</CardTitle>
              <p className="text-sm text-text-secondary mt-1">{description}</p>
            </div>
          </div>
          <Badge variant={connected ? 'success' : 'default'}>
            {connected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {lastSync && (
          <p className="text-sm text-text-muted mb-4">
            Last synced: {new Date(lastSync).toLocaleString()}
          </p>
        )}

        <div className="flex gap-2">
          {onConfigure && (
            <Button
              variant="secondary"
              onClick={onConfigure}
              disabled={isLoading}
              size="sm"
            >
              Configure
            </Button>
          )}
          {onTest && connected && (
            <Button
              variant="secondary"
              onClick={onTest}
              disabled={isLoading}
              size="sm"
            >
              Test Connection
            </Button>
          )}
          {onDisconnect && connected && (
            <Button
              variant="danger"
              onClick={onDisconnect}
              disabled={isLoading}
              size="sm"
            >
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
