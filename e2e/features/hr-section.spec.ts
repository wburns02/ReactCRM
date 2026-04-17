import { test, expect, type Page } from "@playwright/test";

const BASE = "https://react.ecbtx.com";
const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";


async function uiLogin(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`);
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
  await page.fill(
    'input[name="password"], input[type="password"]',
    TEST_PASSWORD,
  );
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
}


async function hardGoto(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
  });
  await page.evaluate(() => window.scrollTo(0, 0));
}


test.describe("HR section — fully functional + consistent styling", () => {
  test.setTimeout(120_000);
  test.beforeEach(async ({ page }) => {
    await uiLogin(page);
  });

  test("HR Overview: all five KPI cards navigate correctly", async ({
    page,
  }) => {
    await hardGoto(page, "/hr");

    const cards: [string, RegExp][] = [
      ["Open requisitions", /\/hr\/recruiting\/open-headcount/],
      ["Applicants \\(7d\\)", /\/hr\/recruiting\/candidates/],
      ["Onboarding in progress", /\/hr\/onboarding(?!\/)/],
      ["Offboarding in progress", /\/hr\/offboarding(?!\/)/],
      ["Certs expiring \\(30d\\)", /\/compliance/],
    ];

    for (const [labelRe, urlRe] of cards) {
      await hardGoto(page, "/hr");
      await page
        .getByRole("link", { name: new RegExp(labelRe) })
        .first()
        .click();
      await page.waitForURL(urlRe, { timeout: 10_000 });
    }
  });

  test("HR Overview: all shortcut cards navigate", async ({ page }) => {
    await hardGoto(page, "/hr");
    const shortcuts: [string, RegExp][] = [
      ["Org Chart", /\/hr\/org-chart/],
      ["Recruiting", /\/hr\/recruiting$|\/hr\/recruiting\//],
      ["Requisitions", /\/hr\/recruiting\/requisitions/],
      ["Employees", /\/technicians/],
      ["Compliance", /\/compliance/],
      ["Timesheets", /\/timesheets/],
    ];
    for (const [name, urlRe] of shortcuts) {
      await hardGoto(page, "/hr");
      await page
        .getByRole("link", { name: new RegExp(name, "i") })
        .first()
        .click();
      await page.waitForURL(urlRe, { timeout: 10_000 });
    }
  });

  test("Org Chart: renders hierarchy and detail aside on click", async ({
    page,
  }) => {
    await hardGoto(page, "/hr/org-chart");
    await expect(
      page.getByRole("heading", { name: "Org Chart", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /President Matt Carter/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /President Matt Carter/ })
      .click();
    await expect(page.getByText("PRESIDENT")).toBeVisible();
    await expect(page.getByText("Matt Carter")).toBeVisible();
  });

  test("Recruiting hub: all sub-tabs load non-empty content", async ({
    page,
  }) => {
    const tabs: [string, RegExp, RegExp][] = [
      ["Overview", /\/hr\/recruiting(?:\/overview)?$/, /New applications/],
      ["Job requisitions", /\/hr\/recruiting\/requisitions/, /Requisitions/],
      ["Candidates", /\/hr\/recruiting\/candidates/, /Candidates/],
      [
        "Open headcount",
        /\/hr\/recruiting\/open-headcount/,
        /open position/i,
      ],
      [
        "Templates & defaults",
        /\/hr\/recruiting\/templates/,
        /Recruiting message templates/,
      ],
    ];
    for (const [name, urlRe, bodyRe] of tabs) {
      await hardGoto(page, "/hr/recruiting");
      await page.getByRole("link", { name }).first().click();
      await page.waitForURL(urlRe, { timeout: 10_000 });
      await expect(page.getByText(bodyRe).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("Candidates deep-link: ?stage=applied pre-selects Applied", async ({
    page,
  }) => {
    await hardGoto(page, "/hr/recruiting/candidates?stage=applied");
    const stageSelect = page.locator("select").nth(1);
    await expect(stageSelect).toHaveValue("applied");
  });

  test("Onboarding list route is real, not applicant-inbox redirect", async ({
    page,
  }) => {
    await hardGoto(page, "/hr/onboarding");
    await expect(page).toHaveURL(/\/hr\/onboarding(?!\/)/);
    await expect(
      page.getByRole("heading", { name: "Onboarding", level: 1 }),
    ).toBeVisible();
  });

  test("Offboarding list route is real, not applicant-inbox redirect", async ({
    page,
  }) => {
    await hardGoto(page, "/hr/offboarding");
    await expect(page).toHaveURL(/\/hr\/offboarding(?!\/)/);
    await expect(
      page.getByRole("heading", { name: "Offboarding", level: 1 }),
    ).toBeVisible();
  });

  test("HR Overview: zero uncaught console errors on hard refresh", async ({
    page,
  }) => {
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
    await hardGoto(page, "/hr");
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Mobile (375px) — HR Overview remains usable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await hardGoto(page, "/hr");
    await expect(
      page.getByRole("heading", { name: "HR", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Org Chart/ }).first(),
    ).toBeVisible();
  });
});
