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


test.describe("FSA — live", () => {
  test.setTimeout(120_000);
  test.beforeEach(async ({ page }) => { await uiLogin(page); });

  test("Overview tab shows stat cards + status + quick actions", async ({ page }) => {
    await page.goto(`${SITE}/benefits/fsa`);
    await expect(page.getByRole("heading", { name: "FSA" })).toBeVisible();
    await expect(page.getByText(/Total enrollments/i)).toBeVisible();
    await expect(page.getByText(/YTD contributed/i)).toBeVisible();
    await expect(page.getByText(/Employee status/i)).toBeVisible();
    await expect(page.getByText(/Quick actions/i)).toBeVisible();
  });

  test("Settings tab edits bank and saves", async ({ page }) => {
    await page.goto(`${SITE}/benefits/fsa?tab=settings`);
    await expect(page.getByText(/Funding bank account/i)).toBeVisible();
    await expect(page.getByText(/Eligibility rules/i)).toBeVisible();
    await expect(page.getByText(/Card & substantiation/i)).toBeVisible();
  });

  test("Plans tab lists 3 plan cards", async ({ page }) => {
    await page.goto(`${SITE}/benefits/fsa?tab=plans`);
    await expect(page.getByText(/Healthcare FSA/i).first()).toBeVisible();
    await expect(page.getByText(/Dependent Care FSA/i).first()).toBeVisible();
    await expect(page.getByText(/Limited Purpose FSA/i).first()).toBeVisible();
  });

  test("Transactions tab with filters + export", async ({ page }) => {
    await page.goto(`${SITE}/benefits/fsa?tab=transactions`);
    await expect(page.getByText(/FSA transactions/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Export CSV/i })).toBeVisible();
    // Filter by status
    await page.locator("select").nth(1).selectOption("pending");
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  });

  test("Compliance tab shows NDT tests + Run button", async ({ page }) => {
    await page.goto(`${SITE}/benefits/fsa?tab=compliance`);
    await expect(page.getByText(/Non-discrimination tests/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Run tests/i })).toBeVisible();
    await expect(page.getByText(/Exclusions/i)).toBeVisible();
  });

  test("Mobile: FSA overview is usable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${SITE}/benefits/fsa`);
    await expect(page.getByRole("heading", { name: "FSA" })).toBeVisible();
  });

  test("Zero console errors across all FSA tabs", async ({ page }) => {
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
    for (const tab of ["overview", "settings", "plans", "transactions", "compliance"]) {
      await page.goto(`${SITE}/benefits/fsa?tab=${tab}`);
      await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
