import { test, expect } from '@playwright/test';

/**
 * API Health Check E2E Tests
 *
 * Tests the backend API health endpoint to ensure the service is running.
 * These tests verify the API is accessible from the frontend's perspective.
 */

const API_URL = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

test.describe('API Health', () => {
  test('health endpoint returns healthy status', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data).toHaveProperty('version');
  });

  test('root endpoint returns API info', async ({ request }) => {
    const response = await request.get(`${API_URL}/`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.name).toBe('React CRM API');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('health');
  });

  test('API responds within acceptable time', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${API_URL}/health`);
    const duration = Date.now() - start;

    expect(response.status()).toBe(200);
    // Health check should respond within 5 seconds
    expect(duration).toBeLessThan(5000);
  });

  test('API returns correct content type', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
  });
});
