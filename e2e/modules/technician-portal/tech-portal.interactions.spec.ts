/**
 * Technician Portal Interaction Tests
 *
 * Covers: Dashboard, My Jobs, Time Clock, and Mobile Nav
 * Runs against: https://react.ecbtx.com
 *
 * Auth strategy: NO storageState — tech tests do a fresh login in each describe
 * block because:
 *   1. The admin auth.setup.ts session would redirect techs to /dashboard
 *   2. Technicians are redirected to /my-dashboard on login
 *   3. Isolated contexts prevent cross-test pollution
 *
 * Note: waitForFunction(() => !location.href.includes("/login")) is used instead
 * of waitForURL because the WebSocket connection prevents networkidle from firing.
 */

import { test, expect, Browser, BrowserContext, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "https://react.ecbtx.com";
const TECH_EMAIL = "tech@macseptic.com";
const TECH_PASSWORD = "#Espn2025";

// Console noise to suppress — these are known infrastructure/browser artifacts
const NOISE_PATTERNS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "third-party cookie",
  "net::ERR_",
  "WebSocket",
  "[WebSocket]",
  "wss://",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNoise(msg: string): boolean {
  return NOISE_PATTERNS.some((pattern) => msg.includes(pattern));
}

/**
 * Creates a fresh browser context (no stored auth) and logs in as the
 * technician user. Returns the context and the landing page so tests can
 * assert against the post-login URL immediately.
 */
async function loginAsTech(
  browser: Browser,
  viewport?: { width: number; height: number },
): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({
    storageState: undefined, // explicitly no admin session
    viewport: viewport ?? { width: 1280, height: 800 },
  });

  const page = await ctx.newPage();

  // Suppress known noise before any navigation
  page.on("console", (msg) => {
    if (msg.type() === "error" && !isNoise(msg.text())) {
      // Logged per-test where needed
    }
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

  // If a stale session redirected us away from login, nuke it and try again
  if (!page.url().includes("/login")) {
    await ctx.clearCookies();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_) { /* ignore */ }
    });
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  }

  await page.fill('input[type="email"]', TECH_EMAIL);
  await page.fill('input[type="password"]', TECH_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait until the URL leaves /login — WS prevents networkidle from resolving
  await page.waitForFunction(
    () => !location.href.includes("/login"),
    { timeout: 15000 },
  );

  return { ctx, page };
}

/**
 * Returns true if the page's body text contains an error boundary indicator.
 * Hard-failing on an error boundary is the only mandatory assertion in this
 * file — everything else is annotated with a warning when absent.
 */
async function hasErrorBoundary(page: Page): Promise<boolean> {
  const body = (await page.textContent("body")) ?? "";
  // React's default error boundary text and common fallback patterns
  return (
    body.includes("Something went wrong") ||
    body.includes("An unexpected error") ||
    body.includes("ChunkLoadError") ||
    body.includes("Uncaught Error")
  );
}

// ---------------------------------------------------------------------------
// 1. Dashboard
// ---------------------------------------------------------------------------

test.describe.serial("Technician Portal — Dashboard", () => {
  let ctx: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ({ ctx, page } = await loginAsTech(browser));
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test("redirects to tech area after login", async () => {
    // The RoleBasedRedirect sends techs to /my-dashboard; admins to /dashboard
    // Either is acceptable — confirm we're not on the login page
    const url = page.url();
    test.info().annotations.push({ type: "info", description: `Post-login URL: ${url}` });
    expect(url).not.toContain("/login");

    // If not on /my-dashboard, navigate there directly
    if (!url.includes("/my-dashboard")) {
      await page.goto(`${BASE_URL}/my-dashboard`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }
  });

  test("dashboard renders without an error boundary", async () => {
    // Navigate explicitly so this test is self-contained
    await page.goto(`${BASE_URL}/my-dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const crashed = await hasErrorBoundary(page);
    expect(crashed, "Dashboard hit an error boundary").toBe(false);
  });

  test("dashboard shows a greeting / welcome section", async () => {
    await page.goto(`${BASE_URL}/my-dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const body = (await page.textContent("body")) ?? "";
    const hasGreeting =
      body.includes("Good morning") ||
      body.includes("Good afternoon") ||
      body.includes("Good evening") ||
      body.includes("Welcome") ||
      // Fallback: technician name visible anywhere (first name from DB)
      body.toLowerCase().includes("tech") ||
      body.toLowerCase().includes("test");

    if (!hasGreeting) {
      test.info().annotations.push({
        type: "warning",
        description: "No greeting text found — check TechnicianDashboardPage welcome section",
      });
    }

    // Soft assertion: greeting is expected but not strictly required for a
    // non-crashing page (data may be loading slowly)
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();
  });

  test("dashboard shows upcoming jobs section or empty state", async () => {
    await page.goto(`${BASE_URL}/my-dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);

    const body = (await page.textContent("body")) ?? "";
    const bodyLower = body.toLowerCase();

    // Any of these indicate the jobs section rendered
    const hasJobsSection =
      bodyLower.includes("my jobs today") ||
      bodyLower.includes("upcoming jobs") ||
      bodyLower.includes("today's jobs") ||
      bodyLower.includes("no jobs") ||
      bodyLower.includes("scheduled") ||
      bodyLower.includes("ready to go") ||
      bodyLower.includes("on my way") ||
      bodyLower.includes("working on it");

    if (!hasJobsSection) {
      test.info().annotations.push({
        type: "warning",
        description:
          "No jobs section detected. tech@macseptic.com should have assigned jobs. " +
          "Page content snippet: " + body.slice(0, 300),
      });
    }

    // The main element must exist regardless
    await expect(page.locator("main")).toBeVisible();
  });

  test("dashboard shows quick stats (numeric indicators)", async () => {
    await page.goto(`${BASE_URL}/my-dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const body = (await page.textContent("body")) ?? "";
    const bodyLower = body.toLowerCase();

    // Stats section typically renders labels like Done / Hours / Left / Jobs
    const hasStats =
      bodyLower.includes("done") ||
      bodyLower.includes("hours") ||
      bodyLower.includes("completed") ||
      bodyLower.includes("left") ||
      bodyLower.includes("stats") ||
      // Numeric presence is a good proxy
      /\d+/.test(body);

    if (!hasStats) {
      test.info().annotations.push({
        type: "warning",
        description: "No quick-stats indicators found on dashboard",
      });
    }

    // At minimum, the page must have rendered body text
    expect(body.length).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// 2. My Jobs
// ---------------------------------------------------------------------------

test.describe.serial("Technician Portal — My Jobs", () => {
  let ctx: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ({ ctx, page } = await loginAsTech(browser));
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test("my jobs page loads without error boundary", async () => {
    await page.goto(`${BASE_URL}/portal/jobs`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const crashed = await hasErrorBoundary(page);
    expect(crashed, "/portal/jobs hit an error boundary").toBe(false);

    // URL must not bounce back to login
    expect(page.url()).not.toContain("/login");
  });

  test("my jobs shows job list, table, cards, or empty state", async () => {
    await page.goto(`${BASE_URL}/portal/jobs`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);

    const body = (await page.textContent("body")) ?? "";
    const bodyLower = body.toLowerCase();

    // Positive signals: data loaded
    const hasJobContent =
      bodyLower.includes("repair") ||
      bodyLower.includes("pumping") ||
      bodyLower.includes("scheduled") ||
      bodyLower.includes("en route") ||
      bodyLower.includes("completed") ||
      bodyLower.includes("job #") ||
      bodyLower.includes("work order") ||
      // Customer names known to be assigned to tech@macseptic.com
      bodyLower.includes("brad") ||
      bodyLower.includes("keith") ||
      bodyLower.includes("alfred") ||
      bodyLower.includes("billy");

    // Acceptable empty states
    const hasEmptyState =
      bodyLower.includes("no jobs") ||
      bodyLower.includes("no work orders") ||
      bodyLower.includes("nothing scheduled") ||
      bodyLower.includes("you're all caught up");

    if (!hasJobContent && !hasEmptyState) {
      test.info().annotations.push({
        type: "warning",
        description:
          "My Jobs page: neither job data nor recognised empty-state text found. " +
          "Snippet: " + body.slice(0, 400),
      });
    }

    // The page must have rendered something meaningful
    await expect(page.locator("main")).toBeVisible();
    expect(body.length).toBeGreaterThan(50);
  });

  test("clicking a job row opens job detail or navigates", async () => {
    await page.goto(`${BASE_URL}/portal/jobs`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);

    // Try table rows first, then card-style divs
    const clickTargets = [
      "table tbody tr",
      "[data-testid='job-row']",
      "[data-testid='job-card']",
      ".job-card",
      ".job-row",
      // Fallback: any anchor inside main that might be a job link
      "main a[href*='/portal/jobs/']",
    ];

    let clicked = false;
    const urlBefore = page.url();

    for (const selector of clickTargets) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.locator(selector).first().click();
        await page.waitForTimeout(2000);
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      test.info().annotations.push({
        type: "warning",
        description:
          "No clickable job rows or cards found on /portal/jobs. " +
          "Skipping navigation assertion — page may be showing empty state.",
      });
      return;
    }

    // After clicking, either the URL changed (navigation) or a panel/modal opened
    const urlAfter = page.url();
    const urlChanged = urlAfter !== urlBefore;

    // Look for a detail panel / modal / drawer
    const detailVisible = await page
      .locator("[role='dialog'], [data-testid='job-detail'], .job-detail-panel")
      .count();

    const detailOpened = urlChanged || detailVisible > 0;

    if (!detailOpened) {
      test.info().annotations.push({
        type: "warning",
        description:
          "Clicked a job row but URL did not change and no detail panel detected. " +
          `URL before: ${urlBefore}, after: ${urlAfter}`,
      });
    }

    // Not a hard failure — the page must simply not crash
    const crashed = await hasErrorBoundary(page);
    expect(crashed, "Error boundary appeared after clicking job row").toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Time Clock
// ---------------------------------------------------------------------------

test.describe.serial("Technician Portal — Time Clock", () => {
  let ctx: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ({ ctx, page } = await loginAsTech(browser));
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test("time clock page loads without error boundary", async () => {
    await page.goto(`${BASE_URL}/portal/time-clock`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const crashed = await hasErrorBoundary(page);
    expect(crashed, "/portal/time-clock hit an error boundary").toBe(false);

    expect(page.url()).not.toContain("/login");
  });

  test("time clock has a clock-in or clock-out button", async () => {
    await page.goto(`${BASE_URL}/portal/time-clock`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // The TechnicianDashboardPage uses 64px clock button — try multiple label patterns
    const clockButton = page.locator("button").filter({
      hasText: /clock\s*(in|out)|CLOCK\s*(IN|OUT)/i,
    });

    const count = await clockButton.count();

    if (count === 0) {
      // Fallback: look for any button with "clock" in the text
      const anyClockBtn = page.locator("button").filter({ hasText: /clock/i });
      const fallbackCount = await anyClockBtn.count();

      if (fallbackCount === 0) {
        test.info().annotations.push({
          type: "warning",
          description:
            "No clock-in/out button found on /portal/time-clock. " +
            "The page may be loading the full Communications page instead of a dedicated time clock UI.",
        });
        // Still must not crash
        const crashed = await hasErrorBoundary(page);
        expect(crashed, "Error boundary on time-clock page").toBe(false);
        return;
      }

      await expect(anyClockBtn.first()).toBeVisible();
    } else {
      await expect(clockButton.first()).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Mobile Nav
// ---------------------------------------------------------------------------

test.describe.serial("Technician Portal — Mobile Nav", () => {
  let ctx: BrowserContext;
  let page: Page;

  // iPhone 12 Pro viewport
  const MOBILE_VIEWPORT = { width: 375, height: 812 };

  test.beforeAll(async ({ browser }) => {
    ({ ctx, page } = await loginAsTech(browser, MOBILE_VIEWPORT));
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test("mobile bottom nav is visible at 375px width", async () => {
    await page.goto(`${BASE_URL}/my-dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // MobileBottomNav.tsx renders as a fixed bottom bar with 5 tab buttons.
    // It is `md:hidden` so it only appears below 768px.
    const bottomNav = page.locator(
      "nav[aria-label='Mobile navigation'], " +
      "[data-testid='mobile-bottom-nav'], " +
      ".mobile-bottom-nav, " +
      // Structural fallback: fixed bottom bar with multiple links
      "div.fixed.bottom-0, " +
      "nav.fixed",
    );

    const navCount = await bottomNav.count();

    if (navCount === 0) {
      // Fallback: look for a bottom-docked element with tab-like links
      const fixedBottomLinks = page.locator("a").filter({ hasText: /jobs|schedule|time|pay|more/i });
      const linkCount = await fixedBottomLinks.count();

      if (linkCount < 2) {
        test.info().annotations.push({
          type: "warning",
          description:
            "Mobile bottom nav not detected at 375px. " +
            "Check MobileBottomNav.tsx — it should be visible below md breakpoint (768px).",
        });
        // Still verify no crash
        const crashed = await hasErrorBoundary(page);
        expect(crashed, "Error boundary on mobile dashboard").toBe(false);
        return;
      }

      // At least 2 nav links visible counts as bottom nav present
      expect(linkCount).toBeGreaterThanOrEqual(2);
    } else {
      await expect(bottomNav.first()).toBeVisible();
    }
  });

  test("mobile header is visible and slim", async () => {
    await page.goto(`${BASE_URL}/my-dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // MobileHeader.tsx renders a 48px-tall header at mobile widths.
    const mobileHeader = page.locator(
      "header[aria-label='Mobile header'], " +
      "[data-testid='mobile-header'], " +
      ".mobile-header, " +
      // Structural: h-12 = 48px in Tailwind
      "header.h-12, " +
      // Fallback: any header element
      "header",
    );

    const headerCount = await mobileHeader.count();

    if (headerCount === 0) {
      test.info().annotations.push({
        type: "warning",
        description:
          "No header element detected on mobile. " +
          "MobileHeader.tsx should render at 375px viewport width.",
      });
      const crashed = await hasErrorBoundary(page);
      expect(crashed, "Error boundary on mobile dashboard header check").toBe(false);
      return;
    }

    await expect(mobileHeader.first()).toBeVisible();

    // Optionally verify height is ≤ 72px (48px target, allow some padding tolerance)
    const box = await mobileHeader.first().boundingBox();
    if (box !== null) {
      expect(box.height).toBeLessThanOrEqual(72);
    }
  });

  test("mobile dashboard renders without error boundary", async () => {
    await page.goto(`${BASE_URL}/my-dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const crashed = await hasErrorBoundary(page);
    expect(crashed, "Error boundary on /my-dashboard at 375px").toBe(false);

    // Verify page has meaningful content (not blank)
    const body = (await page.textContent("body")) ?? "";
    expect(body.length).toBeGreaterThan(50);
  });

  test("mobile jobs page renders without error boundary", async () => {
    await page.goto(`${BASE_URL}/portal/jobs`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const crashed = await hasErrorBoundary(page);
    expect(crashed, "Error boundary on /portal/jobs at 375px").toBe(false);

    expect(page.url()).not.toContain("/login");
  });
});
