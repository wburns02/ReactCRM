/**
 * TOP ISSUES ANNIHILATION - E2E Verification Tests
 *
 * These tests verify that the critical issues identified in the CRM audit
 * have been properly fixed and remain stable.
 *
 * Issues Covered:
 * - #5: Production Validation (validateResponse utility)
 * - #4: Authorization Enforcement (RBAC on critical endpoints)
 * - #6: Debug Endpoints Removed
 *
 * @author Claude Opus 4.5 - CRM Auditor
 * @date February 2, 2026
 */

import { test, expect, APIRequestContext } from "@playwright/test";

// API base URL
const API_BASE = "https://react-crm-api-production.up.railway.app/api/v2";

// Helper to make requests without stored auth
async function makeUnauthRequest(request: APIRequestContext, url: string, method: "GET" | "POST" = "GET") {
  const options = {
    headers: {
      "Content-Type": "application/json",
    },
    // Don't use stored state
    ignoreHTTPSErrors: true,
  };

  if (method === "GET") {
    return await request.get(url, options);
  } else {
    return await request.post(url, options);
  }
}

test.describe("Top Issues Annihilation Verification", () => {
  // Use a fresh context without auth storage
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe("Issue #4: Authorization Enforcement", () => {
    test("should reject unauthorized access to payroll approval", async ({
      request,
    }) => {
      // Attempt to approve payroll without admin token
      const response = await request.post(
        `${API_BASE}/payroll/periods/test-id/approve`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Should be rejected - 401 (no auth) or 403 (not authorized)
      expect([401, 403]).toContain(response.status());
    });

    test("should reject unauthorized access to user management", async ({
      request,
    }) => {
      // Attempt to list users without admin token
      const response = await request.get(`${API_BASE}/admin/users`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Should be rejected - 401 (no auth) or 403 (not authorized)
      expect([401, 403]).toContain(response.status());
    });

    test("should reject unauthorized access to system settings", async ({
      request,
    }) => {
      // Attempt to get system settings without admin token
      const response = await request.get(`${API_BASE}/admin/settings/system`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Should be rejected - 401 (no auth) or 403 (not authorized)
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe("Issue #5: Production Validation", () => {
    test("API health check should return valid response", async ({
      request,
    }) => {
      const response = await request.get(`${API_BASE.replace("/api/v2", "")}/health`);

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      // Validate health response structure
      expect(data).toHaveProperty("status", "healthy");
      expect(data).toHaveProperty("version");
      expect(typeof data.version).toBe("string");
      // Verify we're on the latest version with RBAC
      expect(data.version).toBe("2.8.8");
    });

    test("customers endpoint requires authentication", async ({
      request,
    }) => {
      // Attempt to access customers without token
      const response = await request.get(`${API_BASE}/customers/`);

      // Should require authentication - 401 without auth
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Issue #6: Debug Endpoints Removed", () => {
    test("debug endpoints should return 404", async ({ request }) => {
      // These endpoints were removed in a prior fix
      const debugEndpoints = [
        "/debug/customers",
        "/debug/work-orders",
        "/debug/technicians",
      ];

      for (const endpoint of debugEndpoints) {
        const response = await request.get(`${API_BASE}${endpoint}`);
        // Should return 404 (not found) - endpoints removed
        expect(response.status()).toBe(404);
      }
    });
  });

  test.describe("API Security Verification", () => {
    test("work orders endpoint requires authentication", async ({ request }) => {
      const response = await request.get(`${API_BASE}/work-orders`);
      // Should require auth - 401 without token
      expect(response.status()).toBe(401);
    });

    test("technicians endpoint requires authentication", async ({ request }) => {
      const response = await request.get(`${API_BASE}/technicians/`);
      // Should require auth - 401 without token
      expect(response.status()).toBe(401);
    });

    test("invoices endpoint requires authentication", async ({ request }) => {
      const response = await request.get(`${API_BASE}/invoices`);
      // Should require auth - 401 without token
      expect(response.status()).toBe(401);
    });
  });
});

test.describe("Security Regression Tests", () => {
  // Use a fresh context without auth storage
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should not expose admin endpoints without authentication", async ({
    request,
  }) => {
    const adminEndpoints = [
      "/admin/users",
      "/admin/settings/system",
      "/admin/settings/security",
    ];

    for (const endpoint of adminEndpoints) {
      const response = await request.get(`${API_BASE}${endpoint}`);
      // All admin endpoints should require authentication - 401 or 403
      expect([401, 403]).toContain(response.status());
    }
  });

  test("should not expose payroll endpoints without authentication", async ({
    request,
  }) => {
    const payrollEndpoints = [
      "/payroll/periods",
      "/payroll/time-entries",
      "/payroll/commissions",
    ];

    for (const endpoint of payrollEndpoints) {
      const response = await request.get(`${API_BASE}${endpoint}`);
      // All payroll endpoints should require authentication - 401
      expect(response.status()).toBe(401);
    }
  });
});
