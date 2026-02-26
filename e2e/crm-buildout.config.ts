import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "e2e/crm-feature-buildout.spec.ts",
  timeout: 60000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "https://react.ecbtx.com",
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "crm-buildout",
      use: { browserName: "chromium" },
    },
  ],
});
