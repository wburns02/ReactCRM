import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  testMatch: "god-mode.spec.ts",
  timeout: 60_000,
  use: {
    baseURL: "https://react.ecbtx.com",
    headless: true,
  },
});
