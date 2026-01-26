# Email System Failure Diagnosis

## Error Summary

1. **GET /api/v2/email/conversations -> 404 Not Found**
2. **POST /api/v2/communications/email/send -> 422 Unprocessable Content**

## Root Cause Analysis

### Issue 1: 404 on `/email/conversations`

**Problem:** The frontend calls `GET /api/v2/email/conversations` but this endpoint doesn't exist.

**Where it's called:**
- `EmailConversation.tsx:28` calls `/email/conversations/${id}` for viewing email threads

**Backend reality:**
- Communications router is at `/communications/*`
- Correct endpoint is `GET /communications/history?type=email`
- No `/email/*` router exists except for `/email-marketing/*`

**Fix:** Add `/email/conversations` and `/email/reply` endpoints to backend

### Issue 2: 422 on `/communications/email/send`

**Problem:** Field name mismatch between deployed frontend and backend.

**Frontend sends (DEPLOYED):**
```json
{
  "customer_id": "",
  "email": "test@example.com",
  "subject": "Test Subject",
  "message": "Test body"
}
```

**Backend expects (SendEmailRequest):**
```python
class SendEmailRequest(BaseModel):
    customer_id: Optional[int] = None
    to: str  # NOT "email"
    subject: str
    body: str  # NOT "message"
    source: str = "react"
```

**Validation errors:**
1. `customer_id: ""` can't parse empty string as int
2. `to` field is missing (frontend sends `email`)
3. `body` field is missing (frontend sends `message`)

**Fix:** Update backend schema to accept both old and new field names via aliases

## Files to Modify

### Backend
- `/home/will/projects/react-crm-api/app/schemas/message.py` - Add field aliases
- `/home/will/projects/react-crm-api/app/api/v2/communications.py` - Add email conversations endpoints
