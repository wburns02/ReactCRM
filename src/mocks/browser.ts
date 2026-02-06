/**
 * MSW browser configuration for development/Storybook.
 *
 * @module mocks/browser
 */

import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/**
 * MSW worker instance for browser environment.
 *
 * @example
 * ```ts
 * // In main.tsx for development
 * if (import.meta.env.DEV) {
 *   const { worker } = await import("@/mocks/browser");
 *   await worker.start();
 * }
 * ```
 */
export const worker = setupWorker(...handlers);
