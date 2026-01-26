import { test, expect } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";

test.describe("Payment Plans Debug", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|work-orders)/, { timeout: 15000 });
  });

  test("create button opens modal", async ({ page }) => {
    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");
    
    const createBtn = page.getByRole("button", { name: /create payment plan/i });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5000 });
    console.log("Create modal opens: PASS");
  });

  test("row click behavior", async ({ page }) => {
    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");
    
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    console.log("Row count:", rowCount);
    
    if (rowCount > 0) {
      const firstRow = rows.first();
      const urlBefore = page.url();
      await firstRow.click({ position: { x: 200, y: 15 } });
      await page.waitForTimeout(1000);
      const urlAfter = page.url();
      console.log("URL before:", urlBefore);
      console.log("URL after:", urlAfter);
      console.log("Row click navigated:", urlBefore !== urlAfter);
    }
  });

  test("view button behavior", async ({ page }) => {
    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");
    
    const viewBtn = page.locator("tbody tr").first().locator("button:has-text('View')");
    const hasViewBtn = await viewBtn.isVisible().catch(() => false);
    console.log("View button visible:", hasViewBtn);
    
    if (hasViewBtn) {
      const urlBefore = page.url();
      await viewBtn.click();
      await page.waitForTimeout(1000);
      const urlAfter = page.url();
      console.log("View click URL before:", urlBefore);
      console.log("View click URL after:", urlAfter);
    }
  });
});
