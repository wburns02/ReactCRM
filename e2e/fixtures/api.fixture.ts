import { test as base, expect, APIRequestContext, request as playwrightRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * API test fixture for contract testing.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/api.fixture';
 *
 * Features:
 *   - Pre-configured API request context with auth
 *   - Uses correct API URL (not frontend URL)
 *   - Extracts auth token from storage state
 *   - Helper methods for common API patterns
 *   - Response validation utilities
 */

const API_BASE_URL = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';
// Auth file is at project root, not in e2e folder
const AUTH_FILE = path.join(process.cwd(), '.auth', 'user.json');

type ApiFixtures = {
  api: APIRequestContext;
};

/**
 * Extract auth token from storage state file.
 */
function getAuthToken(): string | null {
  try {
    if (!fs.existsSync(AUTH_FILE)) {
      return null;
    }
    const storageState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    // Look for auth_token in localStorage entries
    const origins = storageState.origins || [];
    for (const origin of origins) {
      const localStorage = origin.localStorage || [];
      for (const item of localStorage) {
        if (item.name === 'auth_token') {
          return item.value;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export const test = base.extend<ApiFixtures>({
  /**
   * Authenticated API request context pointing to the backend API.
   */
  api: async ({}, use) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Create a new API context with the correct base URL and auth header
    const apiContext = await playwrightRequest.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: headers,
    });

    await use(apiContext);
    await apiContext.dispose();
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
 * Note: Work order IDs are UUIDs (strings), not integers.
 */
export const workOrderShape = {
  id: expect.any(String),  // UUIDs are strings
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
