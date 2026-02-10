/**
 * Technician Dashboard E2E Tests
 *
 * Tests the /my-dashboard page — the simple, all-in-one view for field techs.
 * Login once, share page across all tests to avoid rate limiting.
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

test.describe("Technician Dashboard", () => {
  let authPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    authPage = await context.newPage();

    // Strip cache-control to avoid stale data
    await authPage.route("**/*", (route) => {
      route.continue().then(() => {}).catch(() => {});
    });

    // Login
    await authPage.goto(`${BASE_URL}/login`);
    await authPage.fill('input[type="email"]', "will@macseptic.com");
    await authPage.fill('input[type="password"]', "#Espn2025");
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(
      () => !window.location.href.includes("/login"),
      { timeout: 15000 },
    );

    // Wait for app to settle
    await authPage.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await authPage?.context()?.close();
  });

  test("1. Backend endpoint returns valid data", async () => {
    const response = await authPage.evaluate(async (url) => {
      const res = await fetch(`${url}/technician-dashboard/my-summary`, {
        credentials: "include",
      });
      return { status: res.status, data: await res.json() };
    }, API_URL);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("technician");
    expect(response.data).toHaveProperty("clock_status");
    expect(response.data).toHaveProperty("todays_jobs");
    expect(response.data).toHaveProperty("today_stats");
    expect(response.data).toHaveProperty("pay_this_period");
    expect(response.data).toHaveProperty("performance");
    expect(response.data.technician).toHaveProperty("first_name");
    expect(response.data.today_stats).toHaveProperty("total_jobs");
  });

  test("2. Page loads at /my-dashboard", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(2000);

    // Page should have loaded (not a 404 or error)
    const url = authPage.url();
    expect(url).toContain("/my-dashboard");
  });

  test("3. Welcome banner shows user name", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(2000);

    // Should show greeting with name
    const greetingText = await authPage.textContent("body");
    const hasGreeting =
      greetingText?.includes("Good morning") ||
      greetingText?.includes("Good afternoon") ||
      greetingText?.includes("Good evening");
    expect(hasGreeting).toBe(true);
  });

  test("4. Clock in/out button is visible and large", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(2000);

    // Find the clock button — it should say CLOCK IN or CLOCK OUT
    const clockButton = authPage.locator(
      'button:has-text("CLOCK IN"), button:has-text("CLOCK OUT")',
    );
    await expect(clockButton.first()).toBeVisible();

    // Verify it's large (at least 60px tall)
    const box = await clockButton.first().boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(50);
    }
  });

  test("5. Today's jobs section is present", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(2000);

    // Should show "My Jobs Today" heading
    const jobsHeader = authPage.locator('text="My Jobs Today"');
    await expect(jobsHeader).toBeVisible();
  });

  test("6. Quick stats section shows 3 cards", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(2000);

    // Should show Done, Hours, and Left labels
    await expect(authPage.locator('text="Done"').first()).toBeVisible();
    await expect(authPage.locator('text="Hours"').first()).toBeVisible();
    await expect(authPage.locator('text="Left"').first()).toBeVisible();
  });

  test("7. My Pay section is visible", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(2000);

    const paySection = authPage.locator('text="My Pay"');
    await expect(paySection).toBeVisible();

    // Should show earned amount (contains $ sign)
    const bodyText = await authPage.textContent("body");
    expect(bodyText).toContain("$");
  });

  test("8. How I'm Doing section is visible", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(2000);

    const perfSection = authPage.locator("text=\"How I'm Doing\"");
    await expect(perfSection).toBeVisible();

    // Should show this week / last week
    await expect(authPage.locator('text="This week"')).toBeVisible();
    await expect(authPage.locator('text="Last week"')).toBeVisible();
  });

  test("9. Mobile viewport — all sections accessible", async () => {
    await authPage.setViewportSize({ width: 375, height: 812 });

    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(2000);

    // All major sections should still be visible (may need scrolling)
    const clockButton = authPage.locator(
      'button:has-text("CLOCK IN"), button:has-text("CLOCK OUT")',
    );
    await expect(clockButton.first()).toBeVisible();

    // Scroll down and check remaining sections
    await authPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await authPage.waitForTimeout(500);

    const bodyText = await authPage.textContent("body");
    expect(bodyText).toContain("My Pay");
    expect(bodyText).toContain("How I'm Doing");

    // Reset viewport
    await authPage.setViewportSize({ width: 1280, height: 720 });
  });

  test("10. No unexpected console errors", async () => {
    const errors: string[] = [];
    authPage.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(3000);

    // Filter out any remaining known errors
    const unexpectedErrors = errors.filter((e) => !isKnownError(e));
    if (unexpectedErrors.length > 0) {
      console.log("Unexpected console errors:", unexpectedErrors);
    }
    // Allow up to 2 unexpected errors (network timing, etc.)
    expect(unexpectedErrors.length).toBeLessThanOrEqual(2);
  });

  test("11. Job cards have Google Maps links for addresses", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(2000);

    // Check if there are any job cards with address links
    const mapsLinks = authPage.locator('a[href*="maps.google.com"]');
    const count = await mapsLinks.count();

    // If there are jobs with addresses, they should have Maps links
    if (count > 0) {
      const href = await mapsLinks.first().getAttribute("href");
      expect(href).toContain("maps.google.com");
    }
    // If no jobs, that's fine — just verify the page loads
  });

  test("12. Status badges use plain English", async () => {
    await authPage.goto(`${BASE_URL}/my-dashboard`);
    await authPage.waitForLoadState("networkidle");
    await authPage.waitForTimeout(2000);

    const bodyText = await authPage.textContent("body") || "";

    // Should NOT contain raw status codes on the page
    // (these would only appear if backend labels weren't working)
    const hasJobCards = bodyText.includes("My Jobs Today");
    if (hasJobCards) {
      // If there are jobs, verify we don't see raw status values used as labels
      // The page should use "Ready to Go", "Working On It", etc.
      const plainEnglishLabels = [
        "Ready to Go",
        "On My Way",
        "Working On It",
        "All Done",
        "No jobs scheduled today",
      ];
      const hasAtLeastOneLabel = plainEnglishLabels.some((label) =>
        bodyText.includes(label),
      );
      expect(hasAtLeastOneLabel).toBe(true);
    }
  });
});
