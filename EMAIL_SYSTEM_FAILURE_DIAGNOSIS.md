# Email System Failure Diagnosis

## Date: 2026-01-25

## Problems
1. GET /api/v2/email/conversations returns 404 Not Found
2. POST /api/v2/communications/email/send returns 422 Unprocessable Content

## Root Cause Analysis

### Issue 1: Email Conversations 404

**Frontend (EmailInbox.tsx line 29):**
```typescript
const response = await apiClient.get("/email/conversations", { ... });
```
This calls `GET /api/v2/email/conversations` which DOES NOT EXIST in the backend.

**Backend available endpoints:**
- `GET /api/v2/communications/history` - communication history with pagination
- No `/email/conversations` endpoint exists

**Fix Required:** Either:
- Option A: Add `GET /api/v2/email/conversations` endpoint to backend
- Option B: Change frontend to use `GET /api/v2/communications/history?type=email`

### Issue 2: Email Send 422

**Frontend sends (EmailComposeModal.tsx + types):**
```typescript
{
  customer_id: "string-uuid",  // Frontend type says string UUID
  email: "test@example.com",   // Wrong field name
  subject: "Test Subject",
  message: "Test body"         // Wrong field name
}
```

**Backend expects (SendEmailRequest schema):**
```python
{
  customer_id: int | None,     # Integer, not string
  to: "test@example.com",      # Field is "to" not "email"
  subject: "Test Subject",
  body: "Test body"            # Field is "body" not "message"
}
```

**Mismatches:**
| Frontend Field | Backend Field | Issue |
|---------------|---------------|-------|
| `email` | `to` | Wrong field name |
| `message` | `body` | Wrong field name |
| `customer_id: string` | `customer_id: int` | Type mismatch |

**Fix Required:** Fix frontend to send correct field names:
- `email` → `to`
- `message` → `body`
- Handle customer_id type (empty string or null for optional int)

## Files Affected

### Frontend Files to Fix:
1. `/src/api/types/communication.ts` - SendEmailData schema
2. `/src/features/communications/components/EmailComposeModal.tsx` - field names
3. `/src/features/communications/pages/EmailInbox.tsx` - endpoint path

### Backend Files (no changes needed):
- `/app/api/v2/communications.py` - routes are correct
- `/app/schemas/message.py` - schemas are correct

## Summary

The email system failures are due to:
1. Non-existent `/email/conversations` endpoint (404)
2. Field name mismatches between frontend and backend (422)

No backend changes needed - only frontend fixes required.
