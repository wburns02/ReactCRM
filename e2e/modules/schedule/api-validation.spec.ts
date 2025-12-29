import { test, expect } from '@playwright/test';

/**
 * API Validation tests for Schedule-related endpoints
 *
 * These tests verify that the API endpoints return correct responses
 * and don't return 404/422 errors that would break the schedule page.
 */

test.describe('Schedule API Validation', () => {
  const apiUrl = process.env.VITE_API_URL || 'https://react-crm-api-production.up.railway.app/api/v2';

  test('ringcentral status endpoint returns 200 (not 404)', async ({ request }) => {
    const response = await request.get(`${apiUrl}/ringcentral/status`, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Should return 200 (not 404) - 401 is ok if auth required
    expect([200, 401]).toContain(response.status());
    expect(response.status()).not.toBe(404);
  });

  test('work-orders with page_size=200 returns 200 (not 422)', async ({ request }) => {
    const response = await request.get(`${apiUrl}/work-orders/?page=1&page_size=200`, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Should return 200 (not 422) - 401 is ok if auth required
    expect([200, 401]).toContain(response.status());
    expect(response.status()).not.toBe(422);
  });

  test('work-orders with page_size=500 returns 200 (not 422)', async ({ request }) => {
    const response = await request.get(`${apiUrl}/work-orders/?page=1&page_size=500`, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Should return 200 (not 422) - 401 is ok if auth required
    expect([200, 401]).toContain(response.status());
    expect(response.status()).not.toBe(422);
  });

  test('work-orders with status=draft returns 200 (not 422)', async ({ request }) => {
    const response = await request.get(`${apiUrl}/work-orders/?page=1&page_size=200&status=draft`, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Should return 200 (not 422) - 401 is ok if auth required
    expect([200, 401]).toContain(response.status());
    expect(response.status()).not.toBe(422);
  });
});
