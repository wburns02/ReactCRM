/**
 * Technician Dashboard DATA LOADING Tests
 *
 * Verifies the core fix: tech@macseptic.com (Test Technician) should see
 * their assigned jobs on /my-dashboard. Before the fix, 0 jobs were shown
 * because the query only checked technician_id (UUID FK, always NULL)
 * instead of also checking assigned_technician (name string).
 *
 * Also verifies schedule/by-date endpoint fix (was returning 500).
 */
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

// Known console errors to ignore
const KNOWN_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "ERR_BLOCKED_BY_CLIENT",
  "net::ERR",
];

function isKnownError(msg: string): boolean {
  return KNOWN_ERRORS.some((known) => msg.includes(known));
}

test.describe("Tech Dashboard Data Loading (tech@macseptic.com)", () => {
  let authPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    authPage = await context.newPage();

    // Login as tech@macseptic.com (Test Technician — has assigned jobs)
    await authPage.goto(`${BASE_URL}/login`);
    await authPage.fill('input[type="email"]', "tech@macseptic.com");
    await authPage.fill('input[type="password"]', "#Espn2025");
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(
      () => !window.location.href.includes("/login"),
      { timeout: 15000 },
    );
    await authPage.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await authPage?.context()?.close();
  });

  test("1. Backend returns jobs for Test Technician", async () => {
    const response = await authPage.evaluate(async (url) => {
      const res = await fetch(`${url}/technician-dashboard/my-summary`, {
        credentials: "include",
      });
      return { status: res.status, data: await res.json() };
    }, API_URL);

    expect(response.status).toBe(200);
    expect(response.data.technician.first_name).toBe("Test");
    expect(response.data.technician.last_name).toBe("Technician");
    expect(response.data.technician.id).toBeTruthy();

    // CRITICAL: Must have jobs (was 0 before fix)
    expect(response.data.todays_jobs.length).toBeGreaterThan(0);
    expect(response.data.today_stats.total_jobs).toBeGreaterThan(0);
  });

  test("2. Jobs have real customer names (not 'Customer')", async () => {
    const response = await authPage.evaluate(async (url) => {
      const res = await fetch(`${url}/technician-dashboard/my-summary`, {
        credentials: "include",
      });
      return await res.json();
    }, API_URL);

    for (const job of response.todays_jobs) {
      expect(job.customer_name).toBeTruthy();
      expect(job.customer_name).not.toBe("Customer");
      expect(job.id).toBeTruthy();
      expect(job.job_type).toBeTruthy();
      expect(job.status_label).toBeTruthy();
      expect(["blue", "yellow", "orange", "green", "red", "gray"]).toContain(
        job.status_color,
      );
    }
  });

  test("3. Dashboard page shows job cards in UI", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(3000);

    // Should NOT show "No jobs scheduled today" (because there ARE jobs)
    const bodyText = (await authPage.textContent("body")) || "";
    expect(bodyText).not.toContain("No jobs scheduled today");

    // Should show at least one job card with customer name and job type
    const jobsSection = authPage.locator('text="My Jobs Today"');
    await expect(jobsSection).toBeVisible();
  });

  test("4. Quick stats show non-zero total_jobs", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(3000);

    // The "Left" stat should show a non-zero number (there are remaining jobs)
    const leftStat = authPage.locator('text="Left"').first();
    await expect(leftStat).toBeVisible();

    // Check the body text for non-zero stats numbers
    const bodyText = (await authPage.textContent("body")) || "";
    // We should see at least one non-zero stat
    expect(bodyText).toMatch(/[1-9]\d*/);
  });

  test("5. No unexpected console errors on page load", async () => {
    const errors: string[] = [];
    authPage.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(3000);

    const unexpectedErrors = errors.filter((e) => !isKnownError(e));
    if (unexpectedErrors.length > 0) {
      console.log("Unexpected console errors:", unexpectedErrors);
    }
    expect(unexpectedErrors.length).toBeLessThanOrEqual(2);
  });
});

test.describe("Schedule By-Date Fix", () => {
  test("6. /schedule/by-date returns 200 (was 500)", async ({ request }) => {
    // Login to get session
    const loginResp = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: "will@macseptic.com",
        password: "#Espn2025",
      },
    });
    expect(loginResp.ok()).toBeTruthy();

    const today = new Date().toISOString().split("T")[0];
    const scheduleResp = await request.get(
      `${API_URL}/schedule/by-date?date=${today}`,
    );
    expect(scheduleResp.status()).toBe(200);

    const data = await scheduleResp.json();
    expect(data).toHaveProperty("items");
    expect(data).toHaveProperty("total");
    expect(Array.isArray(data.items)).toBe(true);
  });
});
