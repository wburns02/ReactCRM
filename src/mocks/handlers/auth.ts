/**
 * Auth API mock handlers.
 *
 * @module mocks/handlers/auth
 */

import { http, HttpResponse } from "msw";

const API_BASE = import.meta.env.VITE_API_URL || "https://react-crm-api-production.up.railway.app/api/v2";

/**
 * Mock user for authentication tests.
 */
export const mockUser = {
  id: 1,
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  is_active: true,
  is_superuser: false,
  created_at: "2026-01-01T00:00:00Z",
};

/**
 * Auth API handlers.
 */
export const authHandlers = [
  // Login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === "test@example.com" && body.password === "password123") {
      return HttpResponse.json({
        access_token: "mock-token-123",
        token_type: "bearer",
        user: mockUser,
      });
    }

    return HttpResponse.json(
      {
        type: "https://api.ecbtx.com/problems/auth-001",
        title: "Unauthorized",
        status: 401,
        detail: "Invalid credentials",
        code: "AUTH_001",
        timestamp: new Date().toISOString(),
        trace_id: "mock-trace-id",
      },
      { status: 401 }
    );
  }),

  // Get current user
  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  // Logout
  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ message: "Logged out successfully" });
  }),
];
