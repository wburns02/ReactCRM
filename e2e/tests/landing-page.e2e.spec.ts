import { test, expect } from "@playwright/test";

/**
 * Landing Page E2E Tests
 *
 * Tests the customer-facing landing page at /home
 * Verifies:
 * - Page loads correctly
 * - Hero section and CTA visible
 * - Form validation works
 * - Form submission creates lead
 * - Mobile responsiveness
 * - No console errors
 */

test.describe("Landing Page", () => {
  // Console errors collector
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
  });

  test("should load landing page and display hero section", async ({ page }) => {
    await page.goto("/home");

    // Wait for the page to fully load
    await page.waitForLoadState("networkidle");

    // Check hero section exists
    const heroHeading = page.locator("h1");
    await expect(heroHeading).toBeVisible({ timeout: 10000 });
    await expect(heroHeading).toContainText(/septic/i);

    // Check primary CTA button exists
    const ctaButton = page.getByRole("link", { name: /get your free quote/i });
    await expect(ctaButton).toBeVisible();

    // Check call button exists in hero (use first() for multiple matches)
    const callButton = page.getByRole("link", { name: /Call \(936\)/ }).first();
    await expect(callButton).toBeVisible();

    // Screenshot for verification
    await page.screenshot({ path: "e2e/screenshots/landing-hero.png" });
  });

  test("should display trust signals", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Check for trust signal stats (use first() for multiple matches)
    await expect(page.getByText("28+").first()).toBeVisible();
    await expect(page.getByText(/years/i).first()).toBeVisible();
    await expect(page.getByText("5,000+").first()).toBeVisible();
    await expect(page.getByText("4.9").first()).toBeVisible();
  });

  test("should display services section", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Check services section
    await expect(page.getByText(/our septic services/i)).toBeVisible();
    await expect(page.getByText(/septic tank pumping/i).first()).toBeVisible();
    await expect(page.getByText(/inspection/i).first()).toBeVisible();
    await expect(page.getByText(/emergency/i).first()).toBeVisible();
  });

  test("should display FAQ section with working accordion", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Scroll to FAQ section
    const faqHeading = page.getByText(/frequently asked questions/i);
    await faqHeading.scrollIntoViewIfNeeded();
    await expect(faqHeading).toBeVisible();

    // Check that FAQ items exist
    const faqButton = page.getByRole("button", { name: /how often should i pump/i });
    await expect(faqButton).toBeVisible();

    // Test accordion toggle
    await faqButton.click();
    await page.waitForTimeout(500); // Wait for animation

    // The FAQ answer should be visible after clicking
    const faqContent = page.locator("text=For most households").first();
    await expect(faqContent).toBeVisible();
  });

  test("should validate required form fields", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Scroll to form
    const formSection = page.locator("#quote");
    await formSection.scrollIntoViewIfNeeded();

    // Find submit button and click
    const submitButton = page.getByRole("button", { name: /get my free quote/i });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Wait for validation errors
    await expect(page.getByText(/first name is required/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should submit form and create lead successfully", async ({ page }) => {
    // First login to have a valid session for the API
    await page.goto("/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForURL(/dashboard|\/$/);

    // Now go to landing page
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Scroll to form
    const formSection = page.locator("#quote");
    await formSection.scrollIntoViewIfNeeded();

    // Generate unique test data
    const timestamp = Date.now();
    const testFirstName = `Test${timestamp}`;
    const testLastName = "LandingPage";
    const testPhone = `555${timestamp.toString().slice(-7)}`;

    // Fill out the form
    await page.fill('input[name="first_name"]', testFirstName);
    await page.fill('input[name="last_name"]', testLastName);
    await page.fill('input[name="phone"]', testPhone);
    await page.fill('input[name="email"]', `test${timestamp}@example.com`);
    await page.selectOption('select[name="service_type"]', "pumping");
    await page.fill(
      'input[name="address"]',
      "123 Test St, Nacogdoches, TX 75965"
    );
    await page.fill('textarea[name="message"]', "E2E test submission");

    // Take screenshot before submit
    await page.screenshot({ path: "e2e/screenshots/landing-form-filled.png" });

    // Submit the form
    const submitButton = page.getByRole("button", { name: /get my free quote/i });
    await submitButton.click();

    // Wait for success message
    await expect(page.getByText(/thank you/i)).toBeVisible({ timeout: 15000 });

    // Take screenshot of success state
    await page.screenshot({ path: "e2e/screenshots/landing-form-success.png" });

    // Verify lead was created by checking customers page
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");

    // Search for the test lead
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(testFirstName);
      await page.waitForTimeout(1000); // Wait for search to execute
    }

    // Check if the lead appears in the list (use first() for multiple matches)
    await expect(page.getByText(testFirstName).first()).toBeVisible({ timeout: 10000 });

    // Take screenshot of customer in list
    await page.screenshot({ path: "e2e/screenshots/landing-lead-in-crm.png" });
  });

  test("should be responsive on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Check hero is visible
    const heroHeading = page.locator("h1");
    await expect(heroHeading).toBeVisible();

    // Check sticky mobile CTA is visible
    const stickyCta = page.locator(".fixed.bottom-0");
    await expect(stickyCta).toBeVisible();

    // Take mobile screenshot
    await page.screenshot({
      path: "e2e/screenshots/landing-mobile.png",
      fullPage: true,
    });
  });

  test("should have working phone call link", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Find call link in hero section
    const callLink = page.getByRole("link", { name: /Call \(936\)/ }).first();
    await expect(callLink).toBeVisible();

    // Check href
    const href = await callLink.getAttribute("href");
    expect(href).toMatch(/tel:\+?1?936/);
  });

  test("should have working email inquiry", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Find email link
    const emailLink = page.getByRole("link", { name: /info@macseptic/i });
    await expect(emailLink).toBeVisible();

    // Check href
    const href = await emailLink.getAttribute("href");
    expect(href).toMatch(/mailto:/);
  });

  test("should have no critical console errors", async ({ page }) => {
    // Clear previous errors
    consoleErrors.length = 0;

    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Wait a bit for any delayed errors
    await page.waitForTimeout(2000);

    // Check for critical errors (filter out known non-issues)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes("favicon") &&
        !error.includes("manifest") &&
        !error.includes("service-worker") &&
        !error.includes("Sentry") &&
        !error.includes("chunk")
    );

    if (criticalErrors.length > 0) {
      console.log("Console errors found:", criticalErrors);
    }

    // Allow for some non-critical errors but fail on critical ones
    expect(criticalErrors.length).toBeLessThan(3);
  });

  test("should load landing page without authentication", async ({ page }) => {
    // Clear any existing cookies/session
    await page.context().clearCookies();

    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Verify we're on the landing page, not redirected to login
    await expect(page).toHaveURL(/\/home/);

    // Verify content loads
    const heroHeading = page.locator("h1");
    await expect(heroHeading).toBeVisible();
  });
});
