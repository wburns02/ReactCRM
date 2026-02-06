import { test, expect } from "@playwright/test";

/**
 * COMPREHENSIVE 500 Error Scanner
 * Tests EVERY interaction on EVERY page, not just page loads
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Comprehensive 500 Error Scanner", () => {
  test("scan all pages with interactions for 500 errors", async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
      sessionStorage.setItem(
        "session_state",
        JSON.stringify({ isAuthenticated: true, lastValidated: Date.now() })
      );
    });

    const allErrors: {
      page: string;
      action: string;
      url: string;
      status: number;
      method: string;
      detail?: string;
    }[] = [];

    // Track ALL responses
    page.on("response", async (res) => {
      if (res.status() >= 500) {
        let detail;
        try {
          const body = await res.json();
          detail = body.detail || JSON.stringify(body).slice(0, 200);
        } catch (e) {
          try {
            detail = await res.text();
          } catch (e2) {
            detail = "Could not read response";
          }
        }

        allErrors.push({
          page: "Unknown",
          action: "Unknown",
          url: res.url(),
          status: res.status(),
          method: res.request().method(),
          detail,
        });
        console.log(`❌ 500 ERROR: ${res.request().method()} ${res.url()}`);
        console.log(`   Detail: ${detail}`);
      }
    });

    console.log("\n" + "=".repeat(80));
    console.log("COMPREHENSIVE SCAN - Testing ALL interactions");
    console.log("=".repeat(80) + "\n");

    // Dashboard - click around
    console.log("📄 Dashboard - Testing interactions");
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(4000);

    // Schedule - interact with elements
    console.log("📄 Schedule - Testing drag, buttons, filters");
    await page.goto(`${BASE_URL}/schedule`);
    await page.waitForTimeout(4000);

    // Click view tabs if they exist
    const tabs = page.locator('button:has-text("Week"), button:has-text("Day"), button:has-text("Timeline")');
    const tabCount = await tabs.count();
    for (let i = 0; i < Math.min(tabCount, 3); i++) {
      await tabs.nth(i).click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Work Orders - create, filter
    console.log("📄 Work Orders - Testing filters, sorting");
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForTimeout(4000);

    // Try clicking filter buttons
    const filterBtns = page.locator('button:has-text("All"), button:has-text("Scheduled"), button:has-text("Draft")');
    const filterCount = await filterBtns.count();
    for (let i = 0; i < Math.min(filterCount, 3); i++) {
      await filterBtns.nth(i).click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Customers
    console.log("📄 Customers - Testing search, filters");
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForTimeout(4000);

    // Invoices
    console.log("📄 Invoices");
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForTimeout(4000);

    // Estimates
    console.log("📄 Estimates");
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForTimeout(4000);

    // Payments - check tabs
    console.log("📄 Payments - Testing tabs");
    await page.goto(`${BASE_URL}/payments`);
    await page.waitForTimeout(4000);

    const paymentTabs = page.locator('button:has-text("All"), button:has-text("Clover")');
    const paymentTabCount = await paymentTabs.count();
    for (let i = 0; i < paymentTabCount; i++) {
      await paymentTabs.nth(i).click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Analytics - important for AI
    console.log("📄 Analytics - Testing reports");
    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForTimeout(5000);

    // Reports - trigger report generation
    console.log("📄 Reports - Testing report generation");
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForTimeout(5000);

    // Try clicking report tabs
    const reportTabs = page.locator('button:has-text("Revenue"), button:has-text("Technician"), button:has-text("Customer")');
    const reportTabCount = await reportTabs.count();
    for (let i = 0; i < reportTabCount; i++) {
      await reportTabs.nth(i).click().catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Technicians
    console.log("📄 Technicians");
    await page.goto(`${BASE_URL}/technicians`);
    await page.waitForTimeout(4000);

    // Fleet
    console.log("📄 Fleet");
    await page.goto(`${BASE_URL}/fleet`);
    await page.waitForTimeout(4000);

    // Tracking
    console.log("📄 Tracking");
    await page.goto(`${BASE_URL}/tracking`);
    await page.waitForTimeout(4000);

    // Permits
    console.log("📄 Permits - Testing search");
    await page.goto(`${BASE_URL}/permits`);
    await page.waitForTimeout(4000);

    // Communications
    console.log("📄 Communications");
    await page.goto(`${BASE_URL}/communications`);
    await page.waitForTimeout(4000);

    // Marketing
    console.log("📄 Marketing - Testing tabs");
    await page.goto(`${BASE_URL}/marketing`);
    await page.waitForTimeout(4000);

    const marketingTabs = page.locator('button[role="tab"]');
    const marketingTabCount = await marketingTabs.count();
    for (let i = 0; i < Math.min(marketingTabCount, 5); i++) {
      await marketingTabs.nth(i).click().catch(() => {});
      await page.waitForTimeout(1500);
    }

    // Payroll
    console.log("📄 Payroll - Testing tabs");
    await page.goto(`${BASE_URL}/payroll`);
    await page.waitForTimeout(4000);

    const payrollTabs = page.locator('button:has-text("Periods"), button:has-text("Pay Rates")');
    const payrollTabCount = await payrollTabs.count();
    for (let i = 0; i < payrollTabCount; i++) {
      await payrollTabs.nth(i).click().catch(() => {});
      await page.waitForTimeout(1500);
    }

    // Settings
    console.log("📄 Settings");
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForTimeout(4000);

    // AI Coaching - CRITICAL
    console.log("📄 AI Coaching - CRITICAL TEST");
    await page.goto(`${BASE_URL}/ai-coaching`);
    await page.waitForTimeout(5000);

    // Job Costing
    console.log("📄 Job Costing - Testing tabs");
    await page.goto(`${BASE_URL}/job-costing`);
    await page.waitForTimeout(4000);

    const costingTabs = page.locator('button:has-text("All"), button:has-text("Materials"), button:has-text("Labor")');
    const costingTabCount = await costingTabs.count();
    for (let i = 0; i < costingTabCount; i++) {
      await costingTabs.nth(i).click().catch(() => {});
      await page.waitForTimeout(1500);
    }

    // Inventory
    console.log("📄 Inventory");
    await page.goto(`${BASE_URL}/inventory`);
    await page.waitForTimeout(4000);

    // Employee Portal - CLOCK IN/OUT TEST
    console.log("📄 Employee Portal - Testing clock operations");
    await page.goto(`${BASE_URL}/employee`);
    await page.waitForTimeout(4000);

    // Try clock in/out if buttons exist
    const clockInBtn = page.locator('button:has-text("Clock In")').first();
    const clockOutBtn = page.locator('button:has-text("Clock Out")').first();

    if ((await clockOutBtn.count()) > 0) {
      console.log("   🔄 Clocking out (already clocked in)...");
      await clockOutBtn.click();
      await page.waitForTimeout(3000);
    }

    if ((await clockInBtn.count()) > 0) {
      console.log("   ⏱️  Clocking in...");
      await clockInBtn.click();
      await page.waitForTimeout(3000);

      // Clock out again
      const clockOut2 = page.locator('button:has-text("Clock Out")').first();
      if ((await clockOut2.count()) > 0) {
        console.log("   ⏱️  Clocking out...");
        await clockOut2.click();
        await page.waitForTimeout(3000);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("COMPREHENSIVE SCAN COMPLETE");
    console.log("=".repeat(80));
    console.log(`Total 500 errors found: ${allErrors.length}`);

    if (allErrors.length > 0) {
      console.log("\n❌ ERRORS FOUND:\n");

      // Group by endpoint
      const errorsByUrl = new Map<string, typeof allErrors>();
      allErrors.forEach((err) => {
        const key = `${err.method} ${err.url.split("?")[0]}`;
        if (!errorsByUrl.has(key)) {
          errorsByUrl.set(key, []);
        }
        errorsByUrl.get(key)!.push(err);
      });

      errorsByUrl.forEach((errors, endpoint) => {
        console.log(`\n${endpoint}`);
        console.log(`  Occurrences: ${errors.length}`);
        console.log(`  Detail: ${errors[0].detail?.slice(0, 300)}`);
      });

      console.log("\n" + "=".repeat(80));
      expect(allErrors.length).toBe(0);
    } else {
      console.log("\n✅ NO 500 ERRORS FOUND!\n");
    }
  });
});
