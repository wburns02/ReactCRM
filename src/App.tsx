import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from '@/routes/index.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.tsx';
import { OfflineIndicator } from '@/features/mobile/OfflineIndicator';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionTimeoutProvider } from '@/components/SessionTimeoutProvider';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
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

// Create a client with error handling defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      retry: 3, // Retry 3 times for transient failures (CORS, network issues)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
      refetchOnWindowFocus: false,
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
 */
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <WebSocketProvider autoConnect>
            <SessionTimeoutProvider>
              <BrowserRouter basename="/">
                <OfflineIndicator />
                <AppRoutes />
              </BrowserRouter>
            </SessionTimeoutProvider>
          </WebSocketProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
