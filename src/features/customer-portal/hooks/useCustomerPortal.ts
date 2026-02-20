/**
 * Customer Self-Service Portal Hooks
 *
 * Uses a separate Bearer token stored in localStorage (not the staff session).
 * The token is issued by /customer-portal/verify-code with role="customer".
 */

const CUSTOMER_TOKEN_KEY = "customerPortalToken";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export function useCustomerPortalAuth() {
  const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);

  const logout = () => {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    window.location.href = "/customer-portal/login";
  };

  return { token, logout, isLoggedIn: !!token };
}

/** Fetch helper that injects Bearer auth and handles 401 by redirecting to login. */
async function customerFetch(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<Response> {
  const baseUrl =
    import.meta.env.VITE_API_URL ||
    "https://react-crm-api-production.up.railway.app/api/v2";

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    window.location.href = "/customer-portal/login";
    throw new Error("Unauthorized");
  }

  return res;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustomerAccount {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  system_type: string | null;
  manufacturer: string | null;
}

export interface CustomerService {
  id: string;
  work_order_number: string;
  service_type: string;
  status: string;
  scheduled_date: string | null;
  service_address: string | null;
  technician_name: string | null;
  notes: string | null;
}

export interface CustomerInvoice {
  id: string;
  invoice_number: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  due_date: string | null;
  created_at: string | null;
}

export interface NextService {
  next_service_date: string | null;
  estimated: boolean;
  service_type: string | null;
  notes: string | null;
}

export interface ServiceRequestInput {
  service_type: string;
  preferred_date: string;
  notes: string;
}

export interface ServiceRequestResponse {
  success: boolean;
  work_order_id: string;
  work_order_number: string;
}

// ---------------------------------------------------------------------------
// Request-code / Verify-code (no auth required)
// ---------------------------------------------------------------------------

export interface RequestCodeResponse {
  success: boolean;
  message: string;
  customer_id: string;
  sms_sent: boolean;
}

export interface VerifyCodeResponse {
  success: boolean;
  access_token: string;
  token_type: string;
}

export async function requestCode(
  contact: string,
): Promise<RequestCodeResponse> {
  const baseUrl =
    import.meta.env.VITE_API_URL ||
    "https://react-crm-api-production.up.railway.app/api/v2";

  const res = await fetch(`${baseUrl}/customer-portal/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact }),
  });

  const data = await res.json();

  if (!res.ok) {
    const message =
      (data as { detail?: string }).detail ||
      "Failed to send verification code";
    throw new Error(message);
  }

  return data as RequestCodeResponse;
}

export async function verifyCode(
  customerId: string,
  code: string,
): Promise<VerifyCodeResponse> {
  const baseUrl =
    import.meta.env.VITE_API_URL ||
    "https://react-crm-api-production.up.railway.app/api/v2";

  const res = await fetch(`${baseUrl}/customer-portal/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer_id: customerId, code }),
  });

  const data = await res.json();

  if (!res.ok) {
    const message =
      (data as { detail?: string }).detail ||
      "Invalid verification code";
    throw new Error(message);
  }

  return data as VerifyCodeResponse;
}

// ---------------------------------------------------------------------------
// Authenticated data fetchers (use with useEffect / useState)
// ---------------------------------------------------------------------------

export async function fetchMyAccount(token: string): Promise<CustomerAccount> {
  const res = await customerFetch("/customer-portal/my-account", token);
  return res.json() as Promise<CustomerAccount>;
}

export async function fetchMyServices(
  token: string,
): Promise<CustomerService[]> {
  const res = await customerFetch("/customer-portal/my-services", token);
  return res.json() as Promise<CustomerService[]>;
}

export async function fetchMyInvoices(
  token: string,
): Promise<CustomerInvoice[]> {
  const res = await customerFetch("/customer-portal/my-invoices", token);
  return res.json() as Promise<CustomerInvoice[]>;
}

export async function fetchMyNextService(
  token: string,
): Promise<NextService> {
  const res = await customerFetch("/customer-portal/my-next-service", token);
  return res.json() as Promise<NextService>;
}

export async function submitServiceRequest(
  token: string,
  input: ServiceRequestInput,
): Promise<ServiceRequestResponse> {
  const res = await customerFetch("/customer-portal/request-service", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.json() as Promise<ServiceRequestResponse>;
}
