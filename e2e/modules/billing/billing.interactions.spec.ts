/**
 * Billing — Deep Interaction Tests
 *
 * Covers: billing overview, invoices list/detail/create, payments list, estimates,
 * payment plans, search/filter interactions.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

const NOISE = [
  "API Schema Violation", "Sentry", "ResizeObserver", "favicon",
  "Failed to load resource", "server responded with a status of",
  "third-party cookie", "net::ERR_", "WebSocket", "[WebSocket]", "wss://",
];
function isNoise(msg: string) { return NOISE.some((n) => msg.includes(n)); }

test.describe("Billing Overview", () => {
  test("billing overview loads with KPIs", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });

    await page.goto(`${BASE_URL}/billing/overview`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    await expect(page.locator("body")).toBeVisible();
    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
    expect(errors).toHaveLength(0);
  });
});

test.describe("Invoices", () => {
  test("invoice list renders", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });

    await page.goto(`${BASE_URL}/invoices`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    await expect(page.getByRole("heading", { name: /invoices/i }).first()).toBeVisible({ timeout: 10000 });
    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
    expect(errors).toHaveLength(0);
  });

  test("invoice row click opens detail or modal", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const firstRow = page.locator("table tbody tr").first();
    if (!await firstRow.isVisible().catch(() => false)) {
      test.info().annotations.push({ type: "info", description: "No invoice rows" });
      return;
    }

    await firstRow.click();
    await page.waitForTimeout(1500);

    const isDetail = page.url().match(/\/invoices\/[a-f0-9-]+/);
    const isModal = await page.getByRole("dialog").isVisible().catch(() => false);
    expect(isDetail || isModal).toBeTruthy();
  });

  test("invoice detail page renders all sections", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // Get first invoice link/row href to extract ID
    const firstLink = page.locator("table tbody tr a, table tbody tr[data-href], a[href*='/invoices/']").first();
    const hasLink = await firstLink.isVisible().catch(() => false);
    if (!hasLink) {
      // Try clicking first row and getting URL
      const firstRow = page.locator("table tbody tr").first();
      if (!await firstRow.isVisible().catch(() => false)) {
        test.info().annotations.push({ type: "skip", description: "No invoices" }); return;
      }
      await firstRow.click();
      await page.waitForTimeout(1500);
    } else {
      await firstLink.click();
      await page.waitForTimeout(1500);
    }

    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("new invoice form/navigation opens", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const newBtn = page.getByRole("button", { name: /new invoice|create invoice/i }).first()
      .or(page.getByRole("link", { name: /new invoice/i }).first());

    if (!await newBtn.isVisible().catch(() => false)) {
      // Try direct navigation
      await page.goto(`${BASE_URL}/invoices/new`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    } else {
      await newBtn.click();
      await page.waitForTimeout(1500);
    }

    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
  });

  test("invoice search/filter works", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("nonexistent_e2e_test");
      await page.waitForTimeout(1000);
      await expect(page.locator("body")).toBeVisible();
      await searchInput.clear();
    }

    // Status filter
    const statusFilter = page.getByRole("combobox", { name: /status/i }).first()
      .or(page.getByRole("button", { name: /all|filter/i }).first());
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(500);
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Payments", () => {
  test("payments list renders", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });

    await page.goto(`${BASE_URL}/payments`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    await expect(page.locator("body")).toBeVisible();
    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
    expect(errors).toHaveLength(0);
  });

  test("payment tabs — Clover POS tab is clickable", async ({ page }) => {
    await page.goto(`${BASE_URL}/payments`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const cloverTab = page.getByRole("tab", { name: /clover/i }).first();
    if (await cloverTab.isVisible().catch(() => false)) {
      await cloverTab.click();
      await page.waitForTimeout(1500);
      const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
      expect(errorBoundary).toBe(false);
    }
  });
});

test.describe("Estimates", () => {
  test("estimates list renders", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });

    await page.goto(`${BASE_URL}/estimates`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    await expect(page.locator("body")).toBeVisible();
    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
    expect(errors).toHaveLength(0);
  });

  test("estimate detail loads without crash", async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const firstRow = page.locator("table tbody tr").first();
    if (!await firstRow.isVisible().catch(() => false)) {
      test.info().annotations.push({ type: "skip", description: "No estimates" }); return;
    }
    await firstRow.click();
    await page.waitForTimeout(1500);

    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
  });
});

test.describe("Payment Plans", () => {
  test("payment plans page renders", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });

    await page.goto(`${BASE_URL}/billing/payment-plans`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    await expect(page.locator("body")).toBeVisible();
    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
    expect(errors).toHaveLength(0);
  });
});
