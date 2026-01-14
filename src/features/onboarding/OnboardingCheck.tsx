import { useMemo, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isOnboardingCompleted } from "./useOnboarding";
import { useAuth } from "@/features/auth/useAuth";

export interface OnboardingCheckProps {
  children: ReactNode;
}

/**
 * Component that checks if onboarding is needed
 * Redirects new users to the onboarding wizard
 *
 * This should wrap the AppLayout to check on every authenticated route
 */
export function OnboardingCheck({ children }: OnboardingCheckProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Check onboarding status only once per render
  const shouldRedirectToOnboarding = useMemo(() => {
    // Skip check while auth is loading
    if (isLoading) return false;

    // Only check for authenticated users
    if (!isAuthenticated) return false;

    // Skip check for certain paths
    const skipPaths = ["/onboarding", "/login", "/portal"];
    if (skipPaths.some((path) => location.pathname.startsWith(path))) {
      return false;
    }

    // Check if onboarding is completed
    return !isOnboardingCompleted();
  }, [isAuthenticated, isLoading, location.pathname]);

  // Show loading while auth is checking
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-main">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to onboarding if needed
  if (shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
