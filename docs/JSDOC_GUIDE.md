# JSDoc Standards Guide

This guide defines documentation standards for the React CRM frontend codebase.

## Function Documentation

```typescript
/**
 * Formats a phone number for display.
 *
 * Converts various phone number formats to a consistent display format
 * with proper spacing and area code grouping.
 *
 * @param phone - Raw phone number string
 * @param options - Formatting options
 * @param options.international - Whether to include country code
 * @returns Formatted phone number or empty string if invalid
 *
 * @example
 * formatPhone("5551234567") // "(555) 123-4567"
 * formatPhone("15551234567", { international: true }) // "+1 (555) 123-4567"
 */
export function formatPhone(
  phone: string,
  options?: { international?: boolean }
): string
```

## React Hook Documentation

```typescript
/**
 * Hook for managing customer data and operations.
 *
 * Provides customer CRUD operations with automatic cache invalidation
 * and optimistic updates for better UX.
 *
 * @param customerId - Optional customer ID for single-customer mode
 * @returns Customer data, loading state, and mutation functions
 *
 * @example
 * ```tsx
 * function CustomerPage({ id }) {
 *   const { customer, isLoading, updateCustomer } = useCustomer(id);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <CustomerForm
 *       data={customer}
 *       onSave={(data) => updateCustomer.mutate(data)}
 *     />
 *   );
 * }
 * ```
 */
export function useCustomer(customerId?: number) {
  // implementation
}
```

## Component Documentation

```typescript
/**
 * Customer information card with edit capabilities.
 *
 * Displays customer contact details, service history summary,
 * and account status. Supports inline editing for quick updates.
 *
 * @component
 * @example
 * ```tsx
 * <CustomerCard
 *   customer={customer}
 *   onEdit={handleEdit}
 *   showHistory
 * />
 * ```
 */
export function CustomerCard({
  customer,
  onEdit,
  showHistory = false,
}: CustomerCardProps) {
  // implementation
}
```

## Interface/Type Documentation

```typescript
/**
 * Customer data as returned by the API.
 *
 * Represents a complete customer record with all fields
 * populated from the database.
 */
export interface Customer {
  /** Unique identifier */
  id: number;

  /** Customer's full name */
  name: string;

  /** Primary email address */
  email: string;

  /** Primary phone number in E.164 format */
  phone: string;

  /** Street address */
  address: string;

  /** Service history count */
  serviceCount: number;

  /** Account creation timestamp */
  createdAt: string;

  /** Whether the customer account is active */
  isActive: boolean;
}

/**
 * Props for the CustomerCard component.
 */
export interface CustomerCardProps {
  /** Customer data to display */
  customer: Customer;

  /** Callback when edit is requested */
  onEdit?: (customer: Customer) => void;

  /** Whether to show service history section */
  showHistory?: boolean;
}
```

## Constants and Configuration

```typescript
/**
 * Maximum customers per page in list views.
 * Optimized for performance and UX balance.
 */
export const PAGE_SIZE = 20;

/**
 * Stale time for customer queries (5 minutes).
 * Cached data is considered fresh for this duration.
 */
export const CUSTOMER_STALE_TIME = 5 * 60 * 1000;
```

## API Function Documentation

```typescript
/**
 * Fetches a paginated list of customers.
 *
 * Supports filtering, sorting, and search across customer fields.
 *
 * @param params - Query parameters
 * @param params.page - Page number (1-indexed)
 * @param params.limit - Results per page (max 100)
 * @param params.search - Search query for name/email
 * @param params.sortBy - Field to sort by
 * @param params.sortOrder - Sort direction ('asc' | 'desc')
 * @returns Paginated customer list with total count
 *
 * @throws {AxiosError} If the request fails
 */
export async function fetchCustomers(params: CustomerListParams): Promise<PaginatedResponse<Customer>>
```

## Error Handling Documentation

```typescript
/**
 * Handles API errors with user-friendly messages.
 *
 * Parses RFC 7807 Problem Detail responses and extracts
 * appropriate error messages for display.
 *
 * @param error - Error from API call (typically AxiosError)
 * @param options - Display options
 * @param options.title - Custom title for error toast
 * @param options.showToast - Whether to show toast notification
 * @returns Parsed problem detail or null if not an API error
 */
export function handleApiError(
  error: unknown,
  options?: { title?: string; showToast?: boolean }
): ProblemDetail | null
```

## When to Document

### Always Document
- Exported functions and components
- Custom hooks
- Type/interface definitions
- API integration functions
- Complex utility functions

### Recommended
- Props interfaces
- State management logic
- Non-obvious algorithms
- Side effects and subscriptions

### Optional
- Simple helper functions
- Obvious one-liners
- Internal implementation details

## JSDoc Tags Reference

| Tag | Usage |
|-----|-------|
| `@param` | Function parameter |
| `@returns` | Return value |
| `@throws` | Exceptions thrown |
| `@example` | Usage example |
| `@component` | React component |
| `@deprecated` | Deprecated API |
| `@see` | Related documentation |
| `@since` | Version introduced |

## TypeScript Integration

JSDoc works seamlessly with TypeScript. Use TypeScript types for parameters and returns, and JSDoc for descriptions:

```typescript
/**
 * Creates a debounced version of a function.
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void
```

## IDE Support

Properly documented code provides:
- Hover documentation in VSCode/WebStorm
- Autocomplete with descriptions
- Parameter hints during typing
- Quick navigation to definitions
