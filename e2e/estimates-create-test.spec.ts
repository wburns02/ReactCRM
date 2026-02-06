import { test, expect } from "@playwright/test";

test.describe("Estimates Creation Full Test", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("create estimate - capture network traffic on submit", async ({ page }) => {
    // Track all network requests
    const requests: { url: string; method: string; body?: string; status?: number; response?: string }[] = [];

    page.on("request", async (request) => {
      if (request.url().includes("quotes") || request.url().includes("estimate")) {
        requests.push({
          url: request.url(),
          method: request.method(),
          body: request.postData() || undefined,
        });
      }
    });

    page.on("response", async (response) => {
      if (response.url().includes("quotes") || response.url().includes("estimate")) {
        const reqIdx = requests.findIndex(r => r.url === response.url() && !r.status);
        if (reqIdx >= 0) {
          requests[reqIdx].status = response.status();
          try {
            requests[reqIdx].response = await response.text();
          } catch {
            // ignore
          }
        }
      }
    });

    // Navigate to Estimates page
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Click Create Estimate button
    const createButton = page.locator('button:has-text("Create Estimate")');
    await createButton.click();
    await page.waitForTimeout(1000);

    // Take screenshot of modal
    await page.screenshot({ path: "estimate-modal-open.png", fullPage: true });

    // Fill in customer - search and select
    const customerInput = page.locator('input[placeholder*="Search customers"], input[placeholder*="customer"]').first();
    if (await customerInput.isVisible()) {
      await customerInput.fill("Mac");
      await page.waitForTimeout(500);

      // Try to select from dropdown if it appears
      const dropdown = page.locator('[role="listbox"], [class*="dropdown"], [class*="suggestion"]').first();
      if (await dropdown.isVisible().catch(() => false)) {
        const firstOption = dropdown.locator('li, [role="option"], div').first();
        await firstOption.click().catch(() => {});
      }
    }

    // Fill in line item fields
    const serviceInput = page.locator('input[placeholder*="Service"], input').filter({ hasText: '' }).nth(0);
    const fields = await page.locator('input').all();
    console.log("Found", fields.length, "input fields");

    // Print all inputs for debugging
    for (let i = 0; i < fields.length; i++) {
      const placeholder = await fields[i].getAttribute("placeholder");
      const name = await fields[i].getAttribute("name");
      const value = await fields[i].inputValue().catch(() => "");
      console.log(`Input ${i}: placeholder="${placeholder}" name="${name}" value="${value}"`);
    }

    // Take screenshot before trying to fill
    await page.screenshot({ path: "estimate-before-fill.png", fullPage: true });

    // Try clicking a Quick Add button
    const quickAdd = page.locator('button:has-text("Up to 1000g"), button:has-text("$295")').first();
    if (await quickAdd.isVisible().catch(() => false)) {
      console.log("Clicking Quick Add button");
      await quickAdd.click();
      await page.waitForTimeout(500);
    }

    // Take screenshot after quick add
    await page.screenshot({ path: "estimate-after-quickadd.png", fullPage: true });

    // Click Create Estimate submit button
    const submitButton = page.locator('button:has-text("Create Estimate")').last();
    console.log("Clicking submit button");
    await submitButton.click();

    // Wait for network activity
    await page.waitForTimeout(3000);

    // Take screenshot after submit
    await page.screenshot({ path: "estimate-after-submit.png", fullPage: true });

    // Print all captured requests
    console.log("\n=== NETWORK REQUESTS ===");
    for (const req of requests) {
      console.log(`${req.method} ${req.url}`);
      console.log(`  Status: ${req.status}`);
      if (req.body) console.log(`  Body: ${req.body}`);
      if (req.response) console.log(`  Response: ${req.response.substring(0, 500)}`);
    }

    // Check for any POST to /quotes
    const postQuotes = requests.find(r => r.method === "POST" && r.url.includes("/quotes"));
    if (postQuotes) {
      console.log("\n=== POST /quotes DETAILS ===");
      console.log("Status:", postQuotes.status);
      console.log("Body:", postQuotes.body);
      console.log("Response:", postQuotes.response);

      // Assert not 422
      expect(postQuotes.status).not.toBe(422);
    } else {
      console.log("\n=== NO POST /quotes REQUEST FOUND ===");
      console.log("This means the form didn't submit to the backend");
    }
  });
});
