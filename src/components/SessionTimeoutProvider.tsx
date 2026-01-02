import { useCallback } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useToast } from '@/components/ui/Toast';
import { hasAuthToken } from '@/api/client';

/**
 * Session timeout provider component
 *
 * Monitors user activity and logs out after idle period.
 * Shows warning toast before timeout.
 *
 * SECURITY: Prevents session hijacking from unattended devices.
 */
export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();

  const handleWarning = useCallback(() => {
    addToast({
      title: 'Session Expiring',
      description: 'Your session will expire in 5 minutes due to inactivity. Move your mouse or press any key to stay logged in.',
      variant: 'warning',
      duration: 30000, // Show for 30 seconds
    });
  }, [addToast]);

  const handleTimeout = useCallback(() => {
    addToast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
      variant: 'error',
      duration: 5000,
    });
    // Default timeout handler will redirect to login
  }, [addToast]);

  // Only enable timeout if user is authenticated
  useSessionTimeout({
    enabled: hasAuthToken(),
    onWarning: handleWarning,
    onTimeout: handleTimeout,
    timeoutMs: 30 * 60 * 1000, // 30 minutes
    warningMs: 5 * 60 * 1000, // 5 minutes before timeout
  });

  return <>{children}</>;
}
