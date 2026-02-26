import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "predictive-service.spec.ts",
  timeout: 60000,
  use: {
    baseURL: "https://react.ecbtx.com",
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
