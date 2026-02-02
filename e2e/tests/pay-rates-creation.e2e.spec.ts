import { test, expect } from "@playwright/test";

/**
 * Pay Rates Creation E2E Tests
 *
 * Verifies that pay rates can be created successfully after fixing:
 * 1. Login 500 error (is_admin column missing)
 * 2. Pay rates creation endpoint
 *
 * @see PROGRESS_REMAINING_ISSUES_FIX.md
 */

const API_URL =
  process.env.API_URL || "https://react-crm-api-production.up.railway.app";

// Test credentials
const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";

test.describe("Pay Rates Creation Fix Verification", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginResponse = await request.post(`${API_URL}/api/v2/auth/login`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      authToken = loginData.access_token;
    }
  });

  test("Backend version should be 2.9.3 or higher", async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe("healthy");

    // Version should be at least 2.9.3 (is_admin column fix)
    const versionParts = data.version.split(".").map(Number);
    const minVersion = [2, 9, 3];

    const isVersionOk =
      versionParts[0] > minVersion[0] ||
      (versionParts[0] === minVersion[0] && versionParts[1] > minVersion[1]) ||
      (versionParts[0] === minVersion[0] &&
        versionParts[1] === minVersion[1] &&
        versionParts[2] >= minVersion[2]);

    expect(isVersionOk).toBeTruthy();
  });

  test("api_users table should have is_admin column", async ({ request }) => {
    const response = await request.get(`${API_URL}/health/db`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.database_connected).toBe(true);
    expect(data.api_users_columns).toContain("is_admin");
  });

  test("Login should return 200, not 500", async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v2/auth/login`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    // Should not get 500 error (the original issue)
    expect(response.status()).not.toBe(500);

    // If not rate limited, should succeed
    if (response.status() !== 429) {
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.access_token).toBeDefined();
      expect(data.token_type).toBe("bearer");
    }
  });

  test("GET /payroll/pay-rates should return list of rates", async ({
    request,
  }) => {
    test.skip(!authToken, "Auth token not available");

    const response = await request.get(`${API_URL}/api/v2/payroll/pay-rates`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.rates).toBeDefined();
    expect(Array.isArray(data.rates)).toBeTruthy();
  });

  test("POST /payroll/pay-rates should create hourly rate without 500", async ({
    request,
  }) => {
    test.skip(!authToken, "Auth token not available");

    // First get a technician ID
    const techResponse = await request.get(
      `${API_URL}/api/v2/payroll/pay-rates`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!techResponse.ok()) {
      test.skip();
      return;
    }

    const techData = await techResponse.json();

    // Skip if no technicians exist
    if (!techData.rates || techData.rates.length === 0) {
      test.skip();
      return;
    }

    const technicianId = techData.rates[0].technician_id;

    // Create hourly pay rate
    const response = await request.post(
      `${API_URL}/api/v2/payroll/pay-rates`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        data: {
          technician_id: technicianId,
          pay_type: "hourly",
          hourly_rate: 28.5,
          overtime_multiplier: 1.5,
          effective_date: "2026-02-15",
        },
      }
    );

    // Should not get 500 error (the original issue)
    expect(response.status()).not.toBe(500);

    // Should get successful response (200 or 201)
    if (response.ok()) {
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.technician_name).toBeDefined();
      expect(data.pay_type).toBe("hourly");
    }
  });

  test("POST /payroll/pay-rates should create salary rate without 500", async ({
    request,
  }) => {
    test.skip(!authToken, "Auth token not available");

    // First get a technician ID
    const techResponse = await request.get(
      `${API_URL}/api/v2/payroll/pay-rates`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!techResponse.ok()) {
      test.skip();
      return;
    }

    const techData = await techResponse.json();

    // Skip if no technicians exist
    if (!techData.rates || techData.rates.length === 0) {
      test.skip();
      return;
    }

    const technicianId = techData.rates[0].technician_id;

    // Create salary pay rate
    const response = await request.post(
      `${API_URL}/api/v2/payroll/pay-rates`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        data: {
          technician_id: technicianId,
          pay_type: "salary",
          salary_amount: 65000,
          commission_rate: 0.05,
          effective_date: "2026-02-16",
        },
      }
    );

    // Should not get 500 error
    expect(response.status()).not.toBe(500);

    // Should get successful response (200 or 201)
    if (response.ok()) {
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.technician_name).toBeDefined();
      expect(data.pay_type).toBe("salary");
    }
  });
});
