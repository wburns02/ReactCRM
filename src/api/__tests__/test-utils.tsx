import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, type RenderHookOptions } from '@testing-library/react';
import type { ReactNode } from 'react';

/**
 * Create a fresh QueryClient for testing
 *
 * Uses settings optimized for tests:
 * - No retries (fail fast)
 * - No background refetching
 * - Short GC time
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component that provides QueryClient
 */
export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

/**
 * Render a hook with QueryClient provider
 */
export function renderHookWithClient<TResult, TProps>(
  render: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'>
) {
  const queryClient = createTestQueryClient();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return {
    ...renderHook(render, { wrapper, ...options }),
    queryClient,
  };
}

/**
 * Wait for query to settle (not loading, not fetching)
 */
export async function waitForQueryToSettle() {
  // Allow React Query to process
  await new Promise((resolve) => setTimeout(resolve, 0));
}
