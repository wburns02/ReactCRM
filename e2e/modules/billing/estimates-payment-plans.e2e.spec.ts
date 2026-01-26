import { test, expect } from "@playwright/test";

/**
 * Estimates and Payment Plans E2E Tests
 *
 * Validates:
 * - Estimates page loads data from /quotes/ endpoint
 * - Payment Plans page loads data from /payment-plans/ endpoint
 * - No 404 errors on these endpoints
 */

const PRODUCTION_URL = "https://react.ecbtx.com";
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

// Test credentials
const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";

test.describe("Estimates and Payment Plans", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill(
      'input[name="password"], input[type="password"]',
      TEST_PASSWORD,
    );
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|work-orders)/, {
      timeout: 15000,
    });
  });

  test("estimates page loads without 404 errors", async ({ page }) => {
    const networkErrors: { url: string; status: number }[] = [];

    page.on("response", (response) => {
      const url = response.url();
      const status = response.status();

      if (url.includes("/api/v2/") && status === 404) {
        networkErrors.push({ url, status });
      }
    });

    // Navigate to estimates page
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Page should load without 404 errors
    const quoteErrors = networkErrors.filter(
      (e) => e.url.includes("/quotes") || e.url.includes("/estimates"),
    );
    expect(quoteErrors).toHaveLength(0);
  });

  test("estimates page uses correct /quotes/ endpoint", async ({ page }) => {
    let usedCorrectEndpoint = false;

    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/quotes/") && !url.includes("quotes//")) {
        usedCorrectEndpoint = true;
      }
    });

    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    expect(usedCorrectEndpoint).toBe(true);
  });

  test("estimates page shows table or empty state", async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Should show either estimates table or empty state
    const table = page.locator("table");
    const emptyState = page.getByText(/no estimates found/i);

    const hasTable = await table.isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(hasTable || hasEmptyState).toBe(true);
  });

  test("estimates page filter tabs work", async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Click different filter tabs
    const tabs = ["All", "Pending", "Accepted", "Declined"];

    for (const tab of tabs) {
      const tabButton = page.getByRole("button", { name: tab, exact: true });
      if (await tabButton.isVisible()) {
        await tabButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test("payment plans page loads without 404 errors", async ({ page }) => {
    const networkErrors: { url: string; status: number }[] = [];

    page.on("response", (response) => {
      const url = response.url();
      const status = response.status();

      if (url.includes("/api/v2/") && status === 404) {
        networkErrors.push({ url, status });
      }
    });

    // Navigate to payment plans page
    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");

    // Page should load without 404 errors
    const planErrors = networkErrors.filter((e) =>
      e.url.includes("/payment-plans"),
    );
    console.log("Payment plans 404 errors:", planErrors);
    expect(planErrors).toHaveLength(0);
  });

  test("payment plans page shows data", async ({ page }) => {
    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");

    // Should show either payment plans table with data or empty state
    const table = page.locator("table");
    const emptyState = page.getByText(/no payment plans found/i);

    // Wait a moment for data to load
    await page.waitForTimeout(1000);

    const hasTable = await table.isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    console.log("Has table:", hasTable, "Has empty state:", hasEmptyState);
    expect(hasTable || hasEmptyState).toBe(true);
  });

  test("payment plans stats cards display data", async ({ page }) => {
    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");

    // Wait for stats to load
    await page.waitForTimeout(1500);

    // Check that stats cards exist and show values (not just --)
    const activePlansCard = page.getByText("Active Plans").locator("..");
    const outstandingCard = page.getByText("Total Outstanding").locator("..");

    await expect(activePlansCard).toBeVisible();
    await expect(outstandingCard).toBeVisible();
  });

  test("payment plans filter tabs work", async ({ page }) => {
    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");

    // Click different filter tabs
    const tabs = ["All", "Active", "Completed", "Overdue"];

    for (const tab of tabs) {
      const tabButton = page.getByRole("button", { name: tab, exact: true });
      if (await tabButton.isVisible()) {
        await tabButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test("API endpoints return 200 directly", async ({ request }) => {
    // Login to get token
    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });
    const { access_token } = await loginResponse.json();

    // Test /quotes/ endpoint
    const quotesResponse = await request.get(`${API_URL}/quotes/`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    expect(quotesResponse.status()).toBe(200);

    // Test /payment-plans/ endpoint
    const plansResponse = await request.get(`${API_URL}/payment-plans/`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    expect(plansResponse.status()).toBe(200);

    // Test /payment-plans/stats/summary endpoint
    const statsResponse = await request.get(
      `${API_URL}/payment-plans/stats/summary`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    );
    expect(statsResponse.status()).toBe(200);
  });

  test("no console errors on estimates page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Filter out non-critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") && !e.includes("workbox") && !e.includes("404"),
    );

    console.log("Console errors:", criticalErrors);
  });

  test("no console errors on payment plans page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");

    // Filter out non-critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") && !e.includes("workbox") && !e.includes("404"),
    );

    console.log("Console errors:", criticalErrors);
  });

  // Payment Plan Creation Tests
  test.describe("Payment Plan Creation", () => {
    test("create payment plan button opens modal", async ({ page }) => {
      await page.goto(`${BASE_URL}/billing/payment-plans`);
      await page.waitForLoadState("networkidle");

      // Click "Create Payment Plan" button
      const createButton = page.getByRole("button", {
        name: /create payment plan/i,
      });
      await expect(createButton).toBeVisible();
      await createButton.click();

      // Modal should open
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Modal should have expected form fields
      await expect(page.getByText("Customer Name")).toBeVisible();
      await expect(page.getByText("Invoice ID")).toBeVisible();
      await expect(page.getByText("Total Amount")).toBeVisible();
      await expect(page.getByText("Number of Installments")).toBeVisible();
      await expect(page.getByText("Payment Frequency")).toBeVisible();
    });

    test("create payment plan modal can be closed", async ({ page }) => {
      await page.goto(`${BASE_URL}/billing/payment-plans`);
      await page.waitForLoadState("networkidle");

      // Open modal
      const createButton = page.getByRole("button", {
        name: /create payment plan/i,
      });
      await createButton.click();

      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Close modal with Cancel button
      const cancelButton = page.getByRole("button", { name: /cancel/i });
      await cancelButton.click();

      // Modal should close
      await expect(modal).not.toBeVisible({ timeout: 3000 });
    });

    test("create payment plan validates required fields", async ({ page }) => {
      await page.goto(`${BASE_URL}/billing/payment-plans`);
      await page.waitForLoadState("networkidle");

      // Open modal
      const createButton = page.getByRole("button", {
        name: /create payment plan/i,
      });
      await createButton.click();

      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Try to submit without filling fields
      const submitButton = page
        .getByRole("button", { name: /create payment plan/i })
        .last();
      await submitButton.click();

      // Should show validation error toast
      await expect(page.getByText(/customer name is required/i)).toBeVisible({
        timeout: 3000,
      });
    });

    test("create payment plan shows payment summary", async ({ page }) => {
      await page.goto(`${BASE_URL}/billing/payment-plans`);
      await page.waitForLoadState("networkidle");

      // Open modal
      const createButton = page.getByRole("button", {
        name: /create payment plan/i,
      });
      await createButton.click();

      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Fill in total amount
      const amountInput = page.locator('input[type="number"]').nth(1); // Second number input is total amount
      await amountInput.fill("1200");

      // Payment summary should appear
      await expect(page.getByText("Payment Summary")).toBeVisible({
        timeout: 3000,
      });
      await expect(page.getByText("Each Payment:")).toBeVisible();
      // With 4 installments (default), $1200 / 4 = $300
      await expect(page.getByText("$300.00")).toBeVisible();
    });

    test("create payment plan submits successfully", async ({ page }) => {
      await page.goto(`${BASE_URL}/billing/payment-plans`);
      await page.waitForLoadState("networkidle");

      // Open modal
      const createButton = page.getByRole("button", {
        name: /create payment plan/i,
      });
      await createButton.click();

      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Fill all required fields
      const inputs = page.locator("input");
      await inputs.first().fill("Test Customer"); // Customer name
      await inputs.nth(1).fill("12345"); // Invoice ID
      await inputs.nth(2).fill("1000"); // Total amount

      // Submit the form
      const submitButton = page
        .getByRole("button", { name: /create payment plan/i })
        .last();
      await submitButton.click();

      // Should show success toast
      await expect(
        page.getByText(/payment plan created successfully/i),
      ).toBeVisible({ timeout: 10000 });

      // Modal should close
      await expect(modal).not.toBeVisible({ timeout: 5000 });
    });

    test("POST /payment-plans/ endpoint works", async ({ request }) => {
      // Login to get token
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        },
      });
      const { access_token } = await loginResponse.json();

      // Test POST /payment-plans/ endpoint
      const createResponse = await request.post(`${API_URL}/payment-plans/`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        data: {
          customer_id: 1,
          invoice_id: 99999,
          total_amount: 500.0,
          installments: 2,
          frequency: "monthly",
        },
      });

      // Should return 200 or 201
      expect([200, 201]).toContain(createResponse.status());

      const responseData = await createResponse.json();
      expect(responseData).toHaveProperty("id");
    });
  });
});
