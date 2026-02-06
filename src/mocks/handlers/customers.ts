/**
 * Customer API mock handlers.
 *
 * @module mocks/handlers/customers
 */

import { http, HttpResponse } from "msw";
import { createCustomer, createCustomerList } from "../factories/customer";

const API_BASE = import.meta.env.VITE_API_URL || "https://react-crm-api-production.up.railway.app/api/v2";

/**
 * In-memory customer store for tests.
 */
let customers = createCustomerList(10);

/**
 * Reset customer store to initial state.
 */
export function resetCustomerStore() {
  customers = createCustomerList(10);
}

/**
 * Customer API handlers.
 */
export const customerHandlers = [
  // List customers
  http.get(`${API_BASE}/customers`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("page_size") || "20");
    const search = url.searchParams.get("search") || "";

    let filtered = customers;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = customers.filter(
        (c) =>
          c.first_name.toLowerCase().includes(searchLower) ||
          c.last_name.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower)
      );
    }

    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return HttpResponse.json({
      items,
      total: filtered.length,
      page,
      page_size: pageSize,
    });
  }),

  // Get single customer
  http.get(`${API_BASE}/customers/:id`, ({ params }) => {
    const id = parseInt(params.id as string);
    const customer = customers.find((c) => c.id === id);

    if (!customer) {
      return HttpResponse.json(
        {
          type: "https://api.ecbtx.com/problems/res-001",
          title: "Not Found",
          status: 404,
          detail: `Customer with ID ${id} was not found`,
          code: "RES_001",
          timestamp: new Date().toISOString(),
          trace_id: "mock-trace-id",
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(customer);
  }),

  // Create customer
  http.post(`${API_BASE}/customers`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newCustomer = createCustomer({
      id: Math.max(...customers.map((c) => c.id)) + 1,
      ...body,
    });
    customers.push(newCustomer);
    return HttpResponse.json(newCustomer, { status: 201 });
  }),

  // Update customer
  http.patch(`${API_BASE}/customers/:id`, async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const body = await request.json() as Record<string, unknown>;
    const index = customers.findIndex((c) => c.id === id);

    if (index === -1) {
      return HttpResponse.json(
        {
          type: "https://api.ecbtx.com/problems/res-001",
          title: "Not Found",
          status: 404,
          detail: `Customer with ID ${id} was not found`,
          code: "RES_001",
          timestamp: new Date().toISOString(),
          trace_id: "mock-trace-id",
        },
        { status: 404 }
      );
    }

    customers[index] = { ...customers[index], ...body };
    return HttpResponse.json(customers[index]);
  }),

  // Delete customer
  http.delete(`${API_BASE}/customers/:id`, ({ params }) => {
    const id = parseInt(params.id as string);
    const index = customers.findIndex((c) => c.id === id);

    if (index === -1) {
      return HttpResponse.json(
        {
          type: "https://api.ecbtx.com/problems/res-001",
          title: "Not Found",
          status: 404,
          detail: `Customer with ID ${id} was not found`,
          code: "RES_001",
          timestamp: new Date().toISOString(),
          trace_id: "mock-trace-id",
        },
        { status: 404 }
      );
    }

    customers.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
