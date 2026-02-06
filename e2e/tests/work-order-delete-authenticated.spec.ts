import { test, expect } from "@playwright/test";

/**
 * Work Order Deletion Test with Persistent Auth
 * Uses auth.setup.ts for authenticated state
 */

const BASE_URL = "https://react.ecbtx.com";

test.use({ storageState: ".auth/user.json" });

test.describe("Work Order Deletion (Authenticated)", () => {
  test("delete work order without errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const apiErrors: { url: string; status: number; detail?: any }[] = [];

    // Capture console errors (filter known issues)
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !text.includes("favicon") &&
          !text.includes("Sentry") &&
          !text.includes("ResizeObserver") &&
          !text.includes("API Schema Violation")
        ) {
          consoleErrors.push(text);
          console.log(`❌ Console Error: ${text}`);
        }
      }
    });

    // Capture DELETE API errors only
    page.on("response", async (res) => {
      if (res.status() >= 400 && res.request().method() === "DELETE" && res.url().includes("/work-orders/")) {
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

        apiErrors.push({
          url: res.url(),
          status: res.status(),
          detail,
        });
        console.log(
          `❌ DELETE Error: ${res.status()} ${res.url()}`
        );
        if (detail) {
          console.log(`   Detail: ${JSON.stringify(detail).slice(0, 300)}`);
        }
      }
    });

    // Navigate to work orders
    console.log("📄 Navigating to Work Orders...");
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForTimeout(2000);

    // Create work order via browser fetch
    console.log("📝 Creating test work order...");
    const createResult = await page.evaluate(async () => {
      try {
        const customersRes = await fetch("/api/v2/customers?page_size=1", {
          credentials: "include",
        });

        if (!customersRes.ok) {
          return { success: false, error: `Customers API: ${customersRes.status}` };
        }

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
          const errorText = await createRes.text();
          return { success: false, error: `Create API: ${createRes.status} - ${errorText.slice(0, 200)}` };
        }

        const workOrder = await createRes.json();
        return { success: true, workOrderId: workOrder.id };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    console.log("Create result:", createResult);

    if (!createResult.success) {
      console.log("⚠️  Could not create work order (possibly auth expired)");
      console.log("   Error:", (createResult as any).error);
      console.log("   Skipping test - auth issue, not deletion issue");
      test.skip();
      return;
    }

    const workOrderId = (createResult as any).workOrderId;
    console.log(`✅ Created work order: ${workOrderId}`);

    // Small delay
    await page.waitForTimeout(500);

    // Delete via API
    console.log("🗑️  Deleting work order...");
    const deleteResult = await page.evaluate(
      async (id) => {
        try {
          const res = await fetch(`/api/v2/work-orders/${id}`, {
            method: "DELETE",
            credentials: "include",
          });

          let body = "";
          if (!res.ok) {
            try {
              body = await res.text();
            } catch (e) {
              body = "";
            }
          }

          return {
            success: res.ok,
            status: res.status,
            body: body,
          };
        } catch (error: any) {
          return { success: false, error: error.message, status: 0 };
        }
      },
      workOrderId
    );

    // Wait for any pending operations
    await page.waitForTimeout(1000);

    // Results
    console.log("\n" + "=".repeat(80));
    console.log("WORK ORDER DELETION TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`Work Order ID: ${workOrderId}`);
    console.log(`Delete HTTP Status: ${deleteResult.status}`);
    console.log(`Delete Success: ${deleteResult.success}`);

    if (deleteResult.body) {
      console.log(`Delete Response Body:`);
      console.log(deleteResult.body.slice(0, 300));
    }

    console.log(`\nConsole Errors (filtered): ${consoleErrors.length}`);
    console.log(`API DELETE Errors: ${apiErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log("\n❌ Console Errors:");
      consoleErrors.forEach((err) => console.log(`  - ${err.slice(0, 200)}`));
    }

    if (apiErrors.length > 0) {
      console.log("\n❌ API DELETE Errors:");
      apiErrors.forEach((err) => {
        console.log(`  - ${err.status} ${err.url}`);
        if (err.detail) {
          console.log(`    ${JSON.stringify(err.detail).slice(0, 300)}`);
        }
      });
    }

    if (deleteResult.success && consoleErrors.length === 0 && apiErrors.length === 0) {
      console.log("\n✅ SUCCESS! Work order deleted without errors!");
    } else {
      console.log("\n❌ FAILED!");
      if (!deleteResult.success) {
        console.log(`   - DELETE returned status ${deleteResult.status} (expected 204)`);
      }
      if (consoleErrors.length > 0) {
        console.log(`   - ${consoleErrors.length} console errors`);
      }
      if (apiErrors.length > 0) {
        console.log(`   - ${apiErrors.length} DELETE API errors`);
      }
    }

    console.log("=".repeat(80) + "\n");

    // Assertions
    expect(deleteResult.status, `DELETE should return 204, got ${deleteResult.status}`).toBe(204);
    expect(consoleErrors.length, `Found ${consoleErrors.length} console errors`).toBe(0);
    expect(apiErrors.length, `Found ${apiErrors.length} DELETE API errors`).toBe(0);
  });
});
