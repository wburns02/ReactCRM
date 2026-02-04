/**
 * API Error Handler
 *
 * Provides utilities for handling API errors consistently across the app.
 * Integrates with the toast notification system and Sentry.
 * Supports RFC 7807 Problem Details responses from the backend.
 *
 * @module api/errorHandler
 */

import axios from "axios";
import { toastError, toastWarning } from "@/components/ui/Toast";
import { captureException, addBreadcrumb } from "@/lib/sentry";

/**
 * RFC 7807 Problem Details response from the API
 */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  timestamp: string;
  trace_id: string;
  errors?: Array<{
    field: string;
    message: string;
    type: string;
  }>;
  help_url?: string;
  retry_after?: number;
}

/**
 * Error codes from the backend for client-side handling
 */
export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: "AUTH_001",
  FORBIDDEN: "AUTH_002",
  SESSION_EXPIRED: "AUTH_003",
  CSRF_INVALID: "AUTH_004",

  // Validation
  VALIDATION_ERROR: "VAL_001",
  INVALID_FORMAT: "VAL_002",
  MISSING_FIELD: "VAL_003",

  // Resource
  NOT_FOUND: "RES_001",
  ALREADY_EXISTS: "RES_002",
  CONFLICT: "RES_003",

  // Business Logic
  BUSINESS_RULE_VIOLATION: "BIZ_001",
  QUOTA_EXCEEDED: "BIZ_002",

  // External Services
  EXTERNAL_SERVICE_ERROR: "EXT_001",

  // Server
  INTERNAL_ERROR: "SRV_001",
  SERVICE_UNAVAILABLE: "SRV_002",
} as const;

type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Check if an error response is a ProblemDetail (RFC 7807)
 */
export function isProblemDetail(data: unknown): data is ProblemDetail {
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    "trace_id" in data &&
    "detail" in data
  );
}

/**
 * Parse error response into ProblemDetail format
 */
export function parseError(error: unknown): ProblemDetail | null {
  if (axios.isAxiosError(error) && error.response?.data) {
    if (isProblemDetail(error.response.data)) {
      return error.response.data;
    }

    // Handle legacy error format (before RFC 7807 migration)
    const data = error.response.data as Record<string, unknown>;
    return {
      type: "about:blank",
      title: getDefaultTitle(error.response.status),
      status: error.response.status,
      detail:
        (data.detail as string) ||
        (data.error as string) ||
        (data.message as string) ||
        "An error occurred",
      code: "UNKNOWN",
      timestamp: new Date().toISOString(),
      trace_id: "legacy",
    };
  }

  return null;
}

/**
 * Get user-friendly message for an error
 */
export function getUserMessage(error: unknown): string {
  const problem = parseError(error);

  if (!problem) {
    if (error instanceof Error) {
      return error.message;
    }
    return "An unexpected error occurred";
  }

  // Provide user-friendly messages for common errors
  switch (problem.code) {
    case ErrorCodes.UNAUTHORIZED:
      return "Please log in to continue";
    case ErrorCodes.FORBIDDEN:
      return "You don't have permission to perform this action";
    case ErrorCodes.SESSION_EXPIRED:
      return "Your session has expired. Please log in again";
    case ErrorCodes.CSRF_INVALID:
      return "Security token expired. Please refresh the page";
    case ErrorCodes.NOT_FOUND:
      return problem.detail;
    case ErrorCodes.VALIDATION_ERROR:
      if (problem.errors?.length) {
        return problem.errors.map((e) => e.message).join(". ");
      }
      return problem.detail;
    case ErrorCodes.QUOTA_EXCEEDED:
      return `Rate limit exceeded. Please wait ${problem.retry_after || 60} seconds.`;
    case ErrorCodes.EXTERNAL_SERVICE_ERROR:
      return "A service is temporarily unavailable. Please try again.";
    case ErrorCodes.SERVICE_UNAVAILABLE:
      return "The server is temporarily unavailable. Please try again later.";
    case ErrorCodes.INTERNAL_ERROR:
      return "An unexpected error occurred. Please try again.";
    default:
      return problem.detail;
  }
}

/**
 * Show toast notification for an API error
 *
 * @param error - The error to display
 * @param options - Override default behavior
 * @returns The parsed ProblemDetail if available
 */
export function showErrorToast(
  error: unknown,
  options: {
    title?: string;
    showInDev?: boolean;
    reportToSentry?: boolean;
  } = {}
): ProblemDetail | null {
  const { title, showInDev = true, reportToSentry = true } = options;
  const problem = parseError(error);

  // Add breadcrumb for debugging
  addBreadcrumb(
    `API Error: ${problem?.code || "UNKNOWN"}`,
    "api",
    {
      status: problem?.status,
      detail: problem?.detail,
      trace_id: problem?.trace_id,
    },
    "error"
  );

  // Report to Sentry for server errors
  if (reportToSentry && problem && problem.status >= 500) {
    captureException(error as Error, {
      problem_detail: problem,
    });
  }

  const message = getUserMessage(error);

  // Determine toast variant based on error type
  if (problem?.code === ErrorCodes.QUOTA_EXCEEDED) {
    toastWarning(title || "Rate Limited", message);
  } else if (problem?.status && problem.status >= 500) {
    toastError(title || "Server Error", message);
  } else {
    toastError(title || "Error", message);
  }

  // Show trace ID in development
  if (import.meta.env.DEV && showInDev && problem?.trace_id) {
    console.error(`[API Error] Trace ID: ${problem.trace_id}`, problem);
  }

  return problem;
}

/**
 * Create error handler for React Query mutations
 *
 * @example
 * const mutation = useMutation({
 *   mutationFn: createCustomer,
 *   onError: createMutationErrorHandler("Failed to create customer"),
 * });
 */
export function createMutationErrorHandler(
  title: string,
  options: {
    showToast?: boolean;
    onValidationError?: (errors: ProblemDetail["errors"]) => void;
  } = {}
) {
  const { showToast: shouldShowToast = true, onValidationError } = options;

  return (error: unknown) => {
    const problem = parseError(error);

    // Handle validation errors specially
    if (
      problem?.code === ErrorCodes.VALIDATION_ERROR &&
      onValidationError &&
      problem.errors
    ) {
      onValidationError(problem.errors);
    }

    if (shouldShowToast) {
      showErrorToast(error, { title });
    }
  };
}

/**
 * Get default title for HTTP status code
 */
function getDefaultTitle(status: number): string {
  const titles: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Validation Error",
    429: "Too Many Requests",
    500: "Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
  };
  return titles[status] || "Error";
}

/**
 * Check if error is a specific error code
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  const problem = parseError(error);
  return problem?.code === code;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  return isErrorCode(error, ErrorCodes.VALIDATION_ERROR);
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const problem = parseError(error);
  return (
    problem?.code === ErrorCodes.UNAUTHORIZED ||
    problem?.code === ErrorCodes.SESSION_EXPIRED ||
    problem?.code === ErrorCodes.FORBIDDEN
  );
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  const problem = parseError(error);
  return problem !== null && problem.status >= 500;
}

/**
 * Get validation errors from a ProblemDetail response
 */
export function getValidationErrors(
  error: unknown
): ProblemDetail["errors"] | null {
  const problem = parseError(error);
  if (problem?.code === ErrorCodes.VALIDATION_ERROR && problem.errors) {
    return problem.errors;
  }
  return null;
}

/**
 * Convert validation errors to a field-keyed object for form libraries
 */
export function getFormErrors(
  error: unknown
): Record<string, string> | null {
  const errors = getValidationErrors(error);
  if (!errors) return null;

  return errors.reduce(
    (acc, err) => {
      // Handle nested fields like "body.email" -> "email"
      const field = err.field.replace(/^body\./, "");
      acc[field] = err.message;
      return acc;
    },
    {} as Record<string, string>
  );
}
