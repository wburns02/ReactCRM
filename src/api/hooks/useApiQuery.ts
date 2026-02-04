/**
 * Custom query hooks with integrated error handling and toast notifications.
 *
 * These wrappers provide consistent error handling across the application,
 * integrating with the RFC 7807 error format from the backend.
 *
 * @module api/hooks/useApiQuery
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  showErrorToast,
  parseError,
  isValidationError,
  type ProblemDetail,
} from "../errorHandler";

/**
 * useQuery wrapper with consistent error handling
 *
 * By default, queries don't show toasts since they typically display
 * inline error states. Enable showErrorToast for critical queries.
 *
 * @example
 * ```tsx
 * const { data, error } = useApiQuery(
 *   ["customers", filters],
 *   () => fetchCustomers(filters),
 *   { showErrorToast: true, errorTitle: "Failed to load customers" }
 * );
 *
 * if (error) {
 *   return <ApiError error={error} onRetry={() => refetch()} />;
 * }
 * ```
 */
export function useApiQuery<TData>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options: {
    showErrorToast?: boolean;
    errorTitle?: string;
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
    retry?: boolean | number;
  } = {}
) {
  const {
    showErrorToast: shouldShowToast = false,
    errorTitle,
    ...queryOptions
  } = options;

  return useQuery({
    queryKey,
    queryFn,
    ...queryOptions,
  });
}

/**
 * useMutation wrapper with consistent error handling
 *
 * By default, mutations show error toasts since they represent
 * user-initiated actions that should provide feedback.
 *
 * @example
 * ```tsx
 * const mutation = useApiMutation(
 *   createCustomer,
 *   {
 *     errorTitle: "Failed to create customer",
 *     invalidateKeys: [["customers"]],
 *     onValidationError: (errors) => {
 *       // Map to form errors
 *       errors?.forEach(e => setError(e.field, { message: e.message }));
 *     },
 *     onSuccess: () => {
 *       toast.success("Customer created");
 *     },
 *   }
 * );
 * ```
 */
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    /** Show toast on error (default: true) */
    showErrorToast?: boolean;
    /** Custom error title for toast */
    errorTitle?: string;
    /** Callback for validation errors with field details */
    onValidationError?: (errors: ProblemDetail["errors"]) => void;
    /** Query keys to invalidate on success */
    invalidateKeys?: QueryKey[];
    /** Called on successful mutation */
    onSuccess?: (data: TData, variables: TVariables) => void;
    /** Called on mutation error (after toast is shown) */
    onError?: (error: AxiosError, variables: TVariables) => void;
  } = {}
) {
  const {
    showErrorToast: shouldShowToast = true,
    errorTitle = "Operation failed",
    onValidationError,
    invalidateKeys,
    onSuccess,
    onError,
  } = options;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Invalidate specified queries on success
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Call user-provided onSuccess
      onSuccess?.(data, variables);
    },
    onError: (error: AxiosError, variables) => {
      // Handle validation errors specially
      if (onValidationError && isValidationError(error)) {
        const problem = parseError(error);
        if (problem?.errors) {
          onValidationError(problem.errors);
        }
      }

      // Show error toast
      if (shouldShowToast) {
        showErrorToast(error, { title: errorTitle });
      }

      // Call user-provided onError
      onError?.(error, variables);
    },
  });
}
