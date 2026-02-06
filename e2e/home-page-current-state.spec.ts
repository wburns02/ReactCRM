import { test, expect } from "@playwright/test";

/**
 * Capture current state of home page for analysis
 */
test.describe("Home Page Current State Analysis", () => {
  test("capture current home page state", async ({ page }) => {
    // Navigate to home page (public, no auth needed)
    await page.goto("https://react.ecbtx.com/home");
    await page.waitForLoadState("networkidle");

    // Take screenshot
    await page.screenshot({ path: "test-results/home-current-state.png", fullPage: true });

    // Capture key elements
    console.log("=== HOME PAGE ANALYSIS ===\n");

    // 1. Check for logo
    const logo = page.locator('img[alt*="logo" i], img[alt*="MAC" i], [class*="logo"]');
    const logoCount = await logo.count();
    console.log(`Logo elements found: ${logoCount}`);

    // 2. Check hero headline
    const h1 = page.locator("h1");
    const h1Text = await h1.textContent();
    console.log(`Hero Headline: ${h1Text}`);

    // 3. Check for location text
    const pageText = await page.textContent("body");
    const hasEastCentralTexas = pageText?.includes("East Central Texas");
    const hasCentralTexas = pageText?.includes("Central Texas");
    console.log(`Location - "East Central Texas": ${hasEastCentralTexas}`);
    console.log(`Location - "Central Texas": ${hasCentralTexas}`);

    // 4. Check phone number
    const phoneLinks = page.locator('a[href^="tel:"]');
    const phoneCount = await phoneLinks.count();
    console.log(`Phone links found: ${phoneCount}`);
    if (phoneCount > 0) {
      const phoneHref = await phoneLinks.first().getAttribute("href");
      console.log(`Phone number: ${phoneHref}`);
    }

    // 5. Check form fields
    const formFields = {
      firstName: await page.locator('input[name="first_name"], input[placeholder*="First"]').count(),
      lastName: await page.locator('input[name="last_name"], input[placeholder*="Last"]').count(),
      phone: await page.locator('input[name="phone"], input[type="tel"]').count(),
      email: await page.locator('input[name="email"], input[type="email"]').count(),
      serviceType: await page.locator('select[name="service_type"]').count(),
      address: await page.locator('input[name="address"]').count(),
      message: await page.locator('textarea').count(),
      dateTime: await page.locator('input[type="date"], input[type="datetime-local"]').count(),
    };
    console.log("\nForm Fields:");
    console.log(JSON.stringify(formFields, null, 2));

    // 6. Check for date/time picker
    const hasDatePicker = formFields.dateTime > 0;
    console.log(`\nDate/Time Picker present: ${hasDatePicker}`);

    // 7. Check trust signals
    const hasReviews = pageText?.includes("4.9") || pageText?.includes("reviews");
    const hasYearsInBusiness = pageText?.includes("years") || pageText?.includes("since");
    const hasLicensed = pageText?.includes("Licensed");
    console.log("\nTrust Signals:");
    console.log(`- Reviews mention: ${hasReviews}`);
    console.log(`- Years in business: ${hasYearsInBusiness}`);
    console.log(`- Licensed mention: ${hasLicensed}`);

    // 8. Check mobile sticky CTA
    const stickyCta = page.locator('.fixed.bottom-0');
    const hasStickyCta = await stickyCta.count() > 0;
    console.log(`\nMobile sticky CTA: ${hasStickyCta}`);

    // 9. Check autofill attributes
    const autofillName = await page.locator('input[autocomplete="name"], input[autocomplete="given-name"]').count();
    const autofillTel = await page.locator('input[autocomplete="tel"]').count();
    const autofillEmail = await page.locator('input[autocomplete="email"]').count();
    console.log("\nAutofill Attributes:");
    console.log(`- name: ${autofillName > 0}`);
    console.log(`- tel: ${autofillTel > 0}`);
    console.log(`- email: ${autofillEmail > 0}`);

    console.log("\n=== END ANALYSIS ===");
  });
});
