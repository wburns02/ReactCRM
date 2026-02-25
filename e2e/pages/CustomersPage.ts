import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class CustomersPage extends BasePage {
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly customerLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder(/search/i);
    this.addButton = page.getByRole("button", { name: /add customer/i });
    this.customerLinks = page.locator('a[href*="/customers/"]');
  }

  async goto() {
    await super.goto("/customers");
  }

  async expectHeading() {
    await expect(
      this.page.getByRole("heading", { name: /customers/i })
    ).toBeVisible({ timeout: 10000 });
  }

  async searchFor(text: string) {
    await this.searchInput.fill(text);
    await this.page.waitForTimeout(500);
  }

  async getRowCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return this.customerLinks.count();
  }

  async clickCustomer(name: string) {
    await this.page.locator(`a[href*="/customers/"]`, { hasText: name }).first().click();
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(1000);
  }

  async clickFirstCustomer() {
    const link = this.customerLinks.first();
    if (await link.isVisible({ timeout: 5000 })) {
      await link.click();
      await this.page.waitForLoadState("domcontentloaded");
      await this.page.waitForTimeout(1000);
      return true;
    }
    return false;
  }

  async getCustomerNames(): Promise<string[]> {
    await this.page.waitForTimeout(500);
    const count = await this.customerLinks.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await this.customerLinks.nth(i).textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }

  async openAddCustomerForm() {
    await this.addButton.click();
    await expect(
      this.page.getByText(/add new customer/i)
    ).toBeVisible({ timeout: 5000 });
  }
}
