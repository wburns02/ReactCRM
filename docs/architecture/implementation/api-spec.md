# ECBTX CRM API Specification - Feature Implementation

**Document:** `docs/architecture/implementation/api-spec.md`
**Version:** 2.0
**Base URL:** `https://react-crm-api-production.up.railway.app/api/v2`
**Status:** Ready for Backend Implementation
**Generated:** 2026-01-09

---

## Overview

This document specifies all FastAPI endpoints required for the five major features:

1. **GPS Tracking** - Real-time technician location tracking
2. **Work Orders** - Photo capture, digital signatures, inspection forms
3. **Field Service** - Mobile technician experience
4. **Communications** - SMS, email, templates, reminders
5. **Billing** - Estimates, payment links, public payments

---

## 1. GPS TRACKING ENDPOINTS

### POST /technicians/{id}/location
Upload current technician location
- **Auth:** Required (technician)
- **Body:** `{ latitude, longitude, accuracy, speed, heading, timestamp }`
- **Response:** Location object with id

### GET /technicians/{id}/location/current
Get latest location for technician
- **Auth:** Required (admin, manager, dispatcher)
- **Query:** `include_history` (boolean)

### GET /technicians/locations
Get all active technician locations (map view)
- **Auth:** Required (admin, manager, dispatcher)
- **Query:** `status_filter`, `radius_km`, `center_lat`, `center_lon`

### POST /tracking/sessions
Create tracking session (generates customer token)
- **Auth:** Required (admin, manager, dispatcher)
- **Body:** `{ work_order_id, technician_id, customer_id, duration_minutes }`

### GET /tracking/sessions/{token}
Get tracking data for public page
- **Auth:** None (public via token)
- **Response:** Technician location, ETA, destination

### POST /geofences
Create geofence zone
- **Auth:** Required (admin, manager)
- **Body:** `{ name, center_latitude, center_longitude, radius_km }`

### GET /geofences
List all geofences
- **Auth:** Required (admin, manager, dispatcher)

### GET /geofences/{id}/events
Get entry/exit events
- **Auth:** Required (admin, manager, dispatcher)
- **Query:** `limit`, `start_date`, `end_date`

---

## 2. WORK ORDERS ENDPOINTS

### POST /work-orders/{id}/photos
Upload photo for work order
- **Auth:** Required (technician, dispatcher, admin)
- **Content-Type:** multipart/form-data
- **Fields:** `file`, `caption`, `category`, `latitude`, `longitude`

### GET /work-orders/{id}/photos
Get all photos for work order
- **Auth:** Required
- **Query:** `category`, `limit`

### POST /work-orders/{id}/signature
Capture signature
- **Auth:** Required (technician, dispatcher, admin)
- **Body:** `{ signature_data, signer_type, signer_name }`

### GET /work-orders/{id}/signatures
Get all signatures
- **Auth:** Required

### POST /work-orders/{id}/inspection
Submit inspection form
- **Auth:** Required (technician, dispatcher, admin)
- **Body:** `{ form_template_id, sections, overall_notes }`

### GET /inspection-templates
List inspection templates
- **Auth:** Required

---

## 3. FIELD SERVICE ENDPOINTS

### GET /technicians/{id}/jobs
Get jobs assigned to technician
- **Auth:** Required (technician, dispatcher, admin)
- **Query:** `status`, `date`, `limit`

### GET /technicians/{id}/jobs/{work_order_id}
Get detailed job information
- **Auth:** Required (technician, dispatcher, admin)

### PATCH /work-orders/{id}/status
Update work order status
- **Auth:** Required (technician, dispatcher, admin)
- **Body:** `{ status, notes, latitude, longitude }`

### PATCH /work-orders/{id}/status/completed
Mark work order complete
- **Auth:** Required (technician, dispatcher, admin)
- **Body:** `{ completed_at, actual_duration_minutes, notes, photos, signatures }`

### GET /technicians/{id}/stats
Get technician performance metrics
- **Auth:** Required
- **Query:** `period` (week, month, quarter, year)

---

## 4. COMMUNICATIONS ENDPOINTS

### GET /sms/conversations
List SMS conversations
- **Auth:** Required (admin, manager, dispatcher, phone_agent)
- **Query:** `limit`, `unread_only`, `search`

### GET /sms/conversations/{id}
Get SMS conversation thread
- **Auth:** Required
- **Query:** `limit`, `offset`

### POST /sms/send
Send SMS to customer
- **Auth:** Required
- **Body:** `{ customer_id, phone_number, content, template_id }`

### GET /email/conversations
List email conversations
- **Auth:** Required

### POST /email/reply
Send email reply
- **Auth:** Required
- **Body:** `{ conversation_id, subject, body, template_id }`

### GET /templates
List communication templates
- **Auth:** Required
- **Query:** `type` (sms, email), `category`

### POST /templates
Create template
- **Auth:** Required (admin, manager)
- **Body:** `{ type, name, category, content, variables }`

### POST /reminders
Create auto-reminder
- **Auth:** Required (admin, manager, dispatcher)
- **Body:** `{ work_order_id, reminder_type, hours_before, channels, template_ids }`

### GET /reminders
List reminders
- **Auth:** Required
- **Query:** `status`, `limit`

### GET /reminders/{id}/history
Get reminder send history
- **Auth:** Required

---

## 5. BILLING ENDPOINTS

### POST /estimates
Create estimate
- **Auth:** Required (admin, manager, billing)
- **Body:** `{ customer_id, work_order_id, line_items, labor_hours }`

### GET /estimates
List estimates
- **Auth:** Required
- **Query:** `status`, `customer_id`, `limit`

### POST /estimates/{id}/send
Send estimate to customer
- **Auth:** Required
- **Body:** `{ customer_email, send_method, message }`

### POST /estimates/{id}/convert-to-invoice
Convert accepted estimate to invoice
- **Auth:** Required

### POST /payment-links
Generate payment link
- **Auth:** Required (admin, manager, billing)
- **Body:** `{ invoice_id, amount, expires_in_days, allow_partial }`

### GET /payment-links
List payment links
- **Auth:** Required
- **Query:** `status`, `invoice_id`

### GET /pay/{token}
Get payment link details (PUBLIC)
- **Auth:** None (public via token)
- **Response:** Invoice details, amount, customer info

### POST /pay/{token}/process
Process payment (PUBLIC)
- **Auth:** None (public via token)
- **Body:** `{ payment_method, card_token, amount, billing_email }`

### POST /payments
Record manual payment
- **Auth:** Required (admin, manager, billing)
- **Body:** `{ invoice_id, amount, method, reference }`

### POST /payments/{id}/refund
Process refund
- **Auth:** Required
- **Body:** `{ amount, reason, notes }`

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |

---

## Implementation Priorities

### Phase 1 (P0) - GPS Tracking
- Technician location endpoints
- Tracking sessions & public links
- Geofence CRUD

### Phase 2 (P1) - Work Orders & Field Service
- Photo upload
- Digital signatures
- Inspection forms
- Technician job queries

### Phase 3 (P2) - Communications
- SMS inbox & conversations
- Email templates
- Auto-reminders

### Phase 4 (P3) - Billing
- Estimates CRUD
- Payment links
- Public payment processing

---

**API_SPECIFICATION_COMPLETE**
