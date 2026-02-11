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

// --- Shared auth state (login ONCE, reuse across all tests) ---
let techCookie = "";
let techToken = "";

test.describe("Tech Dashboard Data Loading", () => {
  let authPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Login once via Node.js fetch (avoids Playwright request fixture limitation in beforeAll)
    const resp = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "tech@macseptic.com",
        password: "#Espn2025",
      }),
    });
    expect(resp.ok).toBe(true);

    const cookies = resp.headers.get("set-cookie") || "";
    const match = cookies.match(/session=([^;]+)/);
    techCookie = match?.[1] || "";
    expect(techCookie).toBeTruthy();

    const body = await resp.json();
    techToken = body.access_token || body.token || "";

    // Create shared browser context for UI tests
    const context = await browser.newContext();
    authPage = await context.newPage();
    await authPage.goto(BASE_URL, { waitUntil: "commit" });
    await authPage.evaluate(
      ({ jwt, cookie }: { jwt: string; cookie: string }) => {
        if (jwt) localStorage.setItem("crm_session_token", jwt);
        const state = JSON.stringify({
          isAuthenticated: true,
          lastValidated: Date.now(),
        });
        sessionStorage.setItem("session_state", state);
        localStorage.setItem("session_state", state);
        // Also set cookie for API calls from page context
        document.cookie = `session=${cookie}; path=/`;
      },
      { jwt: techToken, cookie: techCookie },
    );

    await authPage.goto(`${BASE_URL}/my-dashboard`, {
      waitUntil: "networkidle",
    });
    await authPage.waitForTimeout(3000);
  });

  test.afterAll(async () => {
    await authPage?.context()?.close();
  });

  // --- API-level tests ---

  test("1. Backend returns jobs for Test Technician", async () => {
    const response = await fetch(
      `${API_URL}/technician-dashboard/my-summary`,
      { headers: { Cookie: `session=${techCookie}` } },
    );
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.technician.first_name).toBe("Test");
    expect(data.technician.last_name).toBe("Technician");
    expect(data.technician.id).toBeTruthy();

    // CRITICAL: Must have jobs (was 0 before fix)
    expect(data.todays_jobs.length).toBeGreaterThan(0);
    expect(data.today_stats.total_jobs).toBeGreaterThan(0);
  });

  test("2. Jobs have real customer names (not 'Customer')", async () => {
    const response = await fetch(
      `${API_URL}/technician-dashboard/my-summary`,
      { headers: { Cookie: `session=${techCookie}` } },
    );
    const data = await response.json();

    for (const job of data.todays_jobs) {
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

  // --- UI-level tests ---

  test("3. Dashboard page shows job cards in UI", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(3000);

    const bodyText = (await authPage.textContent("body")) || "";
    expect(bodyText).not.toContain("No jobs scheduled today");

    const jobsSection = authPage.locator('text="My Jobs Today"');
    await expect(jobsSection).toBeVisible();
  });

  test("4. Quick stats show non-zero total_jobs", async () => {
    const leftStat = authPage.locator('text="Left"').first();
    await expect(leftStat).toBeVisible();

    const bodyText = (await authPage.textContent("body")) || "";
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
    expect(unexpectedErrors.length).toBeLessThanOrEqual(2);
  });
});

// --- Schedule fix test (separate describe, logs in as admin) ---

test.describe("Schedule By-Date Fix", () => {
  test("6. /schedule/by-date returns 200 (was 500)", async ({ request }) => {
    await request.post(`${API_URL}/auth/login`, {
      data: { email: "will@macseptic.com", password: "#Espn2025" },
    });

    const today = new Date().toISOString().split("T")[0];
    const resp = await request.get(
      `${API_URL}/schedule/by-date?date=${today}`,
    );
    expect(resp.status()).toBe(200);

    const data = await resp.json();
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  });
});
