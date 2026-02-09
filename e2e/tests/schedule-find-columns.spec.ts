import { test } from "@playwright/test";

/**
 * Find which columns correspond to Feb 6 and Feb 8
 * Try dragging to each column and see what date is returned
 */

const BASE_URL = "https://react.ecbtx.com";
const API_BASE = "https://react-crm-api-production.up.railway.app/api/v2";

async function dragUnscheduledToColumn(page: any, columnIndex: number) {
  const source = page.locator('[data-testid="unscheduled-drop-zone"] table tbody tr').first();
  const target = page.locator(`.grid-cols-7 > div:nth-child(${columnIndex})`).first();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("Element not found");
  }

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  await page.evaluate(
    ({ sourceX, sourceY, targetX, targetY }) => {
      const sourceEl = document.querySelector('[data-testid="unscheduled-drop-zone"] table tbody tr');
      if (!sourceEl) throw new Error("Source not found");

      sourceEl.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: sourceX,
          clientY: sourceY,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: 1,
        })
      );

      setTimeout(() => {
        document.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: sourceX + 15,
            clientY: sourceY,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            buttons: 1,
          })
        );

        setTimeout(() => {
          document.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: targetX,
              clientY: targetY,
              pointerId: 1,
              pointerType: "mouse",
              isPrimary: true,
              button: 0,
              buttons: 1,
            })
          );

          setTimeout(() => {
            document.dispatchEvent(
              new PointerEvent("pointerup", {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: targetX,
                clientY: targetY,
                pointerId: 1,
                pointerType: "mouse",
                isPrimary: true,
                button: 0,
                buttons: 0,
              })
            );
          }, 100);
        }, 200);
      }, 100);
    },
    { sourceX, sourceY, targetX, targetY }
  );

  await page.waitForTimeout(2000);
}

test("Find columns for Feb 6 and Feb 8", async ({ page }) => {
  console.log("\n" + "=".repeat(80));
  console.log("FIND COLUMNS FOR FRIDAY FEB 6 & SUNDAY FEB 8");
  console.log("=".repeat(80) + "\n");

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/(dashboard|onboarding|prospects|schedule)/, { timeout: 15000 });

  await page.evaluate(() => {
    localStorage.setItem("crm_onboarding_completed", "true");
  });

  // Create 7 unscheduled work orders (one for each column test)
  console.log("Creating 7 test work orders...\n");
  const workOrderIds = await page.evaluate(async (apiBase) => {
    const customersRes = await fetch(`${apiBase}/customers/?page=1&page_size=1`, {
      credentials: "include",
    });
    const customersData = await customersRes.json();
    const customerId = customersData.items[0]?.id;

    const ids = [];
    for (let i = 0; i < 7; i++) {
      const res = await fetch(`${apiBase}/work-orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_id: customerId,
          job_type: "pumping",
          status: "draft",
          priority: "normal",
          estimated_duration_hours: 1,
          notes: `Column test ${i + 1}`,
        }),
      });
      const data = await res.json();
      ids.push(data.id);
    }
    return ids;
  }, API_BASE);

  console.log(`✓ Created ${workOrderIds.length} work orders\n`);

  // Go to schedule
  await page.goto(`${BASE_URL}/schedule`);
  await page.waitForTimeout(3000);

  // Track API responses
  const results: { column: number; date: string }[] = [];

  page.on("response", async (res) => {
    if (res.url().includes("/work-orders/") && res.request().method() === "PATCH") {
      try {
        const body = await res.json();
        if (body.scheduled_date) {
          results.push({ column: results.length + 1, date: body.scheduled_date });
        }
      } catch (e) {
        // Ignore
      }
    }
  });

  // Try each column
  console.log("Testing each column...\n");
  for (let col = 1; col <= 7; col++) {
    console.log(`   Dragging to column ${col}...`);
    await dragUnscheduledToColumn(page, col);
    await page.waitForTimeout(2000);
  }

  // Print results
  console.log("\n" + "=".repeat(80));
  console.log("RESULTS: Column → Date Mapping");
  console.log("=".repeat(80) + "\n");

  const columnMap: Record<number, string> = {};
  results.forEach((r) => {
    columnMap[r.column] = r.date;
    const dayName = new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    console.log(`   Column ${r.column} → ${r.date} (${dayName})`);
  });

  // Find Feb 6 and Feb 8
  console.log("\n" + "=".repeat(80));
  let col6 = null, col8 = null;
  for (const [col, date] of Object.entries(columnMap)) {
    if (date === "2026-02-06") {
      col6 = col;
      console.log(`✅ Friday Feb 6 = Column ${col}`);
    }
    if (date === "2026-02-08") {
      col8 = col;
      console.log(`✅ Sunday Feb 8 = Column ${col}`);
    }
  }

  if (!col6) console.log("❌ Friday Feb 6 NOT FOUND in any column");
  if (!col8) console.log("❌ Sunday Feb 8 NOT FOUND in any column (might be next week)");

  console.log("=".repeat(80) + "\n");

  // Take screenshot
  await page.screenshot({ path: "/tmp/schedule-columns-mapped.png", fullPage: true });
  console.log("📸 Screenshot: /tmp/schedule-columns-mapped.png\n");
});
