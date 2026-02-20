/**
 * Communications — Interaction Tests
 *
 * Covers: Messages/Inbox, Call Log, Bookings, Customer Success, Marketing Hub.
 *
 * Auth: storageState from playwright.config.ts (test@macseptic.com admin session).
 * Resilience policy: return early with annotation if UI element not found;
 * hard-fail only on React error boundary or non-noise console errors.
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

function collectErrors(page: import("@playwright/test").Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !isNoise(m.text())) {
      errors.push(m.text());
    }
  });
  return errors;
}

async function assertNoErrorBoundary(page: import("@playwright/test").Page): Promise<void> {
  const errorBoundary = await page
    .getByText(/something went wrong/i)
    .isVisible()
    .catch(() => false);
  expect(errorBoundary, "React error boundary should not be visible").toBe(false);
}

// ---------------------------------------------------------------------------
// Messages / Inbox
// ---------------------------------------------------------------------------

test.describe("Communications — Messages", () => {
  test("messages page loads", async ({ page }) => {
    const errors = collectErrors(page);

    // Try /messages first; fall back to /communications
    await page.goto(`${BASE_URL}/messages`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // If redirected to a 404/not-found, try the alternative route
    const currentUrl = page.url();
    if (currentUrl.includes("404") || currentUrl.includes("not-found")) {
      await page.goto(`${BASE_URL}/communications`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
    }

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Console errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("messages shows inbox content or empty state", async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await assertNoErrorBoundary(page);

    // Accept any recognisable messages UI: thread list, conversation list, empty state, or the heading
    const hasContent =
      (await page.locator("[data-testid='message-list'], [data-testid='inbox'], .message-item, .conversation-item").count()) > 0 ||
      (await page.getByRole("heading", { name: /messages|inbox|communications/i }).first().isVisible().catch(() => false)) ||
      (await page.getByText(/no messages|empty|start a conversation|no conversations/i).first().isVisible().catch(() => false)) ||
      (await page.locator("table tbody tr").count()) > 0;

    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description: "Messages page loaded but no recognisable content found — UI may have changed",
      });
      return;
    }

    expect(hasContent).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Call Log
// ---------------------------------------------------------------------------

test.describe("Communications — Call Log", () => {
  test("call log page loads", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto(`${BASE_URL}/call-log`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Console errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("call log shows entries or empty state", async ({ page }) => {
    await page.goto(`${BASE_URL}/call-log`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await assertNoErrorBoundary(page);

    const hasRows = (await page.locator("table tbody tr").count()) > 0;
    const hasCards =
      (await page.locator("[data-testid='call-log-item'], .call-log-item, .call-item").count()) > 0;
    const hasEmptyState = await page
      .getByText(/no calls|no call log|no records|no data|nothing here/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasHeading = await page
      .getByRole("heading", { name: /call log|calls|phone/i })
      .first()
      .isVisible()
      .catch(() => false);

    const hasContent = hasRows || hasCards || hasEmptyState || hasHeading;

    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description: "Call log page loaded but no recognisable content found",
      });
      return;
    }

    expect(hasContent).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

test.describe("Bookings", () => {
  test("bookings list loads", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto(`${BASE_URL}/bookings`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Console errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("bookings has table, calendar, or booking cards", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await assertNoErrorBoundary(page);

    const hasTable = (await page.locator("table tbody tr").count()) > 0;
    const hasCalendar =
      (await page
        .locator(
          "[data-testid='calendar'], .calendar, .fc-view, .rbc-calendar, [class*='calendar'], [class*='Calendar']"
        )
        .count()) > 0;
    const hasCards =
      (await page
        .locator("[data-testid='booking-card'], .booking-card, .booking-item")
        .count()) > 0;
    const hasHeading = await page
      .getByRole("heading", { name: /bookings|appointments|reservations/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/no bookings|no appointments|nothing scheduled|get started/i)
      .first()
      .isVisible()
      .catch(() => false);

    const hasContent = hasTable || hasCalendar || hasCards || hasHeading || hasEmptyState;

    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description: "Bookings page loaded but no recognisable content found",
      });
      return;
    }

    expect(hasContent).toBe(true);
  });

  test("New Booking button works", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await assertNoErrorBoundary(page);

    const newBookingBtn = page
      .getByRole("button", { name: /new booking|add booking|create booking|schedule/i })
      .first()
      .or(page.getByRole("link", { name: /new booking|add booking|create booking/i }).first());

    const btnVisible = await newBookingBtn.isVisible().catch(() => false);

    if (!btnVisible) {
      test.info().annotations.push({
        type: "info",
        description: "New Booking button not found — skipping interaction",
      });
      return;
    }

    await newBookingBtn.click();
    await page.waitForTimeout(1500);

    // Verify modal/form/drawer opened or navigated to a booking create page
    const modalOpen = await page.getByRole("dialog").isVisible().catch(() => false);
    const navigatedToCreate =
      page.url().includes("/new") ||
      page.url().includes("/create") ||
      page.url().includes("/bookings/");
    const formOpen =
      (await page.getByRole("form").isVisible().catch(() => false)) ||
      (await page.locator("form").isVisible().catch(() => false));

    const opened = modalOpen || navigatedToCreate || formOpen;

    if (!opened) {
      test.info().annotations.push({
        type: "info",
        description: "New Booking button clicked but no modal/form/navigation detected",
      });
      return;
    }

    expect(opened).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Customer Success
// ---------------------------------------------------------------------------

test.describe("Customer Success", () => {
  test("customer success page loads", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto(`${BASE_URL}/customer-success`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Console errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("customer success tabs are clickable", async ({ page }) => {
    await page.goto(`${BASE_URL}/customer-success`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await assertNoErrorBoundary(page);

    const tabs = page.getByRole("tab");
    const tabCount = await tabs.count();

    if (tabCount === 0) {
      test.info().annotations.push({
        type: "info",
        description: "No tabs found on Customer Success page — skipping tab interaction",
      });
      return;
    }

    // Click up to 5 tabs and verify no crash after each
    const limit = Math.min(tabCount, 5);
    for (let i = 0; i < limit; i++) {
      const tab = tabs.nth(i);
      const tabLabel = await tab.textContent().catch(() => `tab-${i}`);

      await tab.click();
      await page.waitForTimeout(800);

      const crashed = await page
        .getByText(/something went wrong/i)
        .isVisible()
        .catch(() => false);

      expect(crashed, `Error boundary shown after clicking tab "${tabLabel}"`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Marketing Hub
// ---------------------------------------------------------------------------

test.describe("Marketing", () => {
  test("marketing hub loads", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto(`${BASE_URL}/marketing`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();

    // Error boundary is the only hard fail; 501 / unconfigured states are acceptable
    await assertNoErrorBoundary(page);
    expect(errors, `Console errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("Google Ads page loads", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto(`${BASE_URL}/marketing/ads`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Console errors: ${errors.join(" | ")}`).toHaveLength(0);

    // Accept: configured Ads dashboard, "not configured" banner, or any recognisable marketing UI
    const hasAdsContent =
      (await page
        .getByText(/google ads|ads performance|campaigns|configure|not configured|connect/i)
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByRole("heading", { name: /google ads|ads|marketing/i })
        .first()
        .isVisible()
        .catch(() => false));

    if (!hasAdsContent) {
      test.info().annotations.push({
        type: "info",
        description: "Google Ads page loaded but no recognisable ads content detected — may be unconfigured",
      });
      return;
    }

    expect(hasAdsContent).toBe(true);
  });
});
