/**
 * Customer test data factory.
 *
 * Generates realistic customer data for testing.
 *
 * @module mocks/factories/customer
 */

import { faker } from "@faker-js/faker";

/**
 * Customer data structure matching API response.
 */
export interface MockCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  customer_type: "residential" | "commercial";
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

let customerIdCounter = 1;

/**
 * Create a mock customer with optional overrides.
 *
 * @param overrides - Partial customer data to override defaults
 * @returns Complete customer object
 *
 * @example
 * const customer = createCustomer({ first_name: "John" });
 */
export function createCustomer(overrides: Partial<MockCustomer> = {}): MockCustomer {
  const id = overrides.id ?? customerIdCounter++;
  const createdAt = faker.date.past().toISOString();

  return {
    id,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    phone: faker.phone.number({ style: "national" }),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zip_code: faker.location.zipCode(),
    customer_type: faker.helpers.arrayElement(["residential", "commercial"]),
    is_active: faker.datatype.boolean({ probability: 0.9 }),
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) ?? null,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

/**
 * Create a list of mock customers.
 *
 * @param count - Number of customers to create
 * @param overrides - Partial data to apply to all customers
 * @returns Array of customer objects
 */
export function createCustomerList(
  count: number,
  overrides: Partial<MockCustomer> = {}
): MockCustomer[] {
  return Array.from({ length: count }, (_, i) =>
    createCustomer({ id: i + 1, ...overrides })
  );
}

/**
 * Reset the customer ID counter (useful between tests).
 */
export function resetCustomerIdCounter() {
  customerIdCounter = 1;
}
