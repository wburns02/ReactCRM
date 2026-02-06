/**
 * MSW (Mock Service Worker) server configuration.
 *
 * Used for mocking API requests in tests.
 *
 * @module mocks/server
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW server instance for Node.js test environment.
 *
 * @example
 * ```ts
 * // In vitest setup file
 * import { server } from "@/mocks/server";
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 */
export const server = setupServer(...handlers);
