import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DashboardPage extends BasePage {
  readonly statCards: Locator;
  readonly nav: Locator;

  constructor(page: Page) {
    super(page);
    this.statCards = page.locator('[class*="stat"], [class*="card"], [class*="metric"]');
    this.nav = page.locator("nav").first();
  }

  async goto() {
    await super.goto("/dashboard");
  }

  async expectLoaded() {
    await expect(this.nav).toBeVisible({ timeout: 10000 });
    await expect(this.mainContent).toBeVisible({ timeout: 10000 });
  }

  async getStatCards(): Promise<{ text: string }[]> {
    await this.page.waitForTimeout(1000);
    const count = await this.statCards.count();
    const cards: { text: string }[] = [];
    for (let i = 0; i < count; i++) {
      const text = await this.statCards.nth(i).textContent();
      cards.push({ text: text || "" });
    }
    return cards;
  }
}
