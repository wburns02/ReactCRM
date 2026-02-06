/**
 * Work Order API mock handlers.
 *
 * @module mocks/handlers/workOrders
 */

import { http, HttpResponse } from "msw";
import { createWorkOrder, createWorkOrderList, type WorkOrderStatus } from "../factories/workOrder";

const API_BASE = import.meta.env.VITE_API_URL || "https://react-crm-api-production.up.railway.app/api/v2";

/**
 * In-memory work order store for tests.
 */
let workOrders = createWorkOrderList(10);

/**
 * Reset work order store to initial state.
 */
export function resetWorkOrderStore() {
  workOrders = createWorkOrderList(10);
}

/**
 * Work Order API handlers.
 */
export const workOrderHandlers = [
  // List work orders
  http.get(`${API_BASE}/work-orders`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("page_size") || "20");
    const status = url.searchParams.get("status");

    let filtered = workOrders;
    if (status) {
      filtered = workOrders.filter((wo) => wo.status === status);
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

  // Get single work order
  http.get(`${API_BASE}/work-orders/:id`, ({ params }) => {
    const id = parseInt(params.id as string);
    const workOrder = workOrders.find((wo) => wo.id === id);

    if (!workOrder) {
      return HttpResponse.json(
        {
          type: "https://api.ecbtx.com/problems/res-001",
          title: "Not Found",
          status: 404,
          detail: `Work order with ID ${id} was not found`,
          code: "RES_001",
          timestamp: new Date().toISOString(),
          trace_id: "mock-trace-id",
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(workOrder);
  }),

  // Create work order
  http.post(`${API_BASE}/work-orders`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newWorkOrder = createWorkOrder({
      id: Math.max(...workOrders.map((wo) => wo.id)) + 1,
      ...body,
    });
    workOrders.push(newWorkOrder);
    return HttpResponse.json(newWorkOrder, { status: 201 });
  }),

  // Update work order
  http.patch(`${API_BASE}/work-orders/:id`, async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const body = await request.json() as Record<string, unknown>;
    const index = workOrders.findIndex((wo) => wo.id === id);

    if (index === -1) {
      return HttpResponse.json(
        {
          type: "https://api.ecbtx.com/problems/res-001",
          title: "Not Found",
          status: 404,
          detail: `Work order with ID ${id} was not found`,
          code: "RES_001",
          timestamp: new Date().toISOString(),
          trace_id: "mock-trace-id",
        },
        { status: 404 }
      );
    }

    workOrders[index] = { ...workOrders[index], ...body };
    return HttpResponse.json(workOrders[index]);
  }),

  // Update work order status
  http.patch(`${API_BASE}/work-orders/:id/status`, async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const body = await request.json() as { status: WorkOrderStatus };
    const index = workOrders.findIndex((wo) => wo.id === id);

    if (index === -1) {
      return HttpResponse.json(
        {
          type: "https://api.ecbtx.com/problems/res-001",
          title: "Not Found",
          status: 404,
          detail: `Work order with ID ${id} was not found`,
          code: "RES_001",
          timestamp: new Date().toISOString(),
          trace_id: "mock-trace-id",
        },
        { status: 404 }
      );
    }

    workOrders[index].status = body.status;
    return HttpResponse.json(workOrders[index]);
  }),
];
