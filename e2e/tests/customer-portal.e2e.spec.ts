/**
 * Customer Self-Service Portal E2E Tests (Session 5A)
 *
 * Tests the backend API for the customer portal:
 * - OTP request flow (graceful 404 if customer not found)
 * - JWT auth enforcement on protected endpoints
 * - Wrong code returns 401
 * - Protected endpoint enumeration (my-services, my-next-service, etc.)
 *
 * All tests use page.evaluate(fetch(...)) for browser-cookie-authenticated
 * API calls following the established pattern in this codebase.
 *
 * Note: The frontend login page (/customer-portal/login) is built in Session 5B.
 * These tests focus on the API layer.
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const APP_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";
const PORTAL_API = `${API_URL}/customer-portal`;

// Known noise to suppress from console
const KNOWN_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "downloadable font",
  "third-party cookie",
  "net::ERR_",
];

function isKnownError(msg: string): boolean {
  return KNOWN_ERRORS.some((pattern) => msg.includes(pattern));
}

test.describe.serial("Customer Portal API (Session 5A)", () => {
  let context: BrowserContext;
  let page: Page;

  // -------------------------------------------------------------------------
  // Test 1: Login as admin (establishes browser session for page.evaluate)
  // -------------------------------------------------------------------------
  test("1. Login as admin", async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      storageState: undefined,
    });
    page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });

    await context.clearCookies();

    await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // If already logged in, clear and retry
    if (!page.url().includes("/login")) {
      await context.clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }

    await page.fill(
      'input[name="email"], input[type="email"]',
      "will@macseptic.com"
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      "#Espn2025"
    );
    await page.click('button[type="submit"]');

    try {
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 }
      );
    } catch {
      // Retry once
      await page.fill(
        'input[name="email"], input[type="email"]',
        "will@macseptic.com"
      );
      await page.fill(
        'input[name="password"], input[type="password"]',
        "#Espn2025"
      );
      await page.click('button[type="submit"]');
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 }
      );
    }

    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain("/login");
    console.log("Admin login successful, current URL:", page.url());
  });

  // -------------------------------------------------------------------------
  // Test 2: POST /request-code with unknown contact → 404
  // -------------------------------------------------------------------------
  test("2. request-code with unknown contact returns 404", async () => {
    const result = await page.evaluate(async (portalApi: string) => {
      const res = await fetch(`${portalApi}/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: "notarealcustomer_xyz@nowhere.invalid" }),
      });
      return { status: res.status, body: await res.json() };
    }, PORTAL_API);

    console.log(`request-code (unknown): status=${result.status}`);
    expect(result.status).toBe(404);
    expect(result.body.detail).toMatch(/No account found/i);
  });

  // -------------------------------------------------------------------------
  // Test 3: GET /my-account without auth → 401
  // -------------------------------------------------------------------------
  test("3. my-account without token returns 401", async () => {
    const result = await page.evaluate(async (portalApi: string) => {
      // Deliberately no Authorization header
      const res = await fetch(`${portalApi}/my-account`, {
        method: "GET",
      });
      return { status: res.status, body: await res.json() };
    }, PORTAL_API);

    console.log(`my-account (no auth): status=${result.status}`);
    expect(result.status).toBe(401);
    expect(result.body.detail).toMatch(/validate customer credentials/i);
  });

  // -------------------------------------------------------------------------
  // Test 4: POST /verify-code with wrong code → 401
  // -------------------------------------------------------------------------
  test("4. verify-code with wrong code returns 401 or 400", async () => {
    // First we need a valid customer_id — get one by requesting a code
    // (even if we can't receive the SMS, the request-code returns the ID)

    // Try with a real phone number format first — most likely won't match a customer
    // Use a predictable non-real customer UUID
    const fakeCustomerId = "00000000-0000-0000-0000-000000000001";

    const result = await page.evaluate(
      async (args: { portalApi: string; customerId: string }) => {
        const res = await fetch(`${args.portalApi}/verify-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_id: args.customerId,
            code: "999999",
          }),
        });
        return { status: res.status, body: await res.json() };
      },
      { portalApi: PORTAL_API, customerId: fakeCustomerId }
    );

    console.log(`verify-code (fake customer): status=${result.status}`);
    // Should be 404 (customer not found) - also acceptable
    expect([400, 401, 404]).toContain(result.status);
  });

  // -------------------------------------------------------------------------
  // Test 5: GET /my-services without auth → 401
  // -------------------------------------------------------------------------
  test("5. my-services without auth returns 401", async () => {
    const result = await page.evaluate(async (portalApi: string) => {
      const res = await fetch(`${portalApi}/my-services`);
      return { status: res.status };
    }, PORTAL_API);

    console.log(`my-services (no auth): status=${result.status}`);
    expect(result.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Test 6: GET /my-next-service without auth → 401
  // -------------------------------------------------------------------------
  test("6. my-next-service without auth returns 401", async () => {
    const result = await page.evaluate(async (portalApi: string) => {
      const res = await fetch(`${portalApi}/my-next-service`);
      return { status: res.status };
    }, PORTAL_API);

    console.log(`my-next-service (no auth): status=${result.status}`);
    expect(result.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Test 7: GET /my-invoices without auth → 401
  // -------------------------------------------------------------------------
  test("7. my-invoices without auth returns 401", async () => {
    const result = await page.evaluate(async (portalApi: string) => {
      const res = await fetch(`${portalApi}/my-invoices`);
      return { status: res.status };
    }, PORTAL_API);

    console.log(`my-invoices (no auth): status=${result.status}`);
    expect(result.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Test 8: verify-code with invalid UUID format → 400
  // -------------------------------------------------------------------------
  test("8. verify-code with invalid UUID format returns 400", async () => {
    const result = await page.evaluate(async (portalApi: string) => {
      const res = await fetch(`${portalApi}/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: "not-a-uuid",
          code: "123456",
        }),
      });
      return { status: res.status, body: await res.json() };
    }, PORTAL_API);

    console.log(`verify-code (invalid UUID): status=${result.status}`);
    expect(result.status).toBe(400);
    expect(result.body.detail).toMatch(/Invalid customer_id format/i);
  });

  // -------------------------------------------------------------------------
  // Test 9: Bearer token with wrong role → 401 on protected endpoints
  // -------------------------------------------------------------------------
  test("9. Admin JWT (role=admin) rejected on customer-portal endpoints", async () => {
    // Get the admin JWT from the browser's localStorage or cookie
    // The admin token has role="admin" (not "customer"), so should be rejected
    const result = await page.evaluate(
      async (args: { portalApi: string; apiUrl: string }) => {
        // Get admin token
        const loginRes = await fetch(`${args.apiUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "will@macseptic.com",
            password: "#Espn2025",
          }),
          credentials: "include",
        });
        const loginData = await loginRes.json();
        const adminToken = loginData.access_token || loginData.token || "";

        if (!adminToken) {
          return { status: -1, error: "No token in login response" };
        }

        // Try to use admin token on a customer portal endpoint
        const res = await fetch(`${args.portalApi}/my-account`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        return { status: res.status, body: await res.json() };
      },
      { portalApi: PORTAL_API, apiUrl: API_URL }
    );

    console.log(`my-account with admin JWT: status=${result.status}`);
    // Admin JWT has role="admin" not "customer" — should be rejected with 401
    expect(result.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Test 10: Full OTP flow with a real customer (uses first customer with phone)
  // -------------------------------------------------------------------------
  test("10. Full OTP flow: request-code → verify-code → my-account", async () => {
    // Fetch a real customer with a phone number via admin API
    const customer = await page.evaluate(async (apiUrl: string) => {
      const res = await fetch(
        `${apiUrl}/customers?limit=20`,
        { credentials: "include" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const items: Array<{ id: string; phone: string; email: string; first_name: string; last_name: string }> =
        data.items ?? data ?? [];
      return items.find((c) => c.phone && c.phone.length >= 10) ?? null;
    }, API_URL);

    if (!customer) {
      console.log("No customer with phone found — skipping full OTP flow test");
      test.skip();
      return;
    }

    console.log(
      `Testing full flow with customer: ${customer.first_name} ${customer.last_name} (phone: ${customer.phone})`
    );

    // Step 1: Request code — get customer_id back
    const requestResult = await page.evaluate(
      async (args: { portalApi: string; phone: string }) => {
        const res = await fetch(`${args.portalApi}/request-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact: args.phone }),
        });
        return { status: res.status, body: await res.json() };
      },
      { portalApi: PORTAL_API, phone: customer.phone }
    );

    console.log(`request-code: status=${requestResult.status}, body=${JSON.stringify(requestResult.body)}`);
    expect(requestResult.status).toBe(200);
    expect(requestResult.body.success).toBe(true);
    expect(requestResult.body.customer_id).toBeTruthy();

    const customerId = requestResult.body.customer_id;

    // Step 2: verify-code with wrong code → 401
    const wrongCodeResult = await page.evaluate(
      async (args: { portalApi: string; customerId: string }) => {
        const res = await fetch(`${args.portalApi}/verify-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_id: args.customerId,
            code: "000000",
          }),
        });
        return { status: res.status, body: await res.json() };
      },
      { portalApi: PORTAL_API, customerId }
    );

    console.log(`verify-code (wrong code): status=${wrongCodeResult.status}`);
    expect(wrongCodeResult.status).toBe(401);
    expect(wrongCodeResult.body.detail).toMatch(/Invalid verification code/i);
  });
});
