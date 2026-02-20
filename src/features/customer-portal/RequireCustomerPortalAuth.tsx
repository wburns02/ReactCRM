import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

interface RequireCustomerPortalAuthProps {
  children: ReactNode;
}

/**
 * Auth guard for customer portal routes.
 * Checks for customerPortalToken in localStorage.
 * If not found, redirects to /customer-portal/login.
 */
export function RequireCustomerPortalAuth({
  children,
}: RequireCustomerPortalAuthProps) {
  const token = localStorage.getItem("customerPortalToken");

  if (!token) {
    return <Navigate to="/customer-portal/login" replace />;
  }

  return <>{children}</>;
}
