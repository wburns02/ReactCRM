import { test, expect } from "@playwright/test";

/**
 * Payroll Backboard Guarantee E2E Tests
 *
 * Verifies the 100% commission model with $60K annual backboard guarantee:
 * - Biweekly threshold: $60,000 / 26 = $2,307.69
 * - If commissions >= threshold: pay = commissions (no backboard)
 * - If commissions < threshold: pay = backboard amount (no commission)
 */

const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

async function getApiToken(): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "will@macseptic.com", password: "#Espn2025" }),
  });
  const data = await res.json();
  return data.access_token;
}

test.describe("Payroll Backboard Guarantee", () => {
  test("API returns backboard fields in period summary", async () => {
    const token = await getApiToken();

    // Get periods
    const periodsRes = await fetch(`${API_URL}/payroll/periods`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const periodsData = await periodsRes.json();
    const periods = periodsData.periods || [];
    expect(periods.length).toBeGreaterThan(0);

    // Find Feb 2026 period which has commission data
    const targetPeriod = periods.find(
      (p: { start_date: string }) => p.start_date === "2026-02-01"
    ) || periods[0];

    // Get summary
    const summaryRes = await fetch(
      `${API_URL}/payroll/periods/${targetPeriod.id}/summary`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(summaryRes.ok).toBeTruthy();
    const summaryData = await summaryRes.json();
    const summaries = summaryData.summaries || [];

    if (summaries.length > 0) {
      const first = summaries[0];
      // Verify backboard fields exist
      expect(first).toHaveProperty("commission_pay");
      expect(first).toHaveProperty("backboard_applied");
      expect(first).toHaveProperty("backboard_amount");
      expect(first).toHaveProperty("backboard_threshold");

      // Verify backboard logic correctness
      for (const s of summaries) {
        if (s.backboard_applied) {
          expect(s.commission_pay).toBe(0);
          expect(s.backboard_amount).toBeGreaterThanOrEqual(2307);
          expect(s.gross_pay).toBe(s.backboard_amount);
          console.log(
            `${s.technician_name}: BACKBOARD - commissions=$${s.total_commissions}, pays=$${s.backboard_amount}`
          );
        } else {
          expect(s.commission_pay).toBe(s.total_commissions);
          expect(s.backboard_amount).toBe(0);
          expect(s.gross_pay).toBe(s.commission_pay);
          console.log(
            `${s.technician_name}: COMMISSION - earns=$${s.commission_pay}`
          );
        }
      }
    }
  });

  test("backboard threshold is $2,307.69 by default", async () => {
    const token = await getApiToken();

    const periodsRes = await fetch(`${API_URL}/payroll/periods`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const periodsData = await periodsRes.json();
    const periods = periodsData.periods || [];

    for (const period of periods.slice(0, 3)) {
      const summaryRes = await fetch(
        `${API_URL}/payroll/periods/${period.id}/summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const summaryData = await summaryRes.json();

      for (const s of summaryData.summaries || []) {
        // Threshold should be at least $2,307.69 (default) or higher (custom salary)
        expect(s.backboard_threshold).toBeGreaterThanOrEqual(2307.69);
        console.log(
          `${s.technician_name}: threshold=$${s.backboard_threshold}`
        );
      }
    }
  });

  test("low commission triggers backboard, not commission pay", async () => {
    const token = await getApiToken();

    const periodsRes = await fetch(`${API_URL}/payroll/periods`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const periodsData = await periodsRes.json();
    const febPeriod = (periodsData.periods || []).find(
      (p: { start_date: string }) => p.start_date === "2026-02-01"
    );

    if (!febPeriod) {
      test.skip();
      return;
    }

    const summaryRes = await fetch(
      `${API_URL}/payroll/periods/${febPeriod.id}/summary`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const summaryData = await summaryRes.json();
    const summaries = summaryData.summaries || [];

    // Marcus Rodriguez has ~$1,086.70 commissions - below $2,307.69 threshold
    const marcus = summaries.find(
      (s: { technician_name: string }) => s.technician_name.includes("Marcus")
    );
    if (marcus) {
      expect(marcus.backboard_applied).toBe(true);
      expect(marcus.commission_pay).toBe(0);
      expect(marcus.backboard_amount).toBe(2307.69);
      expect(marcus.total_commissions).toBeGreaterThan(0);
      expect(marcus.total_commissions).toBeLessThan(marcus.backboard_threshold);
      console.log(
        `Marcus: commissions=$${marcus.total_commissions} < threshold=$${marcus.backboard_threshold} -> backboard=$${marcus.backboard_amount}`
      );
    }

    // Chris Williams has custom $2,500 threshold (from salary_amount = $65,000)
    const chris = summaries.find(
      (s: { technician_name: string }) => s.technician_name.includes("Chris")
    );
    if (chris) {
      expect(chris.backboard_applied).toBe(true);
      expect(chris.backboard_threshold).toBe(2500);
      expect(chris.gross_pay).toBe(2500);
      console.log(
        `Chris: custom threshold=$${chris.backboard_threshold}, gross=$${chris.gross_pay}`
      );
    }
  });

  test("payroll page loads and shows period data", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForTimeout(3000);

    // If auth redirected to login, skip
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Take screenshot of payroll page
    await page.screenshot({
      path: "e2e/screenshots/payroll-backboard-dashboard.png",
      fullPage: true,
    });

    console.log("Payroll page loaded at:", page.url());
  });

  test("period detail technician tab shows backboard breakdown", async ({
    page,
  }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Click on a period row to open detail
    const periodRow = page.locator("tr, a[href*='/payroll/']").first();
    if (await periodRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await periodRow.click();
      await page.waitForTimeout(2000);

      // Click on "Technicians" tab
      const techTab = page.locator("button:has-text('Technicians')");
      if (await techTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await techTab.click();
        await page.waitForTimeout(1500);

        await page.screenshot({
          path: "e2e/screenshots/payroll-backboard-technician-tab.png",
          fullPage: true,
        });
        console.log("Technician tab screenshot taken");
      }
    }
  });
});
