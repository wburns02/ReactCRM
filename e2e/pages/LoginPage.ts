import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto("/login");
  }

  async login(
    email: string = "test@macseptic.com",
    password: string = "TestPassword123"
  ) {
    await this.page.fill(
      'input[name="email"], input[type="email"]',
      email
    );
    await this.page.fill('input[name="password"], input[type="password"]', password);
    await this.page.getByRole("button", { name: "Sign In" }).click();
  }

  async expectLoggedIn() {
    await this.page.waitForFunction(
      () => !location.href.includes("/login"),
      { timeout: 15000 }
    );
  }

  async loginAndWait(email?: string, password?: string) {
    await this.goto();
    await expect(
      this.page.getByRole("button", { name: "Sign In" })
    ).toBeVisible({ timeout: 10000 });
    await this.login(email, password);
    await this.expectLoggedIn();
    await this.page.waitForTimeout(2000);
  }
}
