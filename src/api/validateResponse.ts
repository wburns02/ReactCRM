/**
 * Response Validation Utility
 *
 * Validates API responses against Zod schemas in ALL environments.
 * Reports violations to Sentry in production for monitoring.
 *
 * 2026 Best Practice: Don't silently accept invalid data in production.
 */

import type { ZodSchema, ZodError } from "zod";
import { captureException, addBreadcrumb } from "@/lib/sentry";

interface ValidationOptions {
  /** Whether to throw on validation failure (default: false for backwards compatibility) */
  strict?: boolean;
  /** Additional context for error reporting */
  context?: Record<string, unknown>;
}

/**
 * Validate API response against a Zod schema.
 *
 * - Always logs validation errors to console
 * - Reports to Sentry in production
 * - Returns original data to avoid breaking UI (unless strict mode)
 *
 * @param schema - Zod schema to validate against
 * @param data - Response data to validate
 * @param endpoint - API endpoint for error context
 * @param options - Validation options
 * @returns Validated data (or original data if validation fails and not strict)
 */
export function validateResponse<T>(
  schema: ZodSchema<T>,
  data: unknown,
  endpoint: string,
  options: ValidationOptions = {}
): T {
  const { strict = false, context = {} } = options;

  const result = schema.safeParse(data);

  if (!result.success) {
    const error = result.error;

    // Store for debugging
    if (typeof window !== 'undefined') {
      (window as any).__schemaErrors = (window as any).__schemaErrors || [];
      (window as any).__schemaErrors.push({
        endpoint,
        formatted: error.format(),
        issues: error.issues
      });
    }

    // Always log to console for debugging
    console.error(`[API Schema Violation] ${endpoint}:`, error.format());

    // Add breadcrumb for Sentry trace
    const issues = error.issues || [];
    addBreadcrumb(
      `Schema validation failed for ${endpoint}`,
      "api.validation",
      {
        endpoint,
        errorCount: issues.length,
        firstError: issues[0]?.message,
      },
      "warning"
    );

    // Report to Sentry (works in all environments if configured)
    captureException(new SchemaValidationError(endpoint, error), {
      type: "schema_violation",
      endpoint,
      validationErrors: error.format(),
      dataPreview: truncateData(data),
      ...context,
    });

    // In strict mode, throw the error
    if (strict) {
      throw new SchemaValidationError(endpoint, error);
    }

    // Return original data for backwards compatibility
    // This allows the UI to continue working even with schema drift
    return data as T;
  }

  return result.data;
}

/**
 * Custom error class for schema validation failures
 */
export class SchemaValidationError extends Error {
  public readonly endpoint: string;
  public readonly zodError: ZodError<unknown>;

  constructor(endpoint: string, zodError: ZodError<unknown>) {
    const issues = zodError.issues || [];
    const firstError = issues[0];
    const path = firstError?.path.join(".") || "root";
    const message = `API schema validation failed for ${endpoint}: ${firstError?.message} at ${path}`;

    super(message);
    this.name = "SchemaValidationError";
    this.endpoint = endpoint;
    this.zodError = zodError;
  }
}

/**
 * Truncate data for error reporting (avoid sending huge payloads to Sentry)
 */
function truncateData(data: unknown, maxLength = 500): string {
  try {
    const json = JSON.stringify(data);
    if (json.length > maxLength) {
      return json.slice(0, maxLength) + "... (truncated)";
    }
    return json;
  } catch {
    return "[Unable to serialize data]";
  }
}

/**
 * Helper for validating array responses
 */
export function validateArrayResponse<T>(
  itemSchema: ZodSchema<T>,
  data: unknown,
  endpoint: string,
  options: ValidationOptions = {}
): T[] {
  if (!Array.isArray(data)) {
    console.error(`[API Schema Violation] ${endpoint}: Expected array, got ${typeof data}`);

    captureException(new Error(`Expected array response from ${endpoint}`), {
      type: "schema_violation",
      endpoint,
      dataType: typeof data,
      dataPreview: truncateData(data),
    });

    return options.strict ? [] : (data as T[]);
  }

  // Validate each item
  const validItems: T[] = [];
  const invalidIndices: number[] = [];

  data.forEach((item, index) => {
    const result = itemSchema.safeParse(item);
    if (result.success) {
      validItems.push(result.data);
    } else {
      invalidIndices.push(index);
      console.warn(`[API Schema Violation] ${endpoint}[${index}]:`, result.error.format());
    }
  });

  if (invalidIndices.length > 0) {
    addBreadcrumb(
      `${invalidIndices.length} invalid items in array from ${endpoint}`,
      "api.validation",
      { invalidIndices, total: data.length },
      "warning"
    );
  }

  // Return all items for backwards compatibility (or only valid in strict mode)
  return options.strict ? validItems : (data as T[]);
}
