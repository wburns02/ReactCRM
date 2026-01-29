import React, { Suspense } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Loading spinner for lazy-loaded routes
 */
export const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

/**
 * Widget wrapper that parses URL params and passes to child widget
 */
export function WidgetWrapper({ children }: { children: React.ReactElement }) {
  const [searchParams] = useSearchParams();

  // Parse all URL params into props
  const widgetProps: Record<string, string | number | boolean> = {};
  searchParams.forEach((value, key) => {
    // Try to parse as number or boolean
    if (value === "true") widgetProps[key] = true;
    else if (value === "false") widgetProps[key] = false;
    else if (!isNaN(Number(value)) && value !== "")
      widgetProps[key] = Number(value);
    else widgetProps[key] = value;
  });

  // Clone child with parsed props
  return (
    <div className="min-h-screen bg-bg-body p-4 flex items-center justify-center">
      {React.cloneElement(children, widgetProps)}
    </div>
  );
}

/**
 * Helper component to wrap lazy-loaded components with Suspense
 */
export function LazyRoute({
  component: Component,
}: {
  component: React.LazyExoticComponent<React.ComponentType>;
}) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

/**
 * Helper to create a lazy import for named exports
 */
export function lazyLoad<T extends Record<string, unknown>>(
  importFn: () => Promise<T>,
  exportName: keyof T,
): React.LazyExoticComponent<React.ComponentType> {
  return React.lazy(() =>
    importFn().then((module) => ({
      default: module[exportName] as React.ComponentType,
    })),
  );
}
