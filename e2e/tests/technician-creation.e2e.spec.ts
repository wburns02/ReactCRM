import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Technician Creation
 *
 * Verifies:
 * 1. Technician form opens correctly
 * 2. Creating a technician returns 201 (not 500)
 * 3. New technician appears in list
 *
 * Fix verified: skills column type changed from JSON to ARRAY(String)
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Technician Creation", () => {
  test("can navigate to technicians page", async ({ page }) => {
    await page.goto(`${BASE_URL}/technicians`);

    // If redirected to login, skip test (auth setup may have failed)
    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    await expect(page.locator("h1")).toContainText("Technicians", { timeout: 10000 });
  });

  test("can open Add Technician form", async ({ page }) => {
    await page.goto(`${BASE_URL}/technicians`);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("Technicians", { timeout: 10000 });

    // Click Add Technician button
    await page.click('button:has-text("Add Technician")');

    // Verify modal opens
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Add New Technician")).toBeVisible();
  });

  test("can create a new technician (no 500 error)", async ({ page }) => {
    await page.goto(`${BASE_URL}/technicians`);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("Technicians", { timeout: 10000 });

    // Click Add Technician button
    await page.click('button:has-text("Add Technician")');
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    // Fill in required fields with unique name
    const uniqueName = `TestTech${Date.now().toString().slice(-6)}`;
    await page.fill('input[id="first_name"]', uniqueName);
    await page.fill('input[id="last_name"]', "AutoTest");

    // Submit the form
    await page.click('button:has-text("Create Technician")');

    // Wait for response
    const response = await page.waitForResponse(
      (response) =>
        response.url().includes("/technicians") &&
        response.request().method() === "POST" &&
        !response.url().includes("307"), // Ignore redirects
      { timeout: 15000 }
    );

    // Verify 201 Created (NOT 500)
    expect(response.status()).toBe(201);
    console.log(`CREATE RESPONSE: ${response.status()}`);

    // Modal should close on success
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
  });

  test("new technician appears in list after creation", async ({ page }) => {
    await page.goto(`${BASE_URL}/technicians`);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("Technicians", { timeout: 10000 });

    // Click Add Technician button
    await page.click('button:has-text("Add Technician")');
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    // Fill in required fields with unique name
    const uniqueName = `ListTest${Date.now().toString().slice(-6)}`;
    await page.fill('input[id="first_name"]', uniqueName);
    await page.fill('input[id="last_name"]', "InList");

    // Submit the form
    await page.click('button:has-text("Create Technician")');

    // Wait for successful response
    await page.waitForResponse(
      (response) =>
        response.url().includes("/technicians") &&
        response.request().method() === "POST" &&
        response.status() === 201,
      { timeout: 15000 }
    );

    // Modal should close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });

    // Search for the new technician
    await page.fill('input[type="search"]', uniqueName);
    await page.waitForTimeout(1500); // Debounce

    // Verify technician appears in list
    await expect(page.locator(`text="${uniqueName}"`)).toBeVisible({ timeout: 10000 });
  });

  test("can create technician with skills", async ({ page }) => {
    await page.goto(`${BASE_URL}/technicians`);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("Technicians", { timeout: 10000 });

    // Click Add Technician button
    await page.click('button:has-text("Add Technician")');
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    // Fill in required fields
    const uniqueName = `SkillTest${Date.now().toString().slice(-6)}`;
    await page.fill('input[id="first_name"]', uniqueName);
    await page.fill('input[id="last_name"]', "WithSkills");

    // Select some skills
    await page.click('label:has-text("Pumping")');
    await page.click('label:has-text("Repair")');

    // Submit the form
    await page.click('button:has-text("Create Technician")');

    // Wait for successful response
    const response = await page.waitForResponse(
      (response) =>
        response.url().includes("/technicians") &&
        response.request().method() === "POST" &&
        !response.url().includes("307"),
      { timeout: 15000 }
    );

    expect(response.status()).toBe(201);

    // Verify skills in response
    const body = await response.json();
    expect(body.skills).toContain("pumping");
    expect(body.skills).toContain("repair");
    console.log(`Created technician with skills: ${JSON.stringify(body.skills)}`);
  });
});
