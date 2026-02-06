import { test, expect } from "@playwright/test";

/**
 * Work Order Deletion Test - Uses Existing Work Order
 * Tests deletion of the first draft work order found in the system
 */

const BASE_URL = "https://react.ecbtx.com";

test.use({ storageState: ".auth/user.json" });

test.describe("Work Order Deletion (Existing)", () => {
  test("delete existing draft work order without errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const deleteApiErrors: { url: string; status: number; detail?: any }[] = [];

    // Capture console errors (filter known issues)
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !text.includes("favicon") &&
          !text.includes("Sentry") &&
          !text.includes("ResizeObserver") &&
          !text.includes("API Schema Violation") &&
          !text.includes("Failed to load resource")
        ) {
          consoleErrors.push(text);
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

        deleteApiErrors.push({
          url: res.url(),
          status: res.status(),
          detail,
        });
      }
    });

    console.log("📄 Navigating to Work Orders...");
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForTimeout(3000);

    // Find existing draft work orders
    console.log("🔍 Looking for draft work orders...");
    const workOrdersResult = await page.evaluate(async () => {
      try {
        const res = await fetch("/api/v2/work-orders?status=draft&page_size=5", {
          credentials: "include",
        });

        if (!res.ok) {
          return { success: false, error: `API returned ${res.status}` };
        }

        const data = await res.json();
        return {
          success: true,
          workOrders: data.items || [],
          total: data.total || 0,
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    console.log("Work orders fetch result:", workOrdersResult);

    if (!workOrdersResult.success) {
      console.log("⚠️  Could not fetch work orders:", (workOrdersResult as any).error);
      test.skip();
      return;
    }

    const workOrders = (workOrdersResult as any).workOrders;
    const total = (workOrdersResult as any).total;

    console.log(`Found ${total} draft work orders`);

    if (workOrders.length === 0) {
      console.log("⚠️  No draft work orders found to delete");
      console.log("   Creating a new one for testing...");

      // Create one via API
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
            return { success: false, error: `Create failed: ${createRes.status}` };
          }

          const wo = await createRes.json();
          return { success: true, workOrder: wo };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });

      if (!createResult.success) {
        console.log("❌ Could not create test work order:", (createResult as any).error);
        console.log("   Test cannot proceed - skipping");
        test.skip();
        return;
      }

      workOrders.push((createResult as any).workOrder);
      console.log(`✅ Created work order: ${(createResult as any).workOrder.id}`);
    }

    const workOrderToDelete = workOrders[0];
    const workOrderId = workOrderToDelete.id;

    console.log(`\n🗑️  Deleting work order: ${workOrderId}`);

    // Delete via API
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

    // Wait for pending operations
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
      console.log(deleteResult.body);
    }

    console.log(`\nConsole Errors (filtered): ${consoleErrors.length}`);
    console.log(`API DELETE Errors: ${deleteApiErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log("\n❌ Console Errors:");
      consoleErrors.forEach((err) => console.log(`  - ${err.slice(0, 300)}`));
    }

    if (deleteApiErrors.length > 0) {
      console.log("\n❌ API DELETE Errors:");
      deleteApiErrors.forEach((err) => {
        console.log(`  - ${err.status} ${err.url}`);
        if (err.detail) {
          console.log(`    Detail: ${JSON.stringify(err.detail)}`);
        }
      });
    }

    if (deleteResult.success && consoleErrors.length === 0 && deleteApiErrors.length === 0) {
      console.log("\n✅ SUCCESS! Work order deleted without errors!");
    } else {
      console.log("\n❌ FAILED!");
      if (!deleteResult.success) {
        console.log(`   - DELETE returned status ${deleteResult.status} (expected 204)`);
      }
      if (consoleErrors.length > 0) {
        console.log(`   - ${consoleErrors.length} console errors`);
      }
      if (deleteApiErrors.length > 0) {
        console.log(`   - ${deleteApiErrors.length} DELETE API errors`);
      }
    }

    console.log("=".repeat(80) + "\n");

    // Assertions
    expect(deleteResult.status, `DELETE should return 204, got ${deleteResult.status}. Body: ${deleteResult.body}`).toBe(204);
    expect(consoleErrors, `Console errors found: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(deleteApiErrors, `DELETE API errors found: ${JSON.stringify(deleteApiErrors)}`).toHaveLength(0);
  });
});
