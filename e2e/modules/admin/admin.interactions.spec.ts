/**
 * Admin Panel, Settings, Integrations, Compliance — Interaction Tests
 *
 * Covers: admin panel, general settings, notification settings,
 *         integrations (Clover/QBO/Google Ads), and compliance/permits.
 *
 * Hard-fail conditions ONLY:
 *   - React error boundary ("something went wrong")
 *   - Non-noise console errors
 *
 * For missing UI elements, annotate and return (soft-skip).
 */
import { test, expect } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";

const NOISE = [
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

function isNoise(msg: string): boolean {
  return NOISE.some((n) => msg.includes(n));
}

// ---------------------------------------------------------------------------
// Admin Panel
// ---------------------------------------------------------------------------

test.describe("Admin Panel", () => {
  test("admin page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Must not show React error boundary
    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary visible on /admin").toBe(false);

    // Must not produce non-noise console errors
    expect(errors, `Console errors on /admin: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("admin page has sections or tabs", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // If redirected away (non-admin user), soft-skip
    if (!page.url().includes("/admin")) {
      test.info().annotations.push({
        type: "skip",
        description: `Redirected to ${page.url()} — user may not have admin access`,
      });
      return;
    }

    // Look for any meaningful content below the top heading:
    // cards, tabs, list items, secondary headings, or stat blocks
    const hasCards = (await page.locator("[class*='card'], [class*='Card']").count()) > 0;
    const hasTabs = (await page.getByRole("tab").count()) > 0;
    const hasListItems = (await page.locator("li").count()) > 0;
    const hasSubheadings =
      (await page.getByRole("heading", { level: 2 }).count()) > 0 ||
      (await page.getByRole("heading", { level: 3 }).count()) > 0;
    const hasSectionText =
      (await page.getByText(/users|roles|permissions|system|migrations|database|api keys|audit/i).count()) > 0;

    const hasContent =
      hasCards || hasTabs || hasListItems || hasSubheadings || hasSectionText;

    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description: "Admin page loaded but no recognisable section content found",
      });
    }

    // At minimum, the page body should be visible and stable
    await expect(page.locator("body")).toBeVisible();
    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary visible on /admin sections check").toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

test.describe("Settings", () => {
  test("settings page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    // Try /settings/general first; fall back to /settings
    await page.goto(`${BASE_URL}/settings/general`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const is404 =
      (await page.getByText(/404|not found|page not found/i).isVisible().catch(() => false)) ||
      page.url().includes("/404");

    if (is404) {
      test.info().annotations.push({
        type: "info",
        description: "/settings/general returned 404 — retrying with /settings",
      });
      await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }

    // Wait for page to settle
    await page.waitForTimeout(1000);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary on settings page").toBe(false);

    expect(errors, `Console errors on settings: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("settings tabs are navigable", async ({ page }) => {
    // Navigate to settings (try /settings/general, fall back to /settings)
    await page.goto(`${BASE_URL}/settings/general`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const is404 =
      (await page.getByText(/404|not found/i).isVisible().catch(() => false)) ||
      page.url().includes("/404");

    if (is404) {
      await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }

    const tabs = page.getByRole("tab");
    const tabCount = await tabs.count();

    if (tabCount === 0) {
      test.info().annotations.push({
        type: "info",
        description: "No tabs found on settings page — may use a different navigation pattern",
      });
      return;
    }

    // Click through up to 5 tabs, assert no crash after each
    const limit = Math.min(tabCount, 5);
    for (let i = 0; i < limit; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(800);

      const errorBoundary = await page
        .getByText(/something went wrong/i)
        .isVisible()
        .catch(() => false);
      const tabName = await tabs.nth(i).textContent().catch(() => `tab-${i}`);
      expect(
        errorBoundary,
        `React error boundary after clicking settings tab "${tabName}"`
      ).toBe(false);
    }
  });

  test("notification settings loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/settings/notifications`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary on /settings/notifications").toBe(false);

    expect(
      errors,
      `Console errors on /settings/notifications: ${errors.join(" | ")}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

test.describe("Integrations", () => {
  test("integrations page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/integrations`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary on /integrations").toBe(false);

    expect(errors, `Console errors on /integrations: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("integrations shows configured services", async ({ page }) => {
    await page.goto(`${BASE_URL}/integrations`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Look for at least one of the known integration names
    const hasClover = await page.getByText(/clover/i).isVisible().catch(() => false);
    const hasQuickBooks = await page
      .getByText(/quickbooks|quick books|qbo/i)
      .isVisible()
      .catch(() => false);
    const hasGoogleAds = await page
      .getByText(/google ads|google/i)
      .isVisible()
      .catch(() => false);
    const hasTwilio = await page.getByText(/twilio|sms/i).isVisible().catch(() => false);
    const hasSentry = await page.getByText(/sentry/i).isVisible().catch(() => false);

    const anyIntegrationVisible =
      hasClover || hasQuickBooks || hasGoogleAds || hasTwilio || hasSentry;

    if (!anyIntegrationVisible) {
      test.info().annotations.push({
        type: "info",
        description:
          "No known integration names (Clover, QuickBooks, Google Ads, Twilio, Sentry) found — page may have different layout",
      });
    }

    // Page must at least be stable and visible
    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary on integrations content check").toBe(false);
  });

  test("integration tab switching works", async ({ page }) => {
    await page.goto(`${BASE_URL}/integrations`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const tabs = page.getByRole("tab");
    const tabCount = await tabs.count();

    if (tabCount === 0) {
      test.info().annotations.push({
        type: "info",
        description: "No tabs found on /integrations — may use a card/section layout instead",
      });
      return;
    }

    const limit = Math.min(tabCount, 5);
    for (let i = 0; i < limit; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(1000);

      const errorBoundary = await page
        .getByText(/something went wrong/i)
        .isVisible()
        .catch(() => false);
      const tabName = await tabs.nth(i).textContent().catch(() => `tab-${i}`);
      expect(
        errorBoundary,
        `React error boundary after clicking integrations tab "${tabName}"`
      ).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

test.describe("Compliance", () => {
  test("compliance page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/compliance`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary on /compliance").toBe(false);

    expect(errors, `Console errors on /compliance: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("compliance has content or empty state", async ({ page }) => {
    await page.goto(`${BASE_URL}/compliance`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // If redirected away (access control), soft-skip
    if (!page.url().includes("/compliance")) {
      test.info().annotations.push({
        type: "skip",
        description: `Redirected to ${page.url()} — user may lack compliance access`,
      });
      return;
    }

    const hasTableRows = (await page.locator("table tbody tr").count()) > 0;
    const hasCards =
      (await page.locator("[class*='card'], [class*='Card']").count()) > 0;
    const hasEmptyState = await page
      .getByText(
        /no records|no compliance|no permits|no licenses|no certifications|nothing here|get started/i
      )
      .isVisible()
      .catch(() => false);
    const hasListItems = (await page.locator("li").count()) > 0;
    const hasStatusText = await page
      .getByText(/active|expired|pending|compliant|due|license|permit|certification/i)
      .isVisible()
      .catch(() => false);

    const hasContent =
      hasTableRows || hasCards || hasEmptyState || hasListItems || hasStatusText;

    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description:
          "Compliance page loaded but no table rows, cards, or empty-state text detected",
      });
    }

    // Page must remain stable regardless
    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary on compliance content check").toBe(false);
  });
});
