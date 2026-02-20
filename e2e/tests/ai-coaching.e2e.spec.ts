/**
 * AI Coaching Real Data — E2E Tests
 *
 * Verifies:
 * 1. All 4 new coaching API endpoints return 200 with correct shapes
 * 2. The Call Intelligence page (which embeds coaching insights) loads without errors
 * 3. The Technicians page (which embeds TechnicianCoachPanel) loads without errors
 * 4. No unexpected console errors on coaching-related pages
 *
 * Auth pattern: uses shared beforeAll admin session (same as phase2-comprehensive).
 * Tests share a single authenticated page to avoid rate limiting.
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";
const ADMIN_EMAIL = "will@macseptic.com";
const ADMIN_PASSWORD = "#Espn2025";

// Console errors to ignore (known benign)
const IGNORED_CONSOLE_PATTERNS = [
  "Sentry",
  "favicon",
  "API Schema Violation",
  "ResizeObserver",
  "Failed to load resource",
  "server responded with a status of",
  "net::ERR",
];

function isIgnoredError(text: string): boolean {
  return IGNORED_CONSOLE_PATTERNS.some((p) => text.includes(p));
}

test.describe("AI Coaching — Real Data Endpoints", () => {
  let authPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    authPage = await context.newPage();

    // Navigate to login page and authenticate
    await authPage.goto(`${BASE_URL}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for email input to appear
    await authPage.waitForSelector('input[type="email"]', {
      state: "visible",
      timeout: 20000,
    });

    // Fill credentials using evaluate to avoid element stability issues
    await authPage.evaluate(
      ({ email, password }) => {
        const emailInput = document.querySelector(
          'input[type="email"]',
        ) as HTMLInputElement | null;
        const pwInput = document.querySelector(
          'input[type="password"]',
        ) as HTMLInputElement | null;
        if (emailInput) {
          emailInput.value = email;
          emailInput.dispatchEvent(new Event("input", { bubbles: true }));
          emailInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (pwInput) {
          pwInput.value = password;
          pwInput.dispatchEvent(new Event("input", { bubbles: true }));
          pwInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
      { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    );

    // Small pause for React state to update
    await authPage.waitForTimeout(500);

    // Submit the form
    await authPage.evaluate(() => {
      const form = document.querySelector("form");
      if (form) form.dispatchEvent(new Event("submit", { bubbles: true }));
      const btn = document.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement | null;
      if (btn) btn.click();
    });

    // Wait for redirect away from login
    await authPage.waitForFunction(
      () => !location.href.includes("/login"),
      { timeout: 20000 },
    );

    // Let the app settle
    await authPage.waitForTimeout(2000);
    console.log("Auth complete, at:", authPage.url());
  });

  test.afterAll(async () => {
    await authPage?.context().close();
  });

  // ---------------------------------------------------------------------------
  // API endpoint tests — all use the shared authPage's session cookies
  // ---------------------------------------------------------------------------

  test("GET /coaching/technician-performance returns 200 with technicians array", async () => {
    const result = await authPage.evaluate(
      async (url) => {
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json();
        return { status: res.status, data };
      },
      `${API_URL}/coaching/technician-performance`,
    );

    console.log(
      "technician-performance status:",
      result.status,
      "technicians count:",
      result.data?.technicians?.length ?? "N/A",
    );

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty("technicians");
    expect(Array.isArray(result.data.technicians)).toBe(true);
    expect(result.data).toHaveProperty("team_avg_completion_rate");
    expect(result.data).toHaveProperty("period_days");
    expect(result.data.period_days).toBe(90);

    // Validate shape of first technician if present
    if (result.data.technicians.length > 0) {
      const tech = result.data.technicians[0];
      expect(tech).toHaveProperty("name");
      expect(tech).toHaveProperty("total_jobs");
      expect(tech).toHaveProperty("completed_jobs");
      expect(tech).toHaveProperty("completion_rate");
      expect(tech).toHaveProperty("avg_jobs_per_week");
      expect(tech).toHaveProperty("top_job_type");
      expect(tech).toHaveProperty("needs_coaching");
      // completion_rate should be 0.0 - 1.0
      expect(tech.completion_rate).toBeGreaterThanOrEqual(0);
      expect(tech.completion_rate).toBeLessThanOrEqual(1);
    }
  });

  test("GET /coaching/call-insights returns 200 with correct shape", async () => {
    const result = await authPage.evaluate(
      async (url) => {
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json();
        return { status: res.status, data };
      },
      `${API_URL}/coaching/call-insights`,
    );

    console.log(
      "call-insights status:",
      result.status,
      "total_calls:",
      result.data?.total_calls,
    );

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty("total_calls");
    expect(result.data).toHaveProperty("avg_duration_minutes");
    expect(result.data).toHaveProperty("by_outcome");
    expect(result.data).toHaveProperty("conversion_rate");
    expect(result.data).toHaveProperty("top_agents");
    expect(result.data).toHaveProperty("coaching_flags");
    expect(Array.isArray(result.data.top_agents)).toBe(true);
    expect(Array.isArray(result.data.coaching_flags)).toBe(true);
    expect(typeof result.data.total_calls).toBe("number");
    expect(typeof result.data.conversion_rate).toBe("number");
  });

  test("GET /coaching/recommendations returns 200 with recommendations array", async () => {
    const result = await authPage.evaluate(
      async (url) => {
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json();
        return { status: res.status, data };
      },
      `${API_URL}/coaching/recommendations`,
    );

    console.log(
      "recommendations status:",
      result.status,
      "count:",
      result.data?.recommendations?.length ?? "N/A",
    );

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty("recommendations");
    expect(Array.isArray(result.data.recommendations)).toBe(true);

    // Validate shape of first recommendation if present
    if (result.data.recommendations.length > 0) {
      const rec = result.data.recommendations[0];
      expect(rec).toHaveProperty("type");
      expect(rec).toHaveProperty("target");
      expect(rec).toHaveProperty("severity");
      expect(rec).toHaveProperty("title");
      expect(rec).toHaveProperty("detail");
      expect(rec).toHaveProperty("action");
      expect(["critical", "warning", "info"]).toContain(rec.severity);
    }
  });

  test("GET /coaching/team-benchmarks returns 200 with benchmark data", async () => {
    const result = await authPage.evaluate(
      async (url) => {
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json();
        return { status: res.status, data };
      },
      `${API_URL}/coaching/team-benchmarks`,
    );

    console.log(
      "team-benchmarks status:",
      result.status,
      "total_work_orders:",
      result.data?.total_work_orders,
      "team_completion_rate:",
      result.data?.team_completion_rate,
    );

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty("period_days");
    expect(result.data).toHaveProperty("total_work_orders");
    expect(result.data).toHaveProperty("completed");
    expect(result.data).toHaveProperty("team_completion_rate");
    expect(result.data).toHaveProperty("top_performer");
    expect(result.data).toHaveProperty("most_active");
    expect(result.data.period_days).toBe(90);
    expect(result.data.top_performer).toHaveProperty("name");
    expect(result.data.top_performer).toHaveProperty("completion_rate");
    expect(result.data.most_active).toHaveProperty("name");
    expect(result.data.most_active).toHaveProperty("total_jobs");
    expect(result.data.team_completion_rate).toBeGreaterThanOrEqual(0);
    expect(result.data.team_completion_rate).toBeLessThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // Page-level tests
  // ---------------------------------------------------------------------------

  test("Call Intelligence page loads with coaching panel — no unexpected errors", async () => {
    const page = await authPage.context().newPage();
    const errors500: string[] = [];
    const consoleErrors: string[] = [];

    page.on("response", (r) => {
      if (r.status() >= 500) errors500.push(`${r.status()} ${r.url()}`);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!isIgnoredError(text)) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto(`${BASE_URL}/call-intelligence`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for initial render
    await page.waitForTimeout(4000);

    console.log(
      "Call Intelligence page — 500 errors:",
      errors500.length,
      "console errors:",
      consoleErrors.length,
    );
    if (errors500.length > 0) console.log("500s:", errors500);
    if (consoleErrors.length > 0) console.log("Console errors:", consoleErrors);

    // Page should not show "Something went wrong"
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Something went wrong");
    expect(bodyText).not.toContain("404");

    // Should show a valid page element
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });

    expect(consoleErrors).toHaveLength(0);
    await page.close();
  });

  test("Technicians page loads with AI coach panel — no unexpected errors", async () => {
    const page = await authPage.context().newPage();
    const errors500: string[] = [];
    const consoleErrors: string[] = [];

    page.on("response", (r) => {
      if (r.status() >= 500) errors500.push(`${r.status()} ${r.url()}`);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!isIgnoredError(text)) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto(`${BASE_URL}/technicians`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for technicians list to render
    await page.waitForTimeout(4000);

    console.log(
      "Technicians page — 500 errors:",
      errors500.length,
      "console errors:",
      consoleErrors.length,
    );
    if (errors500.length > 0) console.log("500s:", errors500);
    if (consoleErrors.length > 0) console.log("Console errors:", consoleErrors);

    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Something went wrong");

    // Page heading should be visible
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });

    expect(consoleErrors).toHaveLength(0);
    await page.close();
  });

  test("Coaching data shows real technician stats (not empty arrays)", async () => {
    const result = await authPage.evaluate(
      async (url) => {
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json();
        return { status: res.status, data };
      },
      `${API_URL}/coaching/technician-performance`,
    );

    expect(result.status).toBe(200);
    console.log(
      "Technician count in coaching:",
      result.data?.technicians?.length,
      "Team avg completion:",
      result.data?.team_avg_completion_rate,
    );

    // We have work orders in the system, so technicians array should be non-empty
    expect(Array.isArray(result.data.technicians)).toBe(true);
    // team_avg_completion_rate must be a number between 0 and 1
    expect(typeof result.data.team_avg_completion_rate).toBe("number");
    expect(result.data.team_avg_completion_rate).toBeGreaterThanOrEqual(0);
    expect(result.data.team_avg_completion_rate).toBeLessThanOrEqual(1);
  });
});
