# CRM Public API Documentation

**Base URL:** `https://react-crm-api-production.up.railway.app/api/v2`

**API Version:** 2.0

## Authentication

All API requests require authentication using either:

### Bearer Token (JWT)

```bash
curl -H "Authorization: Bearer <your-jwt-token>" https://api.example.com/api/v2/customers
```

### OAuth 2.0 Client Credentials

For third-party integrations, use OAuth 2.0 client credentials flow:

```bash
# Get access token
curl -X POST https://api.example.com/api/v2/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=<id>&client_secret=<secret>"

# Use token in requests
curl -H "Authorization: Bearer <access-token>" https://api.example.com/api/v2/customers
```

---

## Customers

### List Customers

```http
GET /customers/
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number (default: 1) |
| page_size | integer | Items per page (default: 20, max: 100) |
| search | string | Search by name, email, or phone |
| status | string | Filter by status (active, inactive) |

**Response:**
```json
{
  "items": [
    {
      "id": "123",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "512-555-0100",
      "address": "123 Main St",
      "city": "Austin",
      "state": "TX",
      "zip": "78701",
      "status": "active",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20
}
```

### Get Customer

```http
GET /customers/{id}
```

### Create Customer

```http
POST /customers/
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "512-555-0100",
  "address": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "zip": "78701"
}
```

### Update Customer

```http
PATCH /customers/{id}
```

### Delete Customer

```http
DELETE /customers/{id}
```

---

## Work Orders

### List Work Orders

```http
GET /work-orders
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number (default: 1) |
| page_size | integer | Items per page (default: 20, max: 100) |
| status | string | Filter by status (draft, scheduled, in_progress, completed, cancelled) |
| scheduled_date | string | Filter by date (YYYY-MM-DD) |
| customer_id | string | Filter by customer |
| technician_id | string | Filter by assigned technician |

**Response:**
```json
{
  "items": [
    {
      "id": "456",
      "customer_id": "123",
      "status": "scheduled",
      "priority": "normal",
      "service_type": "Pumping",
      "scheduled_date": "2024-01-20",
      "time_window_start": "09:00",
      "assigned_technician": "tech-1",
      "estimated_duration_hours": 2,
      "notes": "Quarterly service",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "page_size": 20
}
```

### Get Work Order

```http
GET /work-orders/{id}
```

### Create Work Order

```http
POST /work-orders
```

**Request Body:**
```json
{
  "customer_id": "123",
  "service_type": "Pumping",
  "priority": "normal",
  "scheduled_date": "2024-01-20",
  "time_window_start": "09:00",
  "notes": "Customer requested morning appointment"
}
```

### Update Work Order

```http
PATCH /work-orders/{id}
```

### Delete Work Order

```http
DELETE /work-orders/{id}
```

---

## Technicians

### List Technicians

```http
GET /technicians/
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| page_size | integer | Items per page |
| search | string | Search by name |
| active_only | boolean | Only show active technicians |

**Response:**
```json
{
  "items": [
    {
      "id": "tech-1",
      "first_name": "Mike",
      "last_name": "Johnson",
      "email": "mike@example.com",
      "phone": "512-555-0101",
      "skills": ["HVAC", "Plumbing", "Septic"],
      "is_active": true,
      "hourly_rate": 45.00
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 20
}
```

---

## Invoices

### List Invoices

```http
GET /invoices/
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| page_size | integer | Items per page |
| status | string | Filter by status (draft, sent, paid, overdue, cancelled) |
| customer_id | string | Filter by customer |

**Response:**
```json
{
  "items": [
    {
      "id": "inv-789",
      "customer_id": "123",
      "work_order_id": "456",
      "status": "paid",
      "subtotal": 250.00,
      "tax": 20.63,
      "total": 270.63,
      "due_date": "2024-02-01",
      "paid_at": "2024-01-25T14:30:00Z",
      "created_at": "2024-01-20T10:00:00Z"
    }
  ],
  "total": 89,
  "page": 1,
  "page_size": 20
}
```

### Create Invoice

```http
POST /invoices/
```

### Send Invoice

```http
POST /invoices/{id}/send
```

### Mark Invoice Paid

```http
POST /invoices/{id}/mark-paid
```

---

## Payments

### List Payments

```http
GET /payments/
```

### Create Payment

```http
POST /payments/
```

**Request Body:**
```json
{
  "invoice_id": "inv-789",
  "amount": 270.63,
  "method": "card",
  "reference": "ch_xxx123"
}
```

---

## Schedule

### Get Schedule

```http
GET /schedule
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| start_date | string | Start of date range (YYYY-MM-DD) |
| end_date | string | End of date range (YYYY-MM-DD) |
| technician_id | string | Filter by technician |

**Response:**
```json
{
  "events": [
    {
      "id": "456",
      "title": "Pumping - John Doe",
      "start": "2024-01-20T09:00:00",
      "end": "2024-01-20T11:00:00",
      "technician_id": "tech-1",
      "work_order_id": "456",
      "color": "#3B82F6"
    }
  ]
}
```

---

## AI Dispatch

### Get Suggestions

```http
GET /ai/dispatch/suggestions
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| date | string | Date for suggestions (YYYY-MM-DD) |
| limit | integer | Max suggestions to return |

**Response:**
```json
{
  "suggestions": [
    {
      "id": "sug-123",
      "type": "assign",
      "title": "Assign Mike to Smith job",
      "description": "Mike is 3 miles away with matching skills",
      "confidence": 0.92,
      "work_order_id": "456",
      "technician_id": "tech-1",
      "reasoning": "Closest technician with required skills",
      "actions": [
        { "id": "accept", "label": "Accept", "type": "primary" },
        { "id": "dismiss", "label": "Dismiss", "type": "secondary" }
      ]
    }
  ]
}
```

### Natural Language Query

```http
POST /ai/dispatch/query
```

**Request Body:**
```json
{
  "query": "Schedule John for the Smith job tomorrow morning",
  "context": {
    "current_date": "2024-01-20"
  }
}
```

---

## Analytics

### Dashboard Metrics

```http
GET /analytics/dashboard
```

**Response:**
```json
{
  "total_customers": 1523,
  "active_work_orders": 45,
  "revenue_mtd": 125430.50,
  "first_time_fix_rate": 0.87,
  "average_response_time_hours": 2.3,
  "customer_satisfaction": 4.7
}
```

### Equipment Health

```http
GET /analytics/equipment-health
```

### Customer Intelligence

```http
GET /analytics/customer-intelligence
```

---

## Webhooks

### Register Webhook

```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["work_order.created", "work_order.completed", "invoice.paid"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| work_order.created | New work order created |
| work_order.scheduled | Work order scheduled |
| work_order.started | Technician started work |
| work_order.completed | Work order completed |
| invoice.created | Invoice generated |
| invoice.sent | Invoice sent to customer |
| invoice.paid | Invoice paid |
| customer.created | New customer added |
| payment.received | Payment received |

### Webhook Payload

```json
{
  "event": "work_order.completed",
  "timestamp": "2024-01-20T15:30:00Z",
  "data": {
    "work_order_id": "456",
    "customer_id": "123",
    "technician_id": "tech-1",
    "completed_at": "2024-01-20T15:30:00Z"
  },
  "signature": "sha256=xxx"
}
```

---

## Error Handling

All errors return consistent JSON format:

```json
{
  "error": "validation_error",
  "detail": "Invalid email format",
  "hint": "Email must be a valid email address"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## Rate Limiting

- **Standard:** 100 requests per minute
- **Authenticated:** 1000 requests per minute
- **OAuth Apps:** Configurable per app

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 998
X-RateLimit-Reset: 1705762800
```

---

## Pagination

All list endpoints support pagination:

```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

Use `page` and `page_size` query parameters to navigate.

---

## Versioning

API version is included in the URL path: `/api/v2/`

Deprecated endpoints return a `Deprecation` header:
```
Deprecation: true
Sunset: Sat, 01 Mar 2025 00:00:00 GMT
Link: <https://api.example.com/api/v3/customers>; rel="successor-version"
```
