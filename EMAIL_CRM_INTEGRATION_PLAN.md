# Email CRM Integration - Implementation Plan

## Objective
Make email fully functional in the CRM with proper sending, customer linking, and history display.

---

## Phase 1: Fix Email Send Endpoint (Backend)

### File: `/home/will/react-crm-api/app/api/v2/communications.py`

**Current Issue:**
- Email endpoint creates message but doesn't set from_address
- No actual email delivery (just marked as "queued")

**Fix Required:**

```python
@router.post("/email/send", response_model=MessageResponse)
async def send_email(
    request: SendEmailRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    # RBAC check
    if not has_permission(current_user, Permission.SEND_EMAIL):
        raise HTTPException(status_code=403, detail="Permission denied")

    # Create message record with from_address
    message = Message(
        customer_id=request.customer_id,
        type=MessageType.email,
        direction=MessageDirection.outbound,
        status=MessageStatus.pending,
        to_address=request.to,
        from_address="support@macseptic.com",  # ADD THIS
        subject=request.subject,
        content=request.body,
        source=request.source,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    # Mark as sent (for now, until SendGrid integration)
    message.status = MessageStatus.sent
    message.sent_at = datetime.utcnow()
    await db.commit()
    await db.refresh(message)

    return message
```

---

## Phase 2: Implement Communications Stats Endpoint

### File: `/home/will/react-crm-api/app/api/v2/communications.py`

**Add new endpoint:**

```python
@router.get("/stats")
async def get_communication_stats(
    db: DbSession,
    current_user: CurrentUser,
):
    """Get communication statistics."""
    # Count unread SMS (inbound, received status)
    sms_query = select(func.count()).select_from(Message).where(
        (Message.type == MessageType.sms) &
        (Message.direction == MessageDirection.inbound) &
        (Message.status == MessageStatus.received)
    )
    sms_result = await db.execute(sms_query)
    unread_sms = sms_result.scalar() or 0

    # Count unread emails
    email_query = select(func.count()).select_from(Message).where(
        (Message.type == MessageType.email) &
        (Message.direction == MessageDirection.inbound)
    )
    email_result = await db.execute(email_query)
    unread_email = email_result.scalar() or 0

    return {
        "unread_sms": unread_sms,
        "unread_email": unread_email,
        "pending_reminders": 0,  # Placeholder
    }
```

---

## Phase 3: Implement Communications Activity Endpoint

### File: `/home/will/react-crm-api/app/api/v2/communications.py`

**Add new endpoint:**

```python
@router.get("/activity")
async def get_communication_activity(
    db: DbSession,
    current_user: CurrentUser,
    limit: int = Query(10, ge=1, le=50),
):
    """Get recent communication activity."""
    query = select(Message).order_by(Message.created_at.desc()).limit(limit)
    result = await db.execute(query)
    messages = result.scalars().all()

    return {
        "items": [
            {
                "id": m.id,
                "type": m.type.value,
                "direction": m.direction.value,
                "status": m.status.value,
                "to_address": m.to_address,
                "from_address": m.from_address,
                "subject": m.subject,
                "content": m.content[:100] if m.content else None,  # Preview
                "customer_id": m.customer_id,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
        "total": len(messages),
    }
```

---

## Phase 4: Add Customer Communication History to Frontend

### File: `/home/will/ReactCRM/src/features/customers/CustomerDetailPage.tsx`

**Add communications tab/section that:**
1. Calls `useCommunicationHistory(customerId)`
2. Displays email/SMS list with type icons
3. Shows sent_at, subject (for email), content preview
4. Links to full conversation view

---

## Phase 5: (Future) SendGrid Integration

### Create: `/home/will/react-crm-api/app/services/email_service.py`

```python
import sendgrid
from sendgrid.helpers.mail import Mail

class EmailService:
    def __init__(self):
        self.api_key = settings.SENDGRID_API_KEY
        self.from_email = settings.EMAIL_FROM_ADDRESS or "support@macseptic.com"
        self.sg = sendgrid.SendGridAPIClient(api_key=self.api_key)

    async def send_email(self, to: str, subject: str, body: str) -> dict:
        message = Mail(
            from_email=self.from_email,
            to_emails=to,
            subject=subject,
            html_content=body,
        )
        response = self.sg.send(message)
        return {
            "status_code": response.status_code,
            "message_id": response.headers.get("X-Message-Id"),
        }
```

### Environment Variables
```env
SENDGRID_API_KEY=SG.xxxxxxxxxx
EMAIL_FROM_ADDRESS=support@macseptic.com
```

---

## Implementation Order

### Step 1: Fix Email Send (Critical Path)
1. Edit `/app/api/v2/communications.py`
2. Add `from_address="support@macseptic.com"`
3. Change status to `sent` instead of `queued`
4. Commit and push to GitHub
5. Wait for Railway deploy
6. Test with Playwright

### Step 2: Add Stats Endpoint
1. Add `/stats` endpoint to communications.py
2. Commit and push
3. Test - Communications Overview should show stats

### Step 3: Add Activity Endpoint
1. Add `/activity` endpoint to communications.py
2. Commit and push
3. Test - Recent Activity should populate

### Step 4: Playwright Tests
Create `e2e/tests/email-crm-integration.e2e.spec.ts`:
- Test email send returns 200
- Test email appears in inbox
- Test email appears in customer history
- Test stats endpoint returns counts

---

## Success Criteria

- [ ] POST /communications/email/send returns 200/201
- [ ] Email appears in /communications/email-inbox
- [ ] Email linked to customer (customer_id populated)
- [ ] GET /communications/stats returns valid counts
- [ ] GET /communications/activity returns recent messages
- [ ] Customer detail page shows email history
- [ ] All Playwright tests pass

---

## Files to Modify

### Backend (react-crm-api)
1. `/app/api/v2/communications.py` - Fix email send, add stats, add activity
2. `/app/config.py` - Add EMAIL_FROM_ADDRESS setting (optional)

### Frontend (ReactCRM)
1. Verify EmailComposeModal.tsx works with fixed backend
2. (Future) Add communication history to CustomerDetailPage

---

## Commit Messages

```
1. "Fix email send endpoint - add from_address and status"
2. "Add /communications/stats endpoint for inbox counts"
3. "Add /communications/activity endpoint for recent messages"
4. "Add Playwright tests for email CRM integration"
```
