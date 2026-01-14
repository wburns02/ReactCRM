import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth.ts";

interface RequireAuthProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "technician" | "sales";
}

/**
 * Protected route wrapper - redirects to login if not authenticated
 */
export function RequireAuth({ children, requiredRole }: RequireAuthProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?return=${returnUrl}`, { replace: true });
    }
  }, [
    isLoading,
    isAuthenticated,
    location.pathname,
    location.search,
    navigate,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-body">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Show loading while redirect happens
    return (
      <div className="flex h-screen items-center justify-center bg-bg-body">
        <div className="text-center">
          <p className="text-text-secondary">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check role if required
  if (requiredRole && user?.role !== requiredRole && user?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-body">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-text-primary">
            Access Denied
          </h1>
          <p className="mt-2 text-text-secondary">
            You don't have permission to access this page.
          </p>
          <a
            href="/"
            className="mt-4 inline-block text-primary hover:text-primary-hover"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
