/**
 * Test setup file for Vitest
 *
 * Configures the testing environment for React and React Testing Library.
 */

import "@testing-library/jest-dom/vitest";

// Mock import.meta.env for tests
Object.defineProperty(import.meta, "env", {
  value: {
    DEV: true,
    PROD: false,
    MODE: "test",
    VITE_API_URL: "http://localhost:5001/api/v2",
  },
  writable: true,
});

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  // Filter out known warnings that don't affect tests
  const message = args[0];
  if (typeof message === "string") {
    if (message.includes("validation failed")) return;
  }
  originalWarn.apply(console, args);
};
