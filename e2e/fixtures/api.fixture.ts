import { test as base, expect, APIRequestContext } from '@playwright/test';

/**
 * API test fixture for contract testing.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/api.fixture';
 *
 * Features:
 *   - Pre-configured API request context with auth
 *   - Helper methods for common API patterns
 *   - Response validation utilities
 */

type ApiFixtures = {
  api: APIRequestContext;
};

export const test = base.extend<ApiFixtures>({
  /**
   * Authenticated API request context.
   * Inherits storage state from auth.setup.ts.
   */
  api: async ({ request }, use) => {
    await use(request);
  },
});

export { expect };

/**
 * Validate paginated response shape.
 * Most CRM endpoints return: { items: T[], total: number, page: number, page_size: number }
 */
export function expectPaginatedResponse(data: unknown): asserts data is {
  items: unknown[];
  total: number;
  page: number;
  page_size: number;
} {
  expect(data).toHaveProperty('items');
  expect(data).toHaveProperty('total');
  expect(data).toHaveProperty('page');
  expect(data).toHaveProperty('page_size');
  expect(Array.isArray((data as { items: unknown[] }).items)).toBe(true);
}

/**
 * Validate error response shape.
 * Flask API returns: { error: string, detail?: string, hint?: string }
 */
export function expectErrorResponse(data: unknown): asserts data is {
  error: string;
  detail?: string;
  hint?: string;
} {
  expect(data).toHaveProperty('error');
  expect(typeof (data as { error: string }).error).toBe('string');
}

/**
 * Common customer fields to validate.
 */
export const customerShape = {
  id: expect.any(Number),
  first_name: expect.any(String),
  last_name: expect.any(String),
};

/**
 * Common work order fields to validate.
 */
export const workOrderShape = {
  id: expect.any(Number),
  customer_id: expect.any(Number),
  job_type: expect.any(String),
  status: expect.any(String),
};

/**
 * Common invoice fields to validate.
 */
export const invoiceShape = {
  id: expect.any(Number),
  customer_id: expect.any(Number),
  status: expect.any(String),
  total: expect.any(Number),
};
