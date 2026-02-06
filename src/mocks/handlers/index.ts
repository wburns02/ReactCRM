/**
 * MSW request handlers.
 *
 * Aggregates all API mock handlers for testing.
 *
 * @module mocks/handlers
 */

import { authHandlers } from "./auth";
import { customerHandlers } from "./customers";
import { workOrderHandlers } from "./workOrders";

/**
 * All MSW handlers for API mocking.
 */
export const handlers = [
  ...authHandlers,
  ...customerHandlers,
  ...workOrderHandlers,
];
