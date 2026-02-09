/**
 * Half-Done Audit Verification Test
 *
 * Verifies all fixes from the half-done code elimination:
 * 1. Previously-500 endpoints now return 200
 * 2. Stub endpoints return 200 with empty data
 * 3. Page_size limits work
 * 4. No console errors on key pages
 */
import { test, expect, type Page } from "@playwright/test";

const API = "https://react-crm-api-production.up.railway.app/api/v2";
const APP = "https://react.ecbtx.com";

let authPage: Page;
let sessionCookie: string;

test.describe("Half-Done Audit Verification", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    authPage = await context.newPage();

    // Login
    await authPage.goto(`${APP}/login`);
    await authPage.fill('input[type="email"]', "will@macseptic.com");
    await authPage.fill('input[type="password"]', "#Espn2025");
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(
      () => !window.location.href.includes("/login"),
      null,
      { timeout: 15000 },
    );

    // Extract session cookie
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === "session");
    sessionCookie = session?.value || "";
    expect(sessionCookie).toBeTruthy();
  });

  test.afterAll(async () => {
    await authPage?.context().close();
  });

  // Helper to make authenticated API calls
  async function apiGet(endpoint: string): Promise<{ status: number; data: unknown }> {
    const result = await authPage.evaluate(
      async ({ url, cookie }: { url: string; cookie: string }) => {
        const resp = await fetch(url, {
          credentials: "include",
          headers: { Cookie: `session=${cookie}` },
        });
        let data;
        try {
          data = await resp.json();
        } catch {
          data = null;
        }
        return { status: resp.status, data };
      },
      { url: `${API}${endpoint}`, cookie: sessionCookie },
    );
    return result;
  }

  test("Backend health check", async ({ request }) => {
    const resp = await request.get(
      "https://react-crm-api-production.up.railway.app/health",
    );
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.status).toBe("healthy");
  });

  test("Previously-500 endpoints now return 200", async () => {
    const endpoints = [
      "/predictions/summary",
      "/cs/dashboard/overview",
      "/cs/dashboard/at-risk-customers",
      "/integrations/social/status",
      "/integrations/social/reviews",
      "/analytics/operations/locations",
      "/analytics/operations/alerts",
      "/analytics/operations/today",
    ];

    for (const endpoint of endpoints) {
      const { status } = await apiGet(endpoint);
      expect(status, `${endpoint} should return 200`).toBe(200);
    }
  });

  test("Stub endpoints return 200 with empty data", async () => {
    const stubs = [
      "/sms/templates",
      "/sms/conversations",
      "/sms/stats",
      "/sms/settings",
      "/templates",
      "/reminders",
      "/billing/stats",
      "/help/articles",
      "/help/categories",
    ];

    for (const endpoint of stubs) {
      const { status, data } = await apiGet(endpoint);
      expect(status, `${endpoint} should return 200`).toBe(200);
      expect(data).toBeTruthy();
    }
  });

  test("Page size limits accept larger values", async () => {
    const { status: woStatus } = await apiGet("/work-orders?page_size=1000");
    expect(woStatus).toBe(200);

    const { status: invStatus } = await apiGet("/invoices/?page_size=1000");
    expect(invStatus).toBe(200);

    const { status: eqStatus } = await apiGet("/equipment?page_size=500");
    expect(eqStatus).toBe(200);
  });

  test("Dashboard loads without console errors", async () => {
    const errors: string[] = [];
    authPage.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter known/expected errors
        if (
          text.includes("API Schema Violation") ||
          text.includes("Sentry") ||
          text.includes("ResizeObserver") ||
          text.includes("favicon") ||
          text.includes("Failed to load resource") ||
          text.includes("server responded with a status of")
        )
          return;
        errors.push(text);
      }
    });

    await authPage.goto(`${APP}/`, { waitUntil: "networkidle" });
    await authPage.waitForTimeout(3000);

    // Allow some errors but flag critical ones
    const criticalErrors = errors.filter(
      (e) => e.includes("500") || e.includes("TypeError") || e.includes("Cannot read"),
    );
    expect(
      criticalErrors.length,
      `Critical console errors: ${criticalErrors.join(", ")}`,
    ).toBe(0);
  });

  test("Key pages load without network 500s", async () => {
    const pages = [
      "/customers",
      "/work-orders",
      "/invoices",
      "/payments",
      "/equipment",
    ];
    const failures: string[] = [];

    for (const path of pages) {
      const networkErrors: string[] = [];
      const handler = (response: { status: () => number; url: () => string }) => {
        if (response.status() >= 500) {
          networkErrors.push(`${response.status()} ${response.url()}`);
        }
      };
      authPage.on("response", handler);

      await authPage.goto(`${APP}${path}`, { waitUntil: "networkidle" });
      await authPage.waitForTimeout(2000);

      authPage.off("response", handler);

      if (networkErrors.length > 0) {
        failures.push(`${path}: ${networkErrors.join(", ")}`);
      }
    }

    expect(failures.length, `Pages with 500 errors: ${failures.join("; ")}`).toBe(0);
  });
});
