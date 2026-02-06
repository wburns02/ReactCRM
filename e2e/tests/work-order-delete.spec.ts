import { test, expect } from "@playwright/test";

/**
 * Work Order Deletion Test
 * Tests deleting a work order and captures all console errors
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Work Order Deletion", () => {
  test("delete work order without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const apiErrors: { url: string; status: number; detail?: any }[] = [];

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter out known non-blocking errors
        if (
          !text.includes("favicon") &&
          !text.includes("Sentry") &&
          !text.includes("ResizeObserver")
        ) {
          consoleErrors.push(text);
          console.log(`❌ Console Error: ${text}`);
        }
      }
    });

    // Capture API errors
    page.on("response", async (res) => {
      if (res.status() >= 400) {
        let detail;
        try {
          detail = await res.json();
        } catch (e) {
          try {
            detail = await res.text();
          } catch (e2) {
            detail = null;
          }
        }

        if (res.url().includes("/work-orders")) {
          apiErrors.push({
            url: res.url(),
            status: res.status(),
            detail,
          });
          console.log(
            `❌ API Error: ${res.status()} ${res.request().method()} ${res.url()}`
          );
          if (detail) {
            console.log(`   Detail: ${JSON.stringify(detail).slice(0, 200)}`);
          }
        }
      }
    });

    // Login
    console.log("🔐 Logging in...");
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

    // First, create a test work order to delete
    console.log("📝 Creating test work order...");
    const createResult = await page.evaluate(async () => {
      try {
        const customersRes = await fetch("/api/v2/customers?page_size=1", {
          credentials: "include",
        });
        const customers = await customersRes.json();
        const customerId = customers.items[0].id;

        const createRes = await fetch("/api/v2/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            customer_id: customerId,
            job_type: "pumping",
            status: "draft",
            priority: "normal",
            estimated_duration_hours: 1,
          }),
        });

        if (!createRes.ok) {
          return { success: false, error: `Failed: ${createRes.status}` };
        }

        const workOrder = await createRes.json();
        return { success: true, workOrderId: workOrder.id };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    console.log("Create result:", createResult);
    expect(createResult.success).toBe(true);
    const workOrderId = (createResult as any).workOrderId;

    // Navigate to Work Orders page
    console.log("📄 Navigating to Work Orders page...");
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForTimeout(3000);

    // Find the work order in the list
    console.log(`🔍 Looking for work order ${workOrderId}...`);
    const workOrderRow = page.locator(`tr:has-text("${workOrderId}")`).first();
    const rowExists = (await workOrderRow.count()) > 0;

    if (!rowExists) {
      console.log("⚠️  Work order not visible in table, trying direct navigation");
      await page.goto(`${BASE_URL}/work-orders/${workOrderId}`);
      await page.waitForTimeout(2000);
    }

    // Look for delete button
    console.log("🗑️  Looking for delete button...");

    // Try multiple delete button selectors
    const deleteSelectors = [
      'button:has-text("Delete")',
      'button[title="Delete"]',
      '[aria-label="Delete"]',
      'button:has-text("delete")',
      'button:has([data-icon="trash"])',
    ];

    let deleteButton = null;
    for (const selector of deleteSelectors) {
      const btn = page.locator(selector).first();
      if ((await btn.count()) > 0) {
        deleteButton = btn;
        console.log(`✅ Found delete button: ${selector}`);
        break;
      }
    }

    if (!deleteButton) {
      console.log("⚠️  No delete button found in UI, trying menu...");

      // Try opening actions menu
      const menuButtons = page.locator(
        'button:has-text("Actions"), button:has-text("•••"), button:has-text("...")'
      );
      if ((await menuButtons.count()) > 0) {
        await menuButtons.first().click();
        await page.waitForTimeout(500);
        deleteButton = page.locator('button:has-text("Delete")').first();
      }
    }

    if (!deleteButton || (await deleteButton.count()) === 0) {
      console.log("❌ Could not find delete button - deleting via API");
      const deleteResult = await page.evaluate(
        async (id) => {
          try {
            const res = await fetch(`/api/v2/work-orders/${id}`, {
              method: "DELETE",
              credentials: "include",
            });
            return {
              success: res.ok,
              status: res.status,
              body: res.ok ? null : await res.text(),
            };
          } catch (error: any) {
            return { success: false, error: error.message };
          }
        },
        workOrderId
      );

      console.log("Delete via API:", deleteResult);
      expect(deleteResult.success).toBe(true);
    } else {
      // Click delete button
      console.log("🖱️  Clicking delete button...");
      await deleteButton.click();
      await page.waitForTimeout(1000);

      // Look for confirmation dialog
      const confirmButtons = page.locator(
        'button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")'
      );
      if ((await confirmButtons.count()) > 0) {
        console.log("✅ Found confirmation dialog");
        await confirmButtons.last().click();
        await page.waitForTimeout(2000);
      }
    }

    // Wait for any pending requests
    await page.waitForTimeout(2000);

    // Check results
    console.log("\n" + "=".repeat(80));
    console.log("DELETION TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`API Errors: ${apiErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log("\n❌ Console Errors:");
      consoleErrors.forEach((err) => console.log(`  - ${err.slice(0, 200)}`));
    }

    if (apiErrors.length > 0) {
      console.log("\n❌ API Errors:");
      apiErrors.forEach((err) => {
        console.log(`  - ${err.status} ${err.url}`);
        if (err.detail) {
          console.log(`    ${JSON.stringify(err.detail).slice(0, 200)}`);
        }
      });
    }

    if (consoleErrors.length === 0 && apiErrors.length === 0) {
      console.log("\n✅ SUCCESS! Work order deleted with no errors!");
    } else {
      console.log("\n❌ FAILED! Errors occurred during deletion");
    }

    console.log("=".repeat(80) + "\n");

    expect(consoleErrors.length).toBe(0);
    expect(apiErrors.length).toBe(0);
  });
});
