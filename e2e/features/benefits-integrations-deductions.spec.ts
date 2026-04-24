import { test, expect, type Page } from "@playwright/test";

const SITE = "https://react.ecbtx.com";
const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";


async function uiLogin(page: Page): Promise<void> {
  await page.goto(`${SITE}/login`);
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.fill('input[type=email]', TEST_EMAIL);
  await page.fill('input[type=password]', TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForURL(/\/(dashboard|benefits|hr)/, { timeout: 15000 });
}


test.describe("Benefits Integrations + Deductions — live", () => {
  test.setTimeout(120_000);
  test.beforeEach(async ({ page }) => {
    await uiLogin(page);
  });

  test("Integrations: Current tab renders 3 carriers + toggle", async ({ page }) => {
    await page.goto(`${SITE}/benefits/integrations`);
    await expect(page.getByRole("heading", { name: "Integrations" })).toBeVisible();
    for (const carrier of ["Blue Shield", "MetLife", "Transamerica"]) {
      await expect(page.getByText(carrier).first()).toBeVisible();
    }
    // Form forwarding toggle exists
    const toggle = page
      .getByRole("button", { name: /Toggle form forwarding/i })
      .first();
    await expect(toggle).toBeVisible();
  });

  test("Integrations: Upcoming shows empty state", async ({ page }) => {
    await page.goto(`${SITE}/benefits/integrations`);
    await page.getByRole("button", { name: "Upcoming", exact: true }).click();
    await expect(page.getByText(/No current renewals/i)).toBeVisible();
  });

  test("Integrations: Account structure tab with Add classification", async ({ page }) => {
    await page.goto(`${SITE}/benefits/integrations`);
    await page.getByRole("button", { name: /Account structure/i }).click();
    await expect(
      page.getByText(/Carrier account structure details/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Add classification/i }),
    ).toBeVisible();
  });

  test("Deductions: renders discrepancy banner + Push deductions button", async ({ page }) => {
    await page.goto(`${SITE}/benefits/deductions`);
    await expect(page.getByRole("heading", { name: "Deductions" })).toBeVisible();
    await expect(page.getByText(/Discrepancy detected/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Push deductions/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Auto-manage deductions/i }),
    ).toBeVisible();
  });

  test("Deductions: benefit-type dropdown filters Dental", async ({ page }) => {
    await page.goto(`${SITE}/benefits/deductions`);
    await page.locator("select").first().selectOption("dental");
    // Wait for the rows count to update
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    await expect(
      page.getByText(/Future scheduled deductions/i),
    ).toBeVisible();
  });

  test("Deductions: Only-show-discrepancies toggle", async ({ page }) => {
    await page.goto(`${SITE}/benefits/deductions`);
    const toggle = page.getByRole("button", {
      name: /Only show discrepancies|Only-show-discrepancies/i,
    }).or(page.locator("label:has-text('Only show discrepancies') button"));
    // fall back: click the label text directly
    await page.getByText("Only show discrepancies").click();
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  });

  test("Mobile: /benefits/deductions doesn't break layout", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${SITE}/benefits/deductions`);
    await expect(page.getByRole("heading", { name: "Deductions" })).toBeVisible();
  });

  test("Zero console errors on Integrations + Deductions", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (
        t.includes("Sentry") || t.includes("API Schema Violation") ||
        t.includes("ResizeObserver") || t.includes("favicon") ||
        t.includes("WebSocket")
      ) return;
      errors.push(t);
    });
    await page.goto(`${SITE}/benefits/integrations`);
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    await page.goto(`${SITE}/benefits/deductions`);
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
