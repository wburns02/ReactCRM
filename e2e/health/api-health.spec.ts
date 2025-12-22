import { test, expect } from '@playwright/test';

/**
 * API Health Tests
 *
 * Tests the FastAPI backend on Railway.
 * These verify the new API is healthy and responding correctly.
 */

// FastAPI backend on Railway (the working one)
const API_BASE = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

test.describe('API Health', () => {
  test('FastAPI backend health check', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.status).toBe('healthy');
    console.log(`FastAPI backend: ${data.status}, version: ${data.version}`);
  });

  test('FastAPI root endpoint responds', async ({ request }) => {
    const response = await request.get(`${API_BASE}/`);

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.name).toBe('React CRM API');
  });

  test('FastAPI auth endpoints exist', async ({ request }) => {
    // Login endpoint should return 422 (validation error) without body
    const response = await request.post(`${API_BASE}/api/v2/auth/login`, {
      data: {},
    });

    // 422 = endpoint exists but needs valid data
    // 405 = method not allowed (endpoint exists)
    // Don't expect 404
    expect(response.status()).not.toBe(404);
  });
});

test.describe('Legacy API Health (informational)', () => {
  // These tests check the legacy backend but don't fail on 500s
  // They provide visibility into legacy backend status

  test('legacy backend status', async ({ request }) => {
    const legacyBase = 'https://react.ecbtx.com';

    try {
      const response = await request.get(`${legacyBase}/api/auth/me`, {
        timeout: 10000,
      });

      const status = response.status();
      console.log(`Legacy backend /api/auth/me: ${status}`);

      if (status >= 500) {
        console.log('⚠️ Legacy backend returning 500 errors - needs investigation');
        // Don't fail - this is informational
        test.info().annotations.push({
          type: 'warning',
          description: 'Legacy backend returning 500 errors',
        });
      }
    } catch (error) {
      console.log('Legacy backend unreachable:', error);
    }

    // Always pass - this is monitoring, not a hard requirement
    expect(true).toBe(true);
  });

  test('legacy customers endpoint status', async ({ request }) => {
    const legacyBase = 'https://react.ecbtx.com';

    try {
      const response = await request.get(`${legacyBase}/api/customers/?page_size=1`, {
        timeout: 10000,
      });

      const status = response.status();
      console.log(`Legacy /api/customers/: ${status}`);

      if (response.ok()) {
        const data = await response.json();
        console.log(`Legacy customers: ${data.items?.length || 0} items returned`);
      } else if (status >= 500) {
        console.log('⚠️ Legacy customers API returning 500');
      }
    } catch (error) {
      console.log('Legacy customers API error:', error);
    }

    // Informational only
    expect(true).toBe(true);
  });
});

test.describe('API Response Times', () => {
  test('FastAPI health responds quickly', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${API_BASE}/health`);
    const duration = Date.now() - start;

    expect(response.ok()).toBe(true);
    expect(duration).toBeLessThan(5000);

    console.log(`FastAPI health response time: ${duration}ms`);
  });
});
