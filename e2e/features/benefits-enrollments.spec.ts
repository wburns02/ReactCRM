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


test.describe("Benefits section — live", () => {
  test.setTimeout(120_000);
  test.beforeEach(async ({ page }) => {
    await uiLogin(page);
  });

  test("Benefits sidebar swaps to purple rail with dedicated nav", async ({ page }) => {
    await page.goto(`${SITE}/benefits`);
    await expect(
      page.getByRole("heading", { name: "Benefits", level: 1 }),
    ).toBeVisible();
    // Purple Benefits nav items
    for (const label of [
      "Benefits Overview",
      "Enrollments",
      "Integrations",
      "Deductions",
      "FSA",
      "Workers' Comp",
      "COBRA",
      "ACA",
      "Benefits Settings",
    ]) {
      await expect(page.getByRole("link", { name: label }).first()).toBeVisible();
    }
  });

  test("Enrollments page renders 4 tabs with content", async ({ page }) => {
    await page.goto(`${SITE}/benefits/enrollments`);
    await expect(
      page.getByRole("heading", { name: "Enrollments", level: 1 }),
    ).toBeVisible();
    // Default tab: Employee details — medical enrollments table
    await expect(page.getByText(/Current Medical enrollments/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Download enrollments/i }),
    ).toBeVisible();

    // Switch to each tab
    await page.getByRole("button", { name: "Enrollment history" }).click();
    await expect(page.getByText(/Enrollment change report/i)).toBeVisible();

    await page.getByRole("button", { name: "Upcoming events" }).click();
    await expect(page.getByRole("columnheader", { name: /Effective Date/i })).toBeVisible();

    await page.getByRole("button", { name: "EOI" }).click();
    await expect(page.getByText(/EOI requests/i)).toBeVisible();
  });

  test("Benefit-type dropdown filters medical ↔ dental", async ({ page }) => {
    await page.goto(`${SITE}/benefits/enrollments`);
    const dropdown = page.locator("select").first();
    await dropdown.selectOption("dental");
    await expect(page.getByText(/Current Dental enrollments/i)).toBeVisible();
    await dropdown.selectOption("medical");
    await expect(page.getByText(/Current Medical enrollments/i)).toBeVisible();
  });

  test("Mobile viewport: Benefits overview renders", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${SITE}/benefits`);
    await expect(
      page.getByRole("heading", { name: "Benefits", level: 1 }),
    ).toBeVisible();
  });

  test("Zero uncaught console errors on /benefits/enrollments", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (
        t.includes("Sentry") ||
        t.includes("API Schema Violation") ||
        t.includes("ResizeObserver") ||
        t.includes("favicon") ||
        t.includes("WebSocket")
      )
        return;
      errors.push(t);
    });
    await page.goto(`${SITE}/benefits/enrollments`);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
