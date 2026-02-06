/**
 * Invoice test data factory.
 *
 * Generates realistic invoice data for testing.
 *
 * @module mocks/factories/invoice
 */

import { faker } from "@faker-js/faker";

/**
 * Invoice status options.
 */
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

/**
 * Invoice line item.
 */
export interface MockLineItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

/**
 * Invoice data structure matching API response.
 */
export interface MockInvoice {
  id: number;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  work_order_id: number | null;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  line_items: MockLineItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const SERVICE_DESCRIPTIONS = [
  "Septic Tank Pumping",
  "Septic Inspection",
  "Drain Cleaning",
  "Grease Trap Cleaning",
  "Emergency Service Call",
  "System Repair - Labor",
  "System Repair - Parts",
  "Maintenance Service",
];

let invoiceIdCounter = 1;
let lineItemIdCounter = 1;

/**
 * Create a mock line item.
 */
function createLineItem(overrides: Partial<MockLineItem> = {}): MockLineItem {
  const quantity = overrides.quantity ?? faker.number.int({ min: 1, max: 5 });
  const unitPrice = overrides.unit_price ?? faker.number.float({ min: 50, max: 500, multipleOf: 0.01 });
  const total = overrides.total ?? quantity * unitPrice;

  return {
    id: lineItemIdCounter++,
    description: faker.helpers.arrayElement(SERVICE_DESCRIPTIONS),
    quantity,
    unit_price: unitPrice,
    total,
    ...overrides,
  };
}

/**
 * Create a mock invoice with optional overrides.
 *
 * @param overrides - Partial invoice data to override defaults
 * @returns Complete invoice object
 */
export function createInvoice(overrides: Partial<MockInvoice> = {}): MockInvoice {
  const id = overrides.id ?? invoiceIdCounter++;
  const createdAt = faker.date.past().toISOString();
  const status = overrides.status ?? faker.helpers.arrayElement<InvoiceStatus>([
    "draft",
    "sent",
    "paid",
    "overdue",
  ]);

  const lineItems = overrides.line_items ?? [
    createLineItem(),
    ...(faker.datatype.boolean() ? [createLineItem()] : []),
  ];

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 0.0825; // 8.25% tax
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;
  const isPaid = status === "paid";
  const amountPaid = isPaid ? total : 0;

  const customerFirstName = faker.person.firstName();
  const customerLastName = faker.person.lastName();

  const issueDate = faker.date.past();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 30);

  return {
    id,
    invoice_number: `INV-${String(id).padStart(5, "0")}`,
    customer_id: String(faker.number.int({ min: 1, max: 100 })),
    customer_name: `${customerFirstName} ${customerLastName}`,
    work_order_id: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 100 })) ?? null,
    status,
    subtotal: Math.round(subtotal * 100) / 100,
    tax_rate: taxRate,
    tax_amount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    amount_paid: amountPaid,
    balance_due: Math.round((total - amountPaid) * 100) / 100,
    issue_date: issueDate.toISOString().split("T")[0],
    due_date: dueDate.toISOString().split("T")[0],
    paid_at: isPaid ? faker.date.recent().toISOString() : null,
    line_items: lineItems,
    notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

/**
 * Create a list of mock invoices.
 */
export function createInvoiceList(
  count: number,
  overrides: Partial<MockInvoice> = {}
): MockInvoice[] {
  return Array.from({ length: count }, (_, i) =>
    createInvoice({ id: i + 1, ...overrides })
  );
}

/**
 * Reset ID counters.
 */
export function resetInvoiceIdCounter() {
  invoiceIdCounter = 1;
  lineItemIdCounter = 1;
}
