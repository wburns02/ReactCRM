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


test.describe("COBRA — live", () => {
  test.setTimeout(120_000);
  test.beforeEach(async ({ page }) => { await uiLogin(page); });

  test("Enrollments: Current sub-tab table + Export + Add employee", async ({ page }) => {
    await page.goto(`${SITE}/benefits/cobra`);
    await expect(page.getByRole("heading", { name: "COBRA" })).toBeVisible();
    await expect(page.getByText(/COBRA enrollments/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Export as CSV/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add employee/i })).toBeVisible();
  });

  test("Enrollments: sub-bucket tabs switch", async ({ page }) => {
    await page.goto(`${SITE}/benefits/cobra`);
    await page.getByRole("button", { name: "upcoming", exact: true }).click();
    await expect(page.getByText(/Upcoming · /i)).toBeVisible();
    await page.getByRole("button", { name: "pending", exact: true }).click();
    await expect(page.getByText(/Pending tasks/i)).toBeVisible();
    await page.getByRole("button", { name: "past", exact: true }).click();
    await expect(page.getByText(/Archived/i)).toBeVisible();
  });

  test("Payments tab renders", async ({ page }) => {
    await page.goto(`${SITE}/benefits/cobra?tab=payments`);
    await expect(page.getByText(/Payment details/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Export as CSV/i })).toBeVisible();
  });

  test("Notices tab renders", async ({ page }) => {
    await page.goto(`${SITE}/benefits/cobra?tab=notices`);
    await expect(page.getByText(/Notices ·/i)).toBeVisible();
  });

  test("Settings: Reimbursement bank + Pre-Rippling plans", async ({ page }) => {
    await page.goto(`${SITE}/benefits/cobra?tab=settings`);
    await expect(page.getByText(/Reimbursement bank account/i).first()).toBeVisible();
    await page.getByRole("button", { name: /Pre-Rippling COBRA plans/i }).click();
    await expect(page.getByText(/Plans ·/i)).toBeVisible();
  });

  test("Mobile layout", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${SITE}/benefits/cobra`);
    await expect(page.getByRole("heading", { name: "COBRA" })).toBeVisible();
  });

  test("Zero console errors across all tabs", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (t.includes("Sentry") || t.includes("API Schema Violation") ||
          t.includes("ResizeObserver") || t.includes("favicon") ||
          t.includes("WebSocket")) return;
      errors.push(t);
    });
    for (const tab of ["enrollments", "payments", "notices", "settings"]) {
      await page.goto(`${SITE}/benefits/cobra?tab=${tab}`);
      await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
