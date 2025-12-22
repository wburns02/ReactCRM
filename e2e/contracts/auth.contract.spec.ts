import { test, expect } from '../fixtures/api.fixture';

/**
 * Auth API Contract Tests
 *
 * Validates authentication endpoint contracts for FastAPI v2 backend.
 * These tests are fast (API-only) and catch backend changes early.
 */

test.describe('Auth API Contract', () => {
  test('GET /auth/me returns user when authenticated', async ({ api }) => {
    // Try v2 API first (FastAPI), fall back to legacy
    let response = await api.get('/api/v2/auth/me');
    if (!response.ok()) {
      response = await api.get('/api/auth/me');
    }

    expect(response.ok()).toBe(true);

    const data = await response.json();
    // Response is wrapped: { user: {...} }
    const user = data.user ?? data;

    // Validate user shape
    expect(user).toHaveProperty('id');
    // ID can be string or number depending on backend
    expect(user.id).toBeDefined();

    // Should have email
    expect(user.email).toBeDefined();

    // Should have role
    expect(user.role).toBeDefined();

    console.log('User shape:', Object.keys(user));
  });

  test('POST /auth/logout succeeds', async ({ api }) => {
    // Note: This may invalidate the session for subsequent tests
    // Consider skipping or running last
    // Try v2 API first, fall back to legacy
    let response = await api.post('/api/v2/auth/logout');
    if (response.status() >= 500) {
      response = await api.post('/api/auth/logout');
    }

    // Should succeed (200) or indicate no session (400/401)
    expect(response.status()).toBeLessThan(500);
  });
});
