import { Page, Locator, expect } from "@playwright/test";

const NOISE_PATTERNS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "WebSocket",
  "third-party",
  "server responded with a status of",
];

export class BasePage {
  readonly page: Page;
  readonly mainContent: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainContent = page.locator("main").first();
    this.heading = page.getByRole("heading", { level: 1 }).first();
  }

  async goto(path: string) {
    await this.page.goto(path, { waitUntil: "domcontentloaded" });
    await this.page.waitForTimeout(1500);
  }

  async getHeadingText(): Promise<string> {
    return (await this.heading.textContent()) || "";
  }

  async expectLoaded() {
    await expect(this.mainContent).toBeVisible({ timeout: 10000 });
  }

  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes("/login");
  }

  async skipIfNotAuthenticated(test: { skip: () => void }) {
    if (await this.isOnLoginPage()) {
      test.skip();
    }
  }

  /**
   * Start capturing console errors. Call this BEFORE navigating.
   * Returns a function that, when called, returns captured errors (filtered).
   */
  captureConsoleErrors(): () => string[] {
    const errors: string[] = [];
    this.page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        !NOISE_PATTERNS.some((n) => msg.text().includes(n))
      ) {
        errors.push(msg.text());
      }
    });
    return () => errors;
  }
}
