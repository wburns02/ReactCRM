import { test, expect } from "@playwright/test";
import { CustomersPage } from "../CustomersPage";
import { DashboardPage } from "../DashboardPage";
import { WorkOrdersPage } from "../WorkOrdersPage";

test.describe("Page Object smoke tests", () => {
  test("dashboard loads", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    if (await dashboard.isOnLoginPage()) {
      test.skip();
      return;
    }

    await dashboard.expectLoaded();
  });

  test("customers page loads and shows heading", async ({ page }) => {
    const customers = new CustomersPage(page);
    await customers.goto();

    if (await customers.isOnLoginPage()) {
      test.skip();
      return;
    }

    await customers.expectHeading();
    await expect(customers.searchInput).toBeVisible({ timeout: 5000 });
  });

  test("work orders page loads and shows heading", async ({ page }) => {
    const workOrders = new WorkOrdersPage(page);
    await workOrders.goto();

    if (await workOrders.isOnLoginPage()) {
      test.skip();
      return;
    }

    await workOrders.expectHeading();
  });

  test("customers page search input is interactive", async ({ page }) => {
    const customers = new CustomersPage(page);
    await customers.goto();

    if (await customers.isOnLoginPage()) {
      test.skip();
      return;
    }

    await customers.expectHeading();
    await customers.searchFor("test");
    await expect(customers.searchInput).toHaveValue("test");
  });
});
