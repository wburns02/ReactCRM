import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class WorkOrdersPage extends BasePage {
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly dateInput: Locator;
  readonly workOrderLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder(/search/i);
    this.statusFilter = page.locator('select, [role="combobox"]').first();
    this.dateInput = page.locator('input[type="date"]').first();
    this.workOrderLinks = page.locator('a[href*="/work-orders/"]');
  }

  async goto() {
    await super.goto("/work-orders");
  }

  async expectHeading() {
    await expect(
      this.page.getByRole("heading", { name: "Work Orders", level: 1 })
    ).toBeVisible({ timeout: 10000 });
  }

  async searchFor(text: string) {
    await this.searchInput.fill(text);
    await this.page.waitForTimeout(500);
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption({ label: status });
    await this.page.waitForTimeout(500);
  }

  async getRowCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return this.workOrderLinks.count();
  }

  async clickWorkOrder(idOrText: string) {
    await this.page
      .locator('a[href*="/work-orders/"]', { hasText: idOrText })
      .first()
      .click();
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(1000);
  }

  async clickFirstWorkOrder(): Promise<boolean> {
    const link = this.workOrderLinks.first();
    if (await link.isVisible({ timeout: 5000 })) {
      await link.click();
      await this.page.waitForLoadState("domcontentloaded");
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }
}
