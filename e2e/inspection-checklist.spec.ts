import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";

// ─── Auth helper ────────────────────────────────────────────────────────────
// Uses stored session from auth.setup.ts — just navigate to root

async function goHome(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Conventional Inspection Checklist — Bulk Photo Upload", () => {
  test.beforeEach(async ({ page }) => {
    await goHome(page);
  });

  test("login succeeds and dashboard loads", async ({ page }) => {
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("conventional job steps 3/6/7/9 show NO per-step photo button", async ({
    page,
  }) => {
    // Navigate to tech portal jobs list
    await page.goto(`${BASE_URL}/technician/jobs`);
    await page.waitForLoadState("networkidle");

    // Find a conventional job — look for 'Conventional' badge or type
    const conventionalJob = page
      .locator('[data-testid="job-card"], .job-card, [class*="job"]')
      .filter({ hasText: /conventional/i })
      .first();

    const jobCount = await conventionalJob.count();
    if (jobCount === 0) {
      test.skip(true, "No conventional jobs available in the system");
      return;
    }

    await conventionalJob.click();
    await page.waitForLoadState("networkidle");

    // Start inspection if not already started
    const startBtn = page.getByRole("button", { name: /start inspection/i });
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    // Walk through steps that previously had per-step photos
    const stepsToCheck = [3, 6, 7, 9, 10, 11, 12, 14, 15];

    for (const stepNum of stepsToCheck) {
      // Navigate to the step
      const stepBtn = page
        .locator(`[data-step="${stepNum}"], button`)
        .filter({ hasText: new RegExp(`^${stepNum}`) })
        .first();

      if (await stepBtn.isVisible()) {
        await stepBtn.click();
      }

      // Verify no "Take Photo" button appears on these steps
      const takePhotoBtn = page.getByRole("button", { name: /^take photo$/i });
      await expect(takePhotoBtn).not.toBeVisible({
        timeout: 3_000,
      });
    }
  });

  test("step 17 renders bulk photo upload list with all 9 required photos", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/technician/jobs`);
    await page.waitForLoadState("networkidle");

    const conventionalJob = page
      .locator('[data-testid="job-card"], .job-card, [class*="job"]')
      .filter({ hasText: /conventional/i })
      .first();

    if ((await conventionalJob.count()) === 0) {
      test.skip(true, "No conventional jobs available");
      return;
    }

    await conventionalJob.click();
    await page.waitForLoadState("networkidle");

    const startBtn = page.getByRole("button", { name: /start inspection/i });
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    // Navigate to step 17 using the step navigation
    const step17Btn = page
      .locator("button")
      .filter({ hasText: /17/ })
      .first();

    if (await step17Btn.isVisible()) {
      await step17Btn.click();
    } else {
      // Try clicking forward through steps until we reach 17
      for (let i = 0; i < 16; i++) {
        const nextBtn = page.getByRole("button", {
          name: /complete.*next|next/i,
        });
        if (await nextBtn.isEnabled()) {
          await nextBtn.click();
          await page.waitForTimeout(300);
        }
      }
    }

    // Verify bulk upload UI is present
    await expect(
      page.getByText(/upload all photos/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Verify required photo labels are shown
    const expectedLabels = [
      "Property / Access",
      "Tank Location",
      "System Identification",
      "Tank Interior",
      "Damage Check",
      "Drain Field",
      "Saturation Check",
      "Additional / Notes",
      "Clean Up (After)",
    ];

    for (const label of expectedLabels) {
      await expect(page.getByText(label).first()).toBeVisible();
    }

    // Verify the optional pump photo row is shown
    await expect(page.getByText("Pump System").first()).toBeVisible();
    await expect(
      page.getByText(/optional.*forced flow/i).first(),
    ).toBeVisible();
  });

  test("step 17 Complete button is disabled until all required photos uploaded", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/technician/jobs`);
    await page.waitForLoadState("networkidle");

    const conventionalJob = page
      .locator('[data-testid="job-card"], .job-card, [class*="job"]')
      .filter({ hasText: /conventional/i })
      .first();

    if ((await conventionalJob.count()) === 0) {
      test.skip(true, "No conventional jobs available");
      return;
    }

    await conventionalJob.click();
    await page.waitForLoadState("networkidle");

    const startBtn = page.getByRole("button", { name: /start inspection/i });
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    // Navigate to step 17
    const step17Btn = page.locator("button").filter({ hasText: /17/ }).first();
    if (await step17Btn.isVisible()) {
      await step17Btn.click();
    }

    await page.waitForTimeout(500);

    // Complete & Next button should be disabled
    const completeBtn = page.getByRole("button", {
      name: /complete.*next/i,
    });
    await expect(completeBtn).toBeDisabled();

    // Counter should show 0 of 9
    await expect(page.getByText(/0\s*\/\s*9/)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Aerobic Inspection — per-step photos unchanged", () => {
  test.beforeEach(async ({ page }) => {
    await goHome(page);
  });

  test("aerobic job steps still have per-step photo buttons", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/technician/jobs`);
    await page.waitForLoadState("networkidle");

    // Find an aerobic job
    const aerobicJob = page
      .locator('[data-testid="job-card"], .job-card, [class*="job"]')
      .filter({ hasText: /aerobic/i })
      .first();

    if ((await aerobicJob.count()) === 0) {
      test.skip(true, "No aerobic jobs available");
      return;
    }

    await aerobicJob.click();
    await page.waitForLoadState("networkidle");

    const startBtn = page.getByRole("button", { name: /start inspection/i });
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    // Step 3 of aerobic should have a "Take Photo" button
    const step3Btn = page.locator("button").filter({ hasText: /^3/ }).first();
    if (await step3Btn.isVisible()) {
      await step3Btn.click();
    }

    const takePhotoBtn = page.getByRole("button", { name: /take photo/i });
    await expect(takePhotoBtn).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Mobile viewport — bulk photo step", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await goHome(page);
  });

  test("bulk photo list renders and scrolls on mobile", async ({ page }) => {
    await page.goto(`${BASE_URL}/technician/jobs`);
    await page.waitForLoadState("networkidle");

    const conventionalJob = page
      .locator('[data-testid="job-card"], .job-card, [class*="job"]')
      .filter({ hasText: /conventional/i })
      .first();

    if ((await conventionalJob.count()) === 0) {
      test.skip(true, "No conventional jobs available");
      return;
    }

    await conventionalJob.click();
    await page.waitForLoadState("networkidle");

    const startBtn = page.getByRole("button", { name: /start inspection/i });
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    const step17Btn = page.locator("button").filter({ hasText: /17/ }).first();
    if (await step17Btn.isVisible()) {
      await step17Btn.click();
    }

    await page.waitForTimeout(500);

    // Verify bulk upload section is visible on mobile
    await expect(
      page.getByText(/required photos/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Verify we can scroll to the bottom of the list
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // "Clean Up (After)" should be reachable
    await expect(page.getByText("Clean Up (After)").first()).toBeInViewport({
      ratio: 0.5,
    });
  });
});
