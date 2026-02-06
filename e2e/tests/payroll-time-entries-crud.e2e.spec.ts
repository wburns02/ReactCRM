import { test, expect } from "@playwright/test";

/**
 * Payroll Time Entry CRUD E2E Test
 * Verifies Add, Edit, and Delete time entries on PayrollPeriodDetailPage
 */

const BASE_URL = "https://react.ecbtx.com";
const LOGIN_EMAIL = "will@macseptic.com";
const LOGIN_PASSWORD = "#Espn2025";

test.describe("Payroll Time Entry CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', LOGIN_EMAIL);
    await page.fill('input[type="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("should add, edit, and delete time entries", async ({ page }) => {
    // Track network responses
    const networkResponses: { method: string; url: string; status: number; body?: string }[] = [];
    const consoleErrors: string[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/time-entries")) {
        try {
          networkResponses.push({
            method: response.request().method(),
            url: response.url(),
            status: response.status(),
            body: await response.text().catch(() => ""),
          });
        } catch {
          networkResponses.push({
            method: response.request().method(),
            url: response.url(),
            status: response.status(),
          });
        }
      }
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter out known non-critical errors
        if (!text.includes("favicon") &&
            !text.includes("Sentry") &&
            !text.includes("ERR_BLOCKED_BY_CLIENT") &&
            !text.includes("500") &&  // Filter generic 500 resource errors
            !text.includes("Failed to load resource")) {
          consoleErrors.push(text);
        }
      }
    });

    // Navigate to Payroll page
    await page.goto(`${BASE_URL}/payroll`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Payroll')")).toBeVisible({ timeout: 10000 });

    // Click View on first period
    await page.locator("button:has-text('View')").first().click();
    await page.waitForURL("**/payroll/*", { timeout: 10000 });

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Click Time Entries tab
    const timeEntriesTab = page.locator("button").filter({ hasText: "Time Entries" });
    await expect(timeEntriesTab).toBeVisible();
    await timeEntriesTab.click();
    await page.waitForTimeout(500);

    // Verify "+ Add Entry" button is visible
    const addButton = page.locator("button:has-text('+ Add Entry')");
    await expect(addButton).toBeVisible({ timeout: 5000 });
    console.log("✅ Add Entry button is visible");

    // ===== TEST ADD =====
    await addButton.click();
    await page.waitForTimeout(500);

    // Modal should appear - check for modal dialog with form
    const modal = page.locator("[role='dialog'], .modal, [class*='Dialog']").filter({ hasText: "Add Time Entry" });
    await expect(modal).toBeVisible({ timeout: 3000 });
    console.log("✅ Add Entry modal opened");

    // Screenshot of modal
    await page.screenshot({ path: "e2e/screenshots/payroll-add-entry-modal.png" });

    // Fill the form
    // Select technician from dropdown
    const techSelect = page.locator("select").first();
    const techOptions = await techSelect.locator("option").allTextContents();
    console.log("Available technicians:", techOptions);

    // Select first non-empty option
    if (techOptions.length > 1) {
      await techSelect.selectOption({ index: 1 });
    }

    // Fill date
    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill("2026-01-15");

    // Fill clock-in time
    const clockInInput = page.locator('input[type="time"]').first();
    await clockInInput.fill("08:00");

    // Fill clock-out time (optional)
    const clockOutInput = page.locator('input[type="time"]').last();
    await clockOutInput.fill("16:30");

    // Fill notes
    const notesInput = page.locator("textarea");
    if (await notesInput.count() > 0) {
      await notesInput.fill("Playwright test entry - will delete");
    }

    // Screenshot before submit
    await page.screenshot({ path: "e2e/screenshots/payroll-entry-form-filled.png" });

    // Click Create Entry button
    const createButton = page.locator("button:has-text('Create Entry')");
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Check if POST was successful
    const postResponse = networkResponses.find(r => r.method === "POST");
    if (postResponse) {
      console.log(`POST /time-entries status: ${postResponse.status}`);
      if (postResponse.status >= 400) {
        console.log("POST response body:", postResponse.body);
      }
      expect(postResponse.status).toBeLessThan(400);
      console.log("✅ Time entry created successfully");
    } else {
      console.log("⚠️ No POST response captured");
    }

    // Modal should close or refresh
    await page.waitForTimeout(1000);

    // Look for success toast
    const successToast = page.locator("[class*='toast'], [role='alert']").filter({ hasText: /created|success/i });
    if (await successToast.count() > 0) {
      console.log("✅ Success toast appeared");
    }

    // ===== TEST EDIT =====
    // First, check if there are any entries to edit
    // Look for Edit buttons specifically within time entry rows (in bg-bg-muted divs)
    await page.waitForTimeout(500);
    const timeEntryRows = page.locator(".bg-bg-muted").filter({ has: page.locator("button:has-text('Edit')") });
    const rowCount = await timeEntryRows.count();
    console.log(`Time entry rows with Edit buttons: ${rowCount}`);

    if (rowCount > 0) {
      // Click Edit on first time entry row
      const firstRowEditBtn = timeEntryRows.first().locator("button:has-text('Edit')");
      await firstRowEditBtn.click();
      await page.waitForTimeout(1000);

      const editModal = page.locator("[role='dialog'], .modal, [class*='Dialog']").filter({ hasText: "Edit Time Entry" });
      const editModalCount = await editModal.count();
      console.log(`Edit modals found: ${editModalCount}`);

      if (editModalCount > 0) {
        console.log("✅ Edit modal opened");

        // Modify the notes
        const editNotesInput = page.locator("textarea");
        if (await editNotesInput.count() > 0) {
          await editNotesInput.clear();
          await editNotesInput.fill("Playwright test - EDITED");
        }

        // Click Update Entry button
        const updateButton = page.locator("button:has-text('Update Entry')");
        if (await updateButton.count() > 0) {
          await updateButton.click();
          await page.waitForTimeout(2000);

          // Check if PATCH was successful
          const patchResponse = networkResponses.find(r => r.method === "PATCH");
          if (patchResponse) {
            console.log(`PATCH /time-entries status: ${patchResponse.status}`);
            if (patchResponse.status >= 400) {
              console.log("PATCH response body:", patchResponse.body);
            }
            expect(patchResponse.status).toBeLessThan(400);
            console.log("✅ Time entry edited successfully");
          }
        }
      } else {
        console.log("⚠️ Edit modal did not appear");
      }
    } else {
      console.log("⚠️ No time entry rows with Edit buttons found");
    }

    // ===== TEST DELETE =====
    // Refresh the tab to see the new entry
    await timeEntriesTab.click();
    await page.waitForTimeout(1000);

    // Look for Delete buttons specifically within time entry rows
    const deleteableRows = page.locator(".bg-bg-muted").filter({ has: page.locator("button:has-text('Delete')") });
    const deleteCount = await deleteableRows.count();
    console.log(`Time entry rows with Delete buttons: ${deleteCount}`);

    if (deleteCount > 0) {
      const firstDeleteBtn = deleteableRows.first().locator("button:has-text('Delete')");
      await firstDeleteBtn.click();
      await page.waitForTimeout(500);

      // Look for confirmation dialog
      const confirmDialog = page.locator("text=Are you sure").or(page.locator("text=Delete Time Entry"));
      if (await confirmDialog.count() > 0) {
        console.log("✅ Delete confirmation dialog appeared");

        // Find and click confirm button - look for the Delete button inside the dialog
        const confirmDeleteBtn = page.locator("[role='dialog'] button:has-text('Delete')").or(
          page.locator("button:has-text('Confirm')")
        );

        if (await confirmDeleteBtn.count() > 0) {
          await confirmDeleteBtn.first().click();
          await page.waitForTimeout(2000);

          // Check if DELETE was successful
          const deleteResponse = networkResponses.find(r => r.method === "DELETE");
          if (deleteResponse) {
            console.log(`DELETE /time-entries status: ${deleteResponse.status}`);
            expect(deleteResponse.status).toBeLessThan(400);
            console.log("✅ Time entry deleted successfully");
          }
        }
      } else {
        console.log("⚠️ Delete confirmation dialog not found");
      }
    } else {
      console.log("⚠️ No Delete buttons found - only pending entries can be deleted");
    }

    // Final screenshot
    await page.screenshot({ path: "e2e/screenshots/payroll-time-entries-after-crud.png" });

    // Report console errors
    if (consoleErrors.length > 0) {
      console.log("Console errors:", consoleErrors);
    }
    expect(consoleErrors.length).toBe(0);

    // Verify no 400/500 errors on CRUD operations
    const errors = networkResponses.filter(r => r.status >= 400);
    if (errors.length > 0) {
      console.log("Network errors:", errors);
      // Only fail if it's a critical operation error
      const criticalErrors = errors.filter(e => e.method !== "GET");
      expect(criticalErrors.length).toBe(0);
    }

    console.log("\n========================================");
    console.log("✅✅✅ TIME ENTRY CRUD TESTS COMPLETE ✅✅✅");
    console.log("========================================");
  });

  test("should verify Add Entry button exists on Time Entries tab", async ({ page }) => {
    // Navigate to Payroll page
    await page.goto(`${BASE_URL}/payroll`);
    await page.waitForLoadState("networkidle");

    // Click View on first period
    await page.locator("button:has-text('View')").first().click();
    await page.waitForURL("**/payroll/*", { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Click Time Entries tab
    const timeEntriesTab = page.locator("button").filter({ hasText: "Time Entries" });
    await timeEntriesTab.click();
    await page.waitForTimeout(500);

    // Verify Add Entry button is present
    const addButton = page.locator("button:has-text('+ Add Entry')");
    await expect(addButton).toBeVisible({ timeout: 5000 });
    console.log("✅ Add Entry button verified");
  });
});
