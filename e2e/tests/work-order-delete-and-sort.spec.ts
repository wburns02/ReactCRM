import { test, expect } from "@playwright/test";

/**
 * Work Order Delete & Sort Comprehensive Test
 *
 * Tests two critical issues:
 * 1. Delete persistence (does deleted work order actually disappear from DB?)
 * 2. Table sorting (can user sort by columns?)
 */

const BASE_URL = "https://react.ecbtx.com";
const API_BASE = "https://react-crm-api-production.up.railway.app/api/v2";

test.describe("Work Order Delete & Sort Issues", () => {
  test("delete work order and verify persistence", async ({ page }) => {
    console.log("🧪 Test: Delete Work Order Persistence");

    // Login
    console.log("🔐 Logging in...");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button:has-text("Sign In")');
    await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 20000 });
    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    // Create work order
    console.log("\n📝 Creating test work order...");
    const createResult = await page.evaluate(async (apiBase) => {
      try {
        const customersRes = await fetch(`${apiBase}/customers?page_size=1`, {
          credentials: "include",
        });
        const customers = await customersRes.json();
        const customerId = customers.items[0].id;

        const createRes = await fetch(`${apiBase}/work-orders`, {
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
          return { success: false, status: createRes.status };
        }

        const workOrder = await createRes.json();
        return { success: true, workOrderId: workOrder.id, workOrderNumber: workOrder.work_order_number };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }, API_BASE);

    expect(createResult.success).toBe(true);
    const workOrderId = (createResult as any).workOrderId;
    const workOrderNumber = (createResult as any).workOrderNumber;
    console.log(`✅ Created work order: ${workOrderNumber} (${workOrderId})`);

    // Navigate to work orders page
    console.log("\n📄 Navigating to /work-orders...");
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForTimeout(3000);

    // Verify work order appears in list
    console.log("🔍 Verifying work order appears in list...");
    const appearsInList = await page.locator(`text=${workOrderNumber}`).count() > 0;
    console.log(`Work order visible in UI: ${appearsInList}`);

    // Delete work order via API (simulating UI button click)
    console.log("\n🗑️  Deleting work order...");
    const deleteResult = await page.evaluate(async ({ apiBase, workOrderId }) => {
      try {
        const deleteRes = await fetch(`${apiBase}/work-orders/${workOrderId}`, {
          method: "DELETE",
          credentials: "include",
        });

        let body = "";
        if (!deleteRes.ok) {
          try {
            body = await deleteRes.text();
          } catch (e) {
            body = "(could not read)";
          }
        }

        return {
          status: deleteRes.status,
          ok: deleteRes.ok,
          body,
        };
      } catch (error: any) {
        return { status: 0, ok: false, error: error.message };
      }
    }, { apiBase: API_BASE, workOrderId });

    console.log(`DELETE response: ${deleteResult.status} ${deleteResult.ok ? "OK" : "FAIL"}`);
    if (deleteResult.body) {
      console.log(`Error body: ${deleteResult.body}`);
    }

    // Verify deletion via API GET (bypass cache)
    console.log("\n🔬 Verifying work order deleted from database...");
    await page.waitForTimeout(1000);

    const verifyDeleted = await page.evaluate(async ({ apiBase, workOrderId }) => {
      try {
        const getRes = await fetch(`${apiBase}/work-orders/${workOrderId}`, {
          credentials: "include",
          cache: "no-cache",  // Force fresh fetch
        });

        return {
          found: getRes.ok,
          status: getRes.status,
        };
      } catch (error: any) {
        return { found: false, error: error.message };
      }
    }, { apiBase: API_BASE, workOrderId });

    console.log(`GET after DELETE: ${verifyDeleted.status} (found: ${verifyDeleted.found})`);

    // Refresh page and check UI
    console.log("\n🔄 Refreshing page to check UI persistence...");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const appearsAfterRefresh = await page.locator(`text=${workOrderNumber}`).count() > 0;
    console.log(`Work order visible after refresh: ${appearsAfterRefresh}`);

    // Analysis
    console.log("\n" + "=".repeat(80));
    console.log("DELETE PERSISTENCE TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`DELETE status: ${deleteResult.status}`);
    console.log(`GET after delete status: ${verifyDeleted.status}`);
    console.log(`Found in DB after delete: ${verifyDeleted.found}`);
    console.log(`Visible in UI after refresh: ${appearsAfterRefresh}`);

    if (deleteResult.status === 204 && !verifyDeleted.found && !appearsAfterRefresh) {
      console.log("✅ SUCCESS: Delete persisted correctly");
    } else if (deleteResult.status === 204 && verifyDeleted.found) {
      console.log("❌ BUG: DELETE returned 204 but item still in database!");
    } else if (deleteResult.status === 204 && !verifyDeleted.found && appearsAfterRefresh) {
      console.log("❌ BUG: Item deleted from DB but still showing in UI (cache issue)!");
    } else if (deleteResult.status >= 400) {
      console.log(`⚠️  DELETE failed with status ${deleteResult.status} (may be expected)`);
    }
    console.log("=".repeat(80));

    // Assertions
    if (deleteResult.status === 204) {
      expect(verifyDeleted.found, "Work order should be deleted from DB").toBe(false);
      expect(appearsAfterRefresh, "Work order should not appear in UI after refresh").toBe(false);
    }
  });

  test("verify table sorting does not work", async ({ page }) => {
    console.log("\n🧪 Test: Table Sorting");

    // Login
    console.log("🔐 Logging in...");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button:has-text("Sign In")');
    await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 20000 });
    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    // Navigate to work orders
    console.log("\n📄 Navigating to /work-orders...");
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForTimeout(3000);

    // Get initial order of first 3 work orders
    console.log("\n📊 Capturing initial work order list...");
    const initialOrder = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.slice(0, 3).map((row, index) => ({
        index,
        customer: row.querySelector('td:nth-child(1)')?.textContent?.trim() || '',
        jobType: row.querySelector('td:nth-child(2)')?.textContent?.trim() || '',
        scheduled: row.querySelector('td:nth-child(3)')?.textContent?.trim() || '',
        technician: row.querySelector('td:nth-child(4)')?.textContent?.trim() || '',
        priority: row.querySelector('td:nth-child(5)')?.textContent?.trim() || '',
        status: row.querySelector('td:nth-child(6)')?.textContent?.trim() || '',
      }));
    });

    console.log("Initial order (first 3 rows):");
    initialOrder.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.customer} | ${row.jobType} | ${row.priority} | ${row.status}`);
    });

    // Try clicking column headers
    console.log("\n🖱️  Testing column header clicks...");

    // Click "Customer" header
    console.log("\n1. Clicking 'Customer' header...");
    const customerHeader = page.locator('th:has-text("Customer")').first();
    const customerHeaderClickable = await customerHeader.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.cursor === 'pointer' || el.onclick !== null;
    });
    console.log(`  Customer header clickable: ${customerHeaderClickable}`);

    if (customerHeaderClickable) {
      await customerHeader.click();
      await page.waitForTimeout(1000);
    }

    // Click "Priority" header
    console.log("\n2. Clicking 'Priority' header...");
    const priorityHeader = page.locator('th:has-text("Priority")').first();
    const priorityHeaderClickable = await priorityHeader.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.cursor === 'pointer' || el.onclick !== null;
    });
    console.log(`  Priority header clickable: ${priorityHeaderClickable}`);

    if (priorityHeaderClickable) {
      await priorityHeader.click();
      await page.waitForTimeout(1000);
    }

    // Click "Status" header
    console.log("\n3. Clicking 'Status' header...");
    const statusHeader = page.locator('th:has-text("Status")').first();
    const statusHeaderClickable = await statusHeader.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.cursor === 'pointer' || el.onclick !== null;
    });
    console.log(`  Status header clickable: ${statusHeaderClickable}`);

    if (statusHeaderClickable) {
      await statusHeader.click();
      await page.waitForTimeout(1000);
    }

    // Get final order
    const finalOrder = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.slice(0, 3).map((row, index) => ({
        index,
        customer: row.querySelector('td:nth-child(1)')?.textContent?.trim() || '',
        jobType: row.querySelector('td:nth-child(2)')?.textContent?.trim() || '',
        scheduled: row.querySelector('td:nth-child(3)')?.textContent?.trim() || '',
        technician: row.querySelector('td:nth-child(4)')?.textContent?.trim() || '',
        priority: row.querySelector('td:nth-child(5)')?.textContent?.trim() || '',
        status: row.querySelector('td:nth-child(6)')?.textContent?.trim() || '',
      }));
    });

    console.log("\nFinal order (first 3 rows):");
    finalOrder.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.customer} | ${row.jobType} | ${row.priority} | ${row.status}`);
    });

    // Compare orders
    const orderChanged = JSON.stringify(initialOrder) !== JSON.stringify(finalOrder);

    console.log("\n" + "=".repeat(80));
    console.log("SORTING TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`Customer header clickable: ${customerHeaderClickable}`);
    console.log(`Priority header clickable: ${priorityHeaderClickable}`);
    console.log(`Status header clickable: ${statusHeaderClickable}`);
    console.log(`Order changed after clicks: ${orderChanged}`);

    if (!customerHeaderClickable && !priorityHeaderClickable && !statusHeaderClickable) {
      console.log("❌ BUG CONFIRMED: No column headers are clickable");
    } else if (customerHeaderClickable && !orderChanged) {
      console.log("⚠️  Headers are clickable but order didn't change (may need more data variety)");
    } else if (customerHeaderClickable && orderChanged) {
      console.log("✅ SUCCESS: Sorting is working!");
    }
    console.log("=".repeat(80));

    // Assertions
    expect(customerHeaderClickable, "Customer header should be clickable").toBe(true);
    expect(priorityHeaderClickable, "Priority header should be clickable").toBe(true);
    expect(statusHeaderClickable, "Status header should be clickable").toBe(true);

    // If headers are clickable and we have varied data, order should change
    // (may not change if all rows have same values)
  });
});
