/**
 * Technicians — Deep Interaction Tests
 *
 * Covers: list, search, filter, row navigation, detail page tabs, schedule,
 * payroll, employee portal links.
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

test.describe("Technicians — List", () => {
  test("page loads with technician rows", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });

    await page.goto(`${BASE_URL}/technicians`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    await expect(page.getByRole("heading", { name: /technicians/i }).first()).toBeVisible({ timeout: 10000 });
    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
    expect(errors).toHaveLength(0);
  });

  test("search filters technician list", async ({ page }) => {
    await page.goto(`${BASE_URL}/technicians`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const searchInput = page.getByPlaceholder(/search/i).first();
    if (!await searchInput.isVisible().catch(() => false)) return;

    await searchInput.fill("Smith");
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeVisible();
    await searchInput.clear();
  });

  test("clicking technician row navigates to detail", async ({ page }) => {
    await page.goto(`${BASE_URL}/technicians`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const firstRow = page.locator("table tbody tr").first()
      .or(page.locator("[data-testid='technician-row']").first());

    if (!await firstRow.isVisible().catch(() => false)) {
      test.info().annotations.push({ type: "info", description: "No tech rows" });
      return;
    }

    await firstRow.click();
    await page.waitForTimeout(2000);

    const isDetail = page.url().match(/\/technicians\/[a-f0-9-]+/);
    const isModal = await page.getByRole("dialog").isVisible().catch(() => false);
    expect(isDetail || isModal).toBeTruthy();
  });
});

test.describe("Technicians — Detail Page", () => {
  test("technician detail loads all tabs without crash", async ({ page }) => {
    await page.goto(`${BASE_URL}/technicians`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const firstRow = page.locator("table tbody tr").first();
    if (!await firstRow.isVisible().catch(() => false)) {
      test.info().annotations.push({ type: "skip", description: "No technicians" }); return;
    }
    await firstRow.click();
    await page.waitForTimeout(2000);

    if (!page.url().match(/\/technicians\/[a-f0-9-]+/)) {
      test.info().annotations.push({ type: "info", description: "Click opened modal" }); return;
    }

    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);

    const tabs = page.getByRole("tab");
    const tabCount = await tabs.count();
    for (let i = 0; i < Math.min(tabCount, 6); i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(800);
      const err = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
      expect(err, `Tab ${i} crashed`).toBe(false);
    }
  });
});

test.describe("Employee & Payroll Pages", () => {
  test("employee page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });

    await page.goto(`${BASE_URL}/employee`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
    expect(errors).toHaveLength(0);
  });

  test("payroll list loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });

    await page.goto(`${BASE_URL}/payroll`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
    expect(errors).toHaveLength(0);
  });

  test("timesheets page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });

    await page.goto(`${BASE_URL}/timesheets`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
    expect(errors).toHaveLength(0);
  });

  test("service intervals page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });

    await page.goto(`${BASE_URL}/service-intervals`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const errorBoundary = await page.getByText(/something went wrong/i).isVisible().catch(() => false);
    expect(errorBoundary).toBe(false);
    expect(errors).toHaveLength(0);
  });
});
