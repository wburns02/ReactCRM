import { test, expect } from "@playwright/test";

/**
 * Work Order Deletion Test - Fresh Login
 * Logs in fresh and immediately tests deletion to avoid session expiration
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Work Order Deletion (Fresh Login)", () => {
  test("delete work order immediately after login", async ({ page }) => {
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

    // Capture DELETE API errors
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

    // Login
    console.log("🔐 Logging in fresh...");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    console.log("✅ Logged in successfully");

    // IMMEDIATELY get work orders (before session expires)
    console.log("🔍 Fetching draft work orders...");
    const workOrdersResult = await page.evaluate(async () => {
      try {
        const res = await fetch("/api/v2/work-orders?status=draft&page_size=5", {
          credentials: "include",
        });

        if (!res.ok) {
          return { success: false, error: `Status ${res.status}`, statusCode: res.status };
        }

        const data = await res.json();
        return {
          success: true,
          workOrders: data.items || [],
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    if (!workOrdersResult.success) {
      console.log("❌ Failed to fetch work orders:", workOrdersResult);
      throw new Error(`Failed to fetch work orders: ${JSON.stringify(workOrdersResult)}`);
    }

    let workOrders = (workOrdersResult as any).workOrders;
    console.log(`Found ${workOrders.length} draft work orders`);

    // Create one if needed
    if (workOrders.length === 0) {
      console.log("📝 Creating test work order...");
      const createResult = await page.evaluate(async () => {
        try {
          const customersRes = await fetch("/api/v2/customers?page_size=1", {
            credentials: "include",
          });
          if (!customersRes.ok) return { success: false, error: "Customers fetch failed" };

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
            const body = await createRes.text();
            return { success: false, error: `Create failed: ${createRes.status} - ${body}` };
          }

          const wo = await createRes.json();
          return { success: true, workOrder: wo };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });

      if (!createResult.success) {
        console.log("❌ Failed to create work order:", createResult);
        throw new Error(`Failed to create work order: ${JSON.stringify(createResult)}`);
      }

      workOrders = [(createResult as any).workOrder];
      console.log(`✅ Created work order: ${workOrders[0].id}`);
    }

    const workOrderId = workOrders[0].id;

    // IMMEDIATELY delete (no delays to avoid session expiration)
    console.log(`🗑️  Deleting work order: ${workOrderId}`);
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
              body = "(could not read body)";
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

    // Small delay for console errors to be captured
    await page.waitForTimeout(500);

    // Results
    console.log("\n" + "=".repeat(80));
    console.log("WORK ORDER DELETION TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`Work Order ID: ${workOrderId}`);
    console.log(`Delete HTTP Status: ${deleteResult.status}`);
    console.log(`Delete Success: ${deleteResult.success}`);

    if (deleteResult.body) {
      console.log(`\nDelete Response Body:`);
      console.log(deleteResult.body);
    }

    console.log(`\nConsole Errors: ${consoleErrors.length}`);
    console.log(`DELETE API Errors: ${deleteApiErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log("\n❌ Console Errors:");
      consoleErrors.forEach((err) => console.log(`  - ${err}`));
    }

    if (deleteApiErrors.length > 0) {
      console.log("\n❌ DELETE API Errors:");
      deleteApiErrors.forEach((err) => {
        console.log(`  - ${err.status} ${err.url}`);
        if (err.detail) {
          console.log(`    Detail: ${JSON.stringify(err.detail)}`);
        }
      });
    }

    const allGood = deleteResult.success && consoleErrors.length === 0 && deleteApiErrors.length === 0;

    if (allGood) {
      console.log("\n✅ SUCCESS! Work order deleted without any errors!");
    } else {
      console.log("\n❌ FAILED!");
      if (!deleteResult.success) {
        console.log(`   - DELETE returned ${deleteResult.status} (expected 204)`);
      }
      if (consoleErrors.length > 0) {
        console.log(`   - ${consoleErrors.length} console errors detected`);
      }
      if (deleteApiErrors.length > 0) {
        console.log(`   - ${deleteApiErrors.length} DELETE API errors detected`);
      }
    }

    console.log("=".repeat(80) + "\n");

    // Assertions
    expect(deleteResult.status, `Expected 204, got ${deleteResult.status}. Body: ${deleteResult.body}`).toBe(204);
    expect(consoleErrors, `Console errors: ${consoleErrors.join(", ")}`).toHaveLength(0);
    expect(deleteApiErrors, `DELETE API errors: ${JSON.stringify(deleteApiErrors)}`).toHaveLength(0);
  });
});
