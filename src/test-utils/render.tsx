/**
 * Custom render function with providers.
 *
 * Wraps components with all necessary providers for testing.
 *
 * @module test-utils/render
 */

import { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

/**
 * Create a fresh QueryClient for testing.
 *
 * Configured with aggressive defaults for tests:
 * - No retries (faster test failures)
 * - No automatic refetching
 * - Instant stale/gc times
 */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  /**
   * Custom query client for the test.
   * If not provided, a fresh client is created.
   */
  queryClient?: QueryClient;

  /**
   * Initial route for React Router.
   */
  route?: string;
}

/**
 * Custom render function that wraps components with all providers.
 *
 * @param ui - Component to render
 * @param options - Render options
 * @returns Render result with utilities
 *
 * @example
 * ```tsx
 * import { renderWithProviders, screen } from "@/test-utils";
 *
 * test("renders customer name", () => {
 *   renderWithProviders(<CustomerCard customer={mockCustomer} />);
 *   expect(screen.getByText("John Doe")).toBeInTheDocument();
 * });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    route = "/",
    ...renderOptions
  }: CustomRenderOptions = {}
): ReturnType<typeof render> & { queryClient: QueryClient } {
  // Set initial route
  window.history.pushState({}, "Test page", route);

  function Wrapper({ children }: WrapperProps): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { renderWithProviders as render };
