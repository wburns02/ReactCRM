import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from '@/routes/index.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.tsx';
import { OfflineIndicator } from '@/features/mobile/OfflineIndicator';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Create a client with error handling defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      retry: 1, // Single retry for transient failures
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
 * 3. BrowserRouter - client-side routing
 */
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename="/">
          <OfflineIndicator />
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
