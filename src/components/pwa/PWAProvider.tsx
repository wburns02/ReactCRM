import type { ReactNode } from 'react';
import { InstallPrompt } from './InstallPrompt';
import { UpdatePrompt } from './UpdatePrompt';
import { OfflineBanner } from './OfflineBanner';

interface PWAProviderProps {
  children: ReactNode;
}

/**
 * PWA Provider Component
 * Wraps the app with PWA-specific UI elements:
 * - Install prompt banner
 * - Update notification banner
 * - Offline status indicator
 */
export function PWAProvider({ children }: PWAProviderProps) {
  return (
    <>
      {/* Update notification at top */}
      <UpdatePrompt />

      {/* Offline banner below header */}
      <OfflineBanner />

      {/* Main app content */}
      {children}

      {/* Install prompt at bottom */}
      <InstallPrompt />
    </>
  );
}

export default PWAProvider;
