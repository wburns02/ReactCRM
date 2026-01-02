import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface RequirePortalAuthProps {
  children: ReactNode;
}

/**
 * Auth guard for customer portal routes.
 * Checks for portal_token in localStorage.
 */
export function RequirePortalAuth({ children }: RequirePortalAuthProps) {
  const token = localStorage.getItem('portal_token');

  if (!token) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
}
