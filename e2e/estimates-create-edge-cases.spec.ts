import { test, expect } from "@playwright/test";

/**
 * Test edge cases that might cause 422 errors on estimate creation
 */
test.describe("Estimates Create Edge Cases", () => {
  // Helper to fill the basic form
  async function fillEstimateForm(page: any, options: {
    customerName?: string;
    service?: string;
    quantity?: string;
    rate?: string;
    taxRate?: string;
    validUntil?: string;
    notes?: string;
  }) {
    // Click customer search
    const customerSearch = page.locator('input[placeholder="Search customers..."]');
    await customerSearch.click();
    await page.waitForTimeout(500);

    // Select customer
    const customerOption = page.locator(`text=${options.customerName || 'CSRF Test'}`).first();
    if (await customerOption.isVisible()) {
      await customerOption.click();
    }
    await page.waitForTimeout(300);

    // Fill service
    const serviceInput = page.locator('input[placeholder="Service"]').first();
    await serviceInput.fill(options.service || "Test Service");

    // Fill rate
    const rateInput = page.locator('input[type="number"]').nth(1);
    await rateInput.fill(options.rate || "100");

    // Fill tax rate if specified
    if (options.taxRate) {
      const taxInput = page.locator('input[type="number"]').nth(2);
      await taxInput.fill(options.taxRate);
    }

    // Fill valid until if specified
    if (options.validUntil) {
      const dateInput = page.locator('input[type="date"]');
      await dateInput.fill(options.validUntil);
    }

    // Fill notes if specified
    if (options.notes) {
      const notesTextarea = page.locator('textarea');
      await notesTextarea.fill(options.notes);
    }
  }

  test.beforeEach(async ({ page }) => {
    // Navigate to Estimates page
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Click Create Estimate
    const createBtn = page.locator('button:has-text("Create Estimate")');
    await createBtn.first().click();
    await page.waitForTimeout(500);
  });

  test("edge case: with valid_until date", async ({ page }) => {
    let postResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        postResponse = {
          status: response.status(),
          body: null,
        };
        try {
          postResponse.body = await response.json();
        } catch {
          postResponse.body = await response.text();
        }
      }
    });

    await fillEstimateForm(page, {
      service: "Service with Date",
      rate: "200",
      validUntil: "2026-02-28", // Future date
    });

    // Submit
    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(2000);

    console.log("=== POST with valid_until ===");
    console.log("Status:", postResponse?.status);
    console.log("Body:", JSON.stringify(postResponse?.body, null, 2));

    // Should succeed, not 422
    expect(postResponse?.status).toBe(201);
  });

  test("edge case: with high tax rate", async ({ page }) => {
    let postResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        postResponse = {
          status: response.status(),
          body: null,
        };
        try {
          postResponse.body = await response.json();
        } catch {
          postResponse.body = await response.text();
        }
      }
    });

    await fillEstimateForm(page, {
      service: "Service with Tax",
      rate: "100",
      taxRate: "8.25", // Texas sales tax
    });

    // Submit
    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(2000);

    console.log("=== POST with tax rate ===");
    console.log("Status:", postResponse?.status);
    console.log("Body:", JSON.stringify(postResponse?.body, null, 2));

    expect(postResponse?.status).toBe(201);
  });

  test("edge case: with special characters in notes", async ({ page }) => {
    let postResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        postResponse = {
          status: response.status(),
          body: null,
        };
        try {
          postResponse.body = await response.json();
        } catch {
          postResponse.body = await response.text();
        }
      }
    });

    await fillEstimateForm(page, {
      service: "Service with Notes",
      rate: "150",
      notes: "Special chars: <>&\"'  Unicode: 日本語 Emoji: 🔧",
    });

    // Submit
    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(2000);

    console.log("=== POST with special chars ===");
    console.log("Status:", postResponse?.status);
    console.log("Body:", JSON.stringify(postResponse?.body, null, 2));

    expect(postResponse?.status).toBe(201);
  });

  test("edge case: with decimal quantity", async ({ page }) => {
    let postResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        postResponse = {
          status: response.status(),
          body: null,
        };
        try {
          postResponse.body = await response.json();
        } catch {
          postResponse.body = await response.text();
        }
      }
    });

    // Click customer search
    const customerSearch = page.locator('input[placeholder="Search customers..."]');
    await customerSearch.click();
    await page.waitForTimeout(500);
    const customerOption = page.locator('text=CSRF Test').first();
    await customerOption.click();
    await page.waitForTimeout(300);

    // Fill with decimal quantity
    await page.locator('input[placeholder="Service"]').fill("Service with Decimal Qty");
    await page.locator('input[type="number"]').nth(0).fill("2.5"); // Decimal quantity
    await page.locator('input[type="number"]').nth(1).fill("50"); // Rate

    // Submit
    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(2000);

    console.log("=== POST with decimal quantity ===");
    console.log("Status:", postResponse?.status);
    console.log("Body:", JSON.stringify(postResponse?.body, null, 2));

    expect(postResponse?.status).toBe(201);
  });

  test("edge case: with very large rate", async ({ page }) => {
    let postResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        postResponse = {
          status: response.status(),
          body: null,
        };
        try {
          postResponse.body = await response.json();
        } catch {
          postResponse.body = await response.text();
        }
      }
    });

    await fillEstimateForm(page, {
      service: "Expensive Service",
      rate: "999999.99", // Large but valid
    });

    // Submit
    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(2000);

    console.log("=== POST with large rate ===");
    console.log("Status:", postResponse?.status);
    console.log("Body:", JSON.stringify(postResponse?.body, null, 2));

    expect(postResponse?.status).toBe(201);
  });

  test("negative case: zero rate should still work", async ({ page }) => {
    let postResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        postResponse = {
          status: response.status(),
          body: null,
        };
        try {
          postResponse.body = await response.json();
        } catch {
          postResponse.body = await response.text();
        }
      }
    });

    await fillEstimateForm(page, {
      service: "Free Consultation",
      rate: "0",
    });

    // Submit
    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(2000);

    console.log("=== POST with zero rate ===");
    console.log("Status:", postResponse?.status);
    console.log("Body:", JSON.stringify(postResponse?.body, null, 2));

    expect(postResponse?.status).toBe(201);
  });
});
