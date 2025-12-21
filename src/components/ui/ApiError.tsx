import { Button } from './Button.tsx';
import { Card } from './Card.tsx';
import { getErrorMessage, isApiError } from '@/api/client.ts';

interface ApiErrorProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

/**
 * User-friendly API error display with retry option
 *
 * Handles:
 * - 401 Unauthorized (redirects automatically via apiClient)
 * - 500 Server errors
 * - Network errors
 * - Unknown errors
 */
export function ApiError({
  error,
  onRetry,
  title = 'Unable to load data',
}: ApiErrorProps) {
  const message = getErrorMessage(error);
  const status = isApiError(error) ? error.response?.status : undefined;

  // Determine error type for icon/styling
  const isNetworkError = !status && message.toLowerCase().includes('network');
  const isServerError = status && status >= 500;

  const icon = isNetworkError ? '🌐' : isServerError ? '🔧' : '⚠️';
  const subtitle = isNetworkError
    ? 'Please check your internet connection and try again.'
    : isServerError
      ? 'Our servers are having trouble. Please try again in a moment.'
      : 'An error occurred while loading the data.';

  return (
    <Card className="border-danger/30 bg-danger/5">
      <div className="flex flex-col items-center text-center py-8 px-4">
        <span className="text-4xl mb-4" role="img" aria-label="Error">
          {icon}
        </span>
        <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-text-secondary mb-2">{subtitle}</p>
        {import.meta.env.DEV && (
          <p className="text-sm text-danger mb-4 font-mono">{message}</p>
        )}
        {onRetry && (
          <div className="mt-4">
            <Button onClick={onRetry} size="sm">
              Try Again
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
