/**
 * Work Order test data factory.
 *
 * Generates realistic work order data for testing.
 *
 * @module mocks/factories/workOrder
 */

import { faker } from "@faker-js/faker";

/**
 * Work order status options.
 */
export type WorkOrderStatus =
  | "pending"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

/**
 * Work order priority options.
 */
export type WorkOrderPriority = "low" | "normal" | "high" | "urgent";

/**
 * Work order data structure matching API response.
 */
export interface MockWorkOrder {
  id: number;
  customer_id: string;
  customer_name: string;
  technician_id: number | null;
  technician_name: string | null;
  title: string;
  description: string;
  service_type: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  scheduled_date: string | null;
  scheduled_time: string | null;
  completed_at: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string | null;
  estimated_duration: number;
  actual_duration: number | null;
  created_at: string;
  updated_at: string;
}

const SERVICE_TYPES = [
  "Septic Pumping",
  "Septic Inspection",
  "Drain Cleaning",
  "Grease Trap Service",
  "System Repair",
  "New Installation",
  "Maintenance",
];

let workOrderIdCounter = 1;

/**
 * Create a mock work order with optional overrides.
 *
 * @param overrides - Partial work order data to override defaults
 * @returns Complete work order object
 *
 * @example
 * const workOrder = createWorkOrder({ status: "completed" });
 */
export function createWorkOrder(overrides: Partial<MockWorkOrder> = {}): MockWorkOrder {
  const id = overrides.id ?? workOrderIdCounter++;
  const createdAt = faker.date.past().toISOString();
  const status = overrides.status ?? faker.helpers.arrayElement<WorkOrderStatus>([
    "pending",
    "scheduled",
    "in_progress",
    "completed",
  ]);

  const hasTechnician = status !== "pending";
  const isCompleted = status === "completed";
  const isScheduled = ["scheduled", "in_progress", "completed"].includes(status);

  const customerFirstName = faker.person.firstName();
  const customerLastName = faker.person.lastName();
  const technicianFirstName = faker.person.firstName();
  const technicianLastName = faker.person.lastName();

  return {
    id,
    customer_id: String(faker.number.int({ min: 1, max: 100 })),
    customer_name: `${customerFirstName} ${customerLastName}`,
    technician_id: hasTechnician ? faker.number.int({ min: 1, max: 20 }) : null,
    technician_name: hasTechnician ? `${technicianFirstName} ${technicianLastName}` : null,
    title: faker.helpers.arrayElement(SERVICE_TYPES),
    description: faker.lorem.sentence(),
    service_type: faker.helpers.arrayElement(SERVICE_TYPES),
    status,
    priority: faker.helpers.arrayElement<WorkOrderPriority>([
      "low",
      "normal",
      "high",
      "urgent",
    ]),
    scheduled_date: isScheduled ? faker.date.soon({ days: 14 }).toISOString().split("T")[0] : null,
    scheduled_time: isScheduled ? faker.helpers.arrayElement(["08:00", "10:00", "13:00", "15:00"]) : null,
    completed_at: isCompleted ? faker.date.recent().toISOString() : null,
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zip_code: faker.location.zipCode(),
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }) ?? null,
    estimated_duration: faker.helpers.arrayElement([30, 60, 90, 120, 180]),
    actual_duration: isCompleted ? faker.number.int({ min: 30, max: 240 }) : null,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

/**
 * Create a list of mock work orders.
 *
 * @param count - Number of work orders to create
 * @param overrides - Partial data to apply to all work orders
 * @returns Array of work order objects
 */
export function createWorkOrderList(
  count: number,
  overrides: Partial<MockWorkOrder> = {}
): MockWorkOrder[] {
  return Array.from({ length: count }, (_, i) =>
    createWorkOrder({ id: i + 1, ...overrides })
  );
}

/**
 * Reset the work order ID counter (useful between tests).
 */
export function resetWorkOrderIdCounter() {
  workOrderIdCounter = 1;
}
