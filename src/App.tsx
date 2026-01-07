import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from '@/routes/index.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.tsx';
import { OfflineIndicator } from '@/features/mobile/OfflineIndicator';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionTimeoutProvider } from '@/components/SessionTimeoutProvider';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
import { RoleProvider } from '@/providers/RoleProvider';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { OnboardingCheck } from '@/features/onboarding/OnboardingCheck';
import { PWAProvider } from '@/components/pwa';
import { initWebVitals } from '@/lib/webVitals';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Initialize Web Vitals monitoring
initWebVitals({
  debug: import.meta.env.DEV,
  reportToSentry: !!import.meta.env.VITE_SENTRY_DSN,
  onBudgetExceeded: (metric, budget) => {
    console.warn(`[Performance] ${metric.name} exceeded budget: ${metric.value} > ${budget}`);
  },
});

// Create a client with performance-optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute - reduce unnecessary refetches
      gcTime: 5 * 60_000, // 5 minutes - keep data in cache longer
      retry: 1, // Single retry - faster failure feedback
      retryDelay: 1000, // Simple 1s delay between retries
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always', // Always refetch on reconnect
    },
    mutations: {
      retry: 0, // No retries for mutations - let user retry explicitly
    },
  },
});

/**
 * Root App component with providers
 *
 * Provider order (outer to inner):
 * 1. ErrorBoundary - catches fatal React errors
 * 2. QueryClientProvider - server state management
 * 3. ToastProvider - toast notifications
 * 4. WebSocketProvider - real-time updates
 * 5. SessionTimeoutProvider - session management
 * 6. BrowserRouter - client-side routing
 * 7. RoleProvider - demo mode role switching
 * 8. PWAProvider - install prompts, update notifications, offline banner
 * 9. OnboardingCheck - redirects new users to onboarding wizard
 */
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <WebSocketProvider autoConnect>
            <SessionTimeoutProvider>
              <BrowserRouter basename="/">
                <RoleProvider>
                  <PWAProvider>
                    <OnboardingCheck>
                      <OfflineIndicator />
                      <RoleSwitcher />
                      <AppRoutes />
                    </OnboardingCheck>
                  </PWAProvider>
                </RoleProvider>
              </BrowserRouter>
            </SessionTimeoutProvider>
          </WebSocketProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
