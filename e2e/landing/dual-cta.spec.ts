import { test, expect } from "@playwright/test";

test.describe("Dual CTA - Tab Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/home");
    // Scroll to the CTA section
    await page.locator("#quote").scrollIntoViewIfNeeded();
  });

  test("Book Now tab is default and shows booking form", async ({ page }) => {
    // Book Now tab should be selected by default
    const bookTab = page.getByRole("tab", { name: /book.*pay/i });
    await expect(bookTab).toHaveAttribute("aria-selected", "true");

    // Should show Schedule & Pay header in the form panel
    await expect(
      page.locator('[role="tabpanel"]').getByText("Schedule & Pay")
    ).toBeVisible();

    // Should show pricing in the form header
    await expect(
      page.locator('[role="tabpanel"]').locator("text=$575").first()
    ).toBeVisible();

    // Should show Book benefits in the left column
    await expect(page.getByText("Skip the scheduling wait")).toBeVisible();
  });

  test("Can switch to Get Quote tab", async ({ page }) => {
    // Click Get Quote tab
    await page.getByRole("tab", { name: /get.*quote/i }).click();

    // Get Quote tab should now be selected
    await expect(
      page.getByRole("tab", { name: /get.*quote/i })
    ).toHaveAttribute("aria-selected", "true");

    // Should show Get Your Free Quote header in the form panel
    await expect(
      page.locator('[role="tabpanel"]').getByRole("heading", {
        name: "Get Your Free Quote",
      })
    ).toBeVisible();

    // Should NOT show Schedule & Pay (booking form hidden)
    await expect(
      page.locator('[role="tabpanel"]').getByText("Schedule & Pay")
    ).not.toBeVisible();
  });

  test("Benefits update when switching tabs", async ({ page }) => {
    // Initially shows Book benefits
    await expect(page.getByText("Skip the scheduling wait")).toBeVisible();

    // Switch to Get Quote
    await page.getByRole("tab", { name: /get.*quote/i }).click();

    // Should show Quote benefits (use exact match to avoid FAQ section)
    await expect(
      page.getByText("Free, no-obligation quotes", { exact: true })
    ).toBeVisible();

    // Book benefits should be hidden
    await expect(page.getByText("Skip the scheduling wait")).not.toBeVisible();
  });

  test("Left column headline updates with tab selection", async ({ page }) => {
    // Default headline for Book
    await expect(page.getByText("Ready to Book Your Service?")).toBeVisible();

    // Switch to Quote
    await page.getByRole("tab", { name: /get.*quote/i }).click();

    // Headline should change
    await expect(
      page.getByText("Ready for Reliable Septic Service?")
    ).toBeVisible();
  });
});

test.describe("Dual CTA - Book Now Form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/home");
    await page.locator("#quote").scrollIntoViewIfNeeded();
  });

  test("Can fill and submit booking form in test mode", async ({ page }) => {
    // Book Now should be selected by default
    await expect(
      page.locator('[role="tabpanel"]').getByText("Schedule & Pay")
    ).toBeVisible();

    // Fill in customer details
    const panel = page.locator('[role="tabpanel"]').first();

    await panel.locator('input[autocomplete="given-name"]').first().fill("Test");
    await panel.locator('input[autocomplete="family-name"]').first().fill("Booking");
    await panel.locator('input[type="tel"]').first().fill("9365551234");

    // Select a date - click first available date button
    const dateButtons = panel.locator(
      'button:has-text("THU"), button:has-text("FRI"), button:has-text("MON")'
    );
    const firstDate = dateButtons.first();
    if (await firstDate.isVisible()) {
      await firstDate.click();
    }

    // Select time slot - Morning
    const morningButton = panel.locator('button', { hasText: "Morning" });
    if (await morningButton.isVisible()) {
      await morningButton.click();
    }

    // Check overage acknowledgment
    const checkboxes = await panel.locator('input[type="checkbox"]').all();
    for (const checkbox of checkboxes) {
      const id = await checkbox.getAttribute("id");
      if (id?.includes("overage")) {
        await checkbox.check();
        break;
      }
    }

    // Submit the form
    await panel.locator('button[type="submit"]').click();

    // Wait for success message - should show booking confirmation
    await expect(page.getByText(/booking confirmed/i)).toBeVisible({
      timeout: 15000,
    });
  });
});

test.describe("Dual CTA - Get Quote Form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/home");
    await page.locator("#quote").scrollIntoViewIfNeeded();
    // Switch to Get Quote tab
    await page.getByRole("tab", { name: /get.*quote/i }).click();
  });

  test("Shows quote form when Get Quote tab selected", async ({ page }) => {
    // Check the heading in the form panel specifically
    await expect(
      page.locator('[role="tabpanel"]').getByRole("heading", {
        name: "Get Your Free Quote",
      })
    ).toBeVisible();
    await expect(page.getByText("we'll get back to you ASAP")).toBeVisible();
  });

  test("Can fill and submit quote form", async ({ page }) => {
    // Fill form
    const panel = page.locator('[role="tabpanel"]').first();

    await panel.locator('input[autocomplete="given-name"]').first().fill("Quote");
    await panel.locator('input[autocomplete="family-name"]').first().fill("Request");
    await panel.locator('input[type="tel"]').first().fill("9365554567");

    // Select service type
    const serviceSelect = panel.locator("select").first();
    if (await serviceSelect.isVisible()) {
      await serviceSelect.selectOption("pumping");
    }

    // Submit
    await panel.locator('button[type="submit"]').click();

    // Should show success
    await expect(page.getByText(/thank you/i)).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Dual CTA - Mobile Experience", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("Tabs are visible and functional on mobile", async ({ page }) => {
    await page.goto("/home");
    await page.locator("#quote").scrollIntoViewIfNeeded();

    // Tabs should be visible
    await expect(page.getByRole("tab", { name: /book.*pay/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /get.*quote/i })).toBeVisible();

    // Should be able to switch tabs
    await page.getByRole("tab", { name: /get.*quote/i }).click();

    // Check the heading in the panel specifically
    await expect(
      page.locator('[role="tabpanel"]').getByRole("heading", {
        name: "Get Your Free Quote",
      })
    ).toBeVisible();
  });
});
