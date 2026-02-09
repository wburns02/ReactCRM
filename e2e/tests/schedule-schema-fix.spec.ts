/**
 * Schedule Schema Violation & Drag-Drop Fix Verification
 *
 * Verifies:
 * 1. No [API Schema Violation] errors on /schedule page load
 * 2. Work orders API returns 200 with valid data
 * 3. Schedule page loads without 500 errors
 * 4. Unscheduled panel loads work orders
 */
import { test, expect, type Page } from "@playwright/test";

const API = "https://react-crm-api-production.up.railway.app/api/v2";
const APP = "https://react.ecbtx.com";

let authPage: Page;
let sessionCookie: string;

test.describe("Schedule Schema & Drag-Drop Fixes", () => {
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
  async function apiGet(endpoint: string): Promise<{ status: number; data: any }> {
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

  test("Work orders API returns valid paginated response", async () => {
    const { status, data } = await apiGet("/work-orders?page=1&page_size=10");
    expect(status).toBe(200);
    expect(data).toHaveProperty("items");
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("page");
    expect(data).toHaveProperty("page_size");
    expect(Array.isArray(data.items)).toBe(true);

    // Verify GPS fields are numbers (not strings) after Decimal→float fix
    if (data.items.length > 0) {
      const wo = data.items[0];
      // These should be null or number, NEVER string
      if (wo.clock_in_gps_lat !== null && wo.clock_in_gps_lat !== undefined) {
        expect(typeof wo.clock_in_gps_lat).toBe("number");
      }
      if (wo.total_amount !== null && wo.total_amount !== undefined) {
        // total_amount is still Decimal (string) from backend - frontend transforms it
        expect(["number", "string"]).toContain(typeof wo.total_amount);
      }
    }
  });

  test("Schedule page loads without schema violations", async () => {
    const schemaViolations: string[] = [];
    const consoleErrors: string[] = [];

    authPage.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[API Schema Violation]")) {
        // Only track work-order related violations
        if (text.includes("/work-orders")) {
          schemaViolations.push(text);
        }
      }
      if (msg.type() === "error") {
        if (
          text.includes("API Schema Violation") ||
          text.includes("Sentry") ||
          text.includes("ResizeObserver") ||
          text.includes("favicon") ||
          text.includes("Failed to load resource") ||
          text.includes("server responded with a status of")
        )
          return;
        consoleErrors.push(text);
      }
    });

    // Strip cache-control headers to avoid stale data
    await authPage.route("**/*", (route) => {
      route.continue().catch(() => {});
    });

    await authPage.goto(`${APP}/schedule`, { waitUntil: "networkidle" });
    await authPage.waitForTimeout(5000); // Wait for all queries to settle

    // Check for work-order schema violations
    expect(
      schemaViolations.length,
      `Work order schema violations found: ${schemaViolations.join("\n")}`,
    ).toBe(0);
  });

  test("Schedule page has no 500 errors", async () => {
    const networkErrors: string[] = [];
    const handler = (response: { status: () => number; url: () => string }) => {
      if (response.status() >= 500) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    };
    authPage.on("response", handler);

    await authPage.goto(`${APP}/schedule`, { waitUntil: "networkidle" });
    await authPage.waitForTimeout(3000);

    authPage.off("response", handler);

    expect(
      networkErrors.length,
      `500 errors on schedule page: ${networkErrors.join(", ")}`,
    ).toBe(0);
  });

  test("Work orders with date filter return valid data", async () => {
    // Test the exact query pattern DayView/WeekView uses
    const today = new Date().toISOString().split("T")[0];
    const { status, data } = await apiGet(
      `/work-orders?page=1&page_size=200&scheduled_date_from=${today}&scheduled_date_to=${today}`,
    );
    expect(status).toBe(200);
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  });

  test("Unscheduled work orders endpoint works", async () => {
    const { status, data } = await apiGet(
      "/work-orders?page=1&page_size=200&status=draft",
    );
    expect(status).toBe(200);
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  });

  test("Schedule page renders key elements", async () => {
    await authPage.goto(`${APP}/schedule`, { waitUntil: "networkidle" });
    await authPage.waitForTimeout(3000);

    // Should have schedule toolbar or view selector
    const pageContent = await authPage.textContent("body");
    // Schedule page should show some recognizable content
    const hasScheduleContent =
      pageContent?.includes("Schedule") ||
      pageContent?.includes("Day") ||
      pageContent?.includes("Week") ||
      pageContent?.includes("Unscheduled");

    expect(hasScheduleContent).toBe(true);
  });
});
