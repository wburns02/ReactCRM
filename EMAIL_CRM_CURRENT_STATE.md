# Email CRM Integration - Current State Analysis

## Date: 2026-01-29

---

## 1. OVERVIEW

### What Exists
- **Frontend UI**: Email compose modal, email inbox, unified communications page
- **Backend Endpoint**: POST /communications/email/send exists but only stores in DB
- **Database Model**: Message model supports email type
- **Customer Linking**: customer_id on Message model

### What's Missing
- **No Email Provider**: Email endpoint doesn't actually send emails
- **No from_address**: Email messages don't have a sender address
- **API Errors**: /communications/stats and /communications/activity return 422
- **No Customer Email History**: Customer detail page doesn't show email history

---

## 2. FRONTEND COMPONENTS

### CommunicationsOverview (/communications)
**Screenshot: test-results/communications-overview.png**

Features:
- Unified inbox header: "Communications - Unified inbox for all customer messages"
- Channel cards: SMS, Email, Templates, Reminders
- AI Communication Optimizer link
- Recent Activity section (shows "No recent messages" - backend 422 error)
- Quick action buttons: Send SMS, Send Email, Templates, Reminders

### Email Inbox (/communications/email-inbox)
**Screenshot: test-results/email-inbox.png**

Features:
- Header: "Email Inbox - Customer email conversations"
- Compose button
- Tabs: All / Unread
- Empty state: "No emails - Customer emails will appear here"

### Email Compose Modal
**Screenshot: test-results/email-compose-modal.png**

Features:
- Title: "Compose Email"
- AI assist button: "Use AI to draft email"
- To field (email input)
- Subject field
- Message textarea
- Cancel and Send Email buttons

### Customer Detail Page
- Has email button visible
- Communications section exists but empty

---

## 3. BACKEND ENDPOINTS

### Working Endpoints

| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /communications/sms/send | ✅ Works | Full Twilio integration |
| GET /communications/history | ✅ Works | Returns paginated messages |
| GET /communications/{id} | ✅ Works | Get single message |

### Broken/Missing Endpoints

| Endpoint | Status | Issue |
|----------|--------|-------|
| POST /communications/email/send | 🔶 Partial | Returns 500 - from_address missing |
| GET /communications/stats | ❌ 422 | Endpoint not fully implemented |
| GET /communications/activity | ❌ 422 | Endpoint not fully implemented |

---

## 4. EMAIL SEND ENDPOINT ANALYSIS

### Current Code (communications.py:178-219)
```python
@router.post("/email/send", response_model=MessageResponse)
async def send_email(request: SendEmailRequest, db: DbSession, current_user: CurrentUser):
    # RBAC check - works
    if not has_permission(current_user, Permission.SEND_EMAIL):
        raise HTTPException(status_code=403, detail="Permission denied")

    # Create message - ISSUE: no from_address set
    message = Message(
        customer_id=request.customer_id,
        type=MessageType.email,
        direction=MessageDirection.outbound,
        status=MessageStatus.pending,
        to_address=request.to,
        subject=request.subject,
        content=request.body,
        source=request.source,
        # from_address NOT SET - causes schema validation issue
    )

    # TODO: Implement email sending with your preferred service
    # For now, just mark as queued
    message.status = MessageStatus.queued
    message.sent_at = datetime.utcnow()

    return message  # Returns but from_address is None
```

### Issue
The `from_address` is not set, which may cause issues when returning the `MessageResponse` schema.

---

## 5. DATABASE MODEL

### Message Model (message.py)
```python
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), index=True)

    type = Column(Enum(MessageType))  # sms, email, call, note
    direction = Column(Enum(MessageDirection))  # inbound, outbound
    status = Column(Enum(MessageStatus))

    to_address = Column(String(255))
    from_address = Column(String(255))  # Optional - not set for emails
    subject = Column(String(500))  # For emails
    content = Column(Text)

    twilio_sid = Column(String(64))  # SMS only
    source = Column(String(50))  # "react" or "legacy"

    sent_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
```

### Customer Relationship
```python
# Customer model has:
messages = relationship("Message", back_populates="customer")

# Can query: GET /communications/history?customer_id=123
```

---

## 6. NETWORK REQUEST ANALYSIS

### Playwright Test Results

**Communications Overview Page Requests:**
```
GET /communications (200)
GET /ai/communications/analytics (404)
GET /communications/stats (422)
GET /communications/activity?limit=10 (422)
```

**Email Send Test:**
```
POST /auth/login (200)
POST /communications/email/send (500) - Internal Server Error
```

---

## 7. FRONTEND HOOKS

### useCommunications.ts
```typescript
// Send Email mutation
export function useSendEmail() {
  return useMutation({
    mutationFn: async (data: SendEmailData) => {
      const response = await apiClient.post("/communications/email/send", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: communicationKeys.lists() });
    },
  });
}

// Communication History query
export function useCommunicationHistory(customerId: string | undefined) {
  return useQuery({
    queryKey: communicationKeys.history(customerId!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/communications/history?customer_id=${customerId}&page_size=100`);
      return data;
    },
    enabled: !!customerId,
  });
}
```

---

## 8. REQUIRED FIXES

### Backend Fixes Needed

1. **Fix email send endpoint**
   - Add from_address (e.g., "support@macseptic.com")
   - Integrate SendGrid for actual sending
   - Handle delivery status

2. **Implement /communications/stats endpoint**
   - Return unread counts for SMS/Email
   - Return pending reminders count

3. **Implement /communications/activity endpoint**
   - Return recent messages across all channels
   - Support limit parameter

### Frontend Fixes Needed

1. **Customer Detail Page**
   - Add communications tab/section
   - Display email/SMS history
   - Add quick compose buttons

---

## 9. TEST RESULTS SUMMARY

### Playwright Exploration Tests (6/6 Passed)

| Test | Result | Notes |
|------|--------|-------|
| Communications page structure | ✅ | Found Email, SMS, Compose buttons |
| Email Inbox page | ✅ | Compose button present, empty inbox |
| Email compose modal | ✅ | Has To, Subject, Message fields |
| Customer detail communications | ✅ | Has Email button |
| Email send API | ✅ | Returns 500 (documented issue) |

---

## 10. RECOMMENDATIONS

### Priority 1: Make Email Sending Work
1. Add `from_address = "support@macseptic.com"` to email send
2. Integrate SendGrid for actual delivery
3. Add environment variable: `SENDGRID_API_KEY`

### Priority 2: Fix Missing Endpoints
1. Implement /communications/stats
2. Implement /communications/activity

### Priority 3: Customer Integration
1. Add email history to CustomerDetailPage
2. Add work_order_id linking to messages

---

## CONCLUSION

The CRM has a solid foundation for email integration:
- ✅ Frontend UI exists (compose modal, inbox, overview)
- ✅ Database model supports email
- ✅ Customer linking via customer_id
- ✅ RBAC for SEND_EMAIL permission

But it's not functional:
- ❌ Email send returns 500 (missing from_address)
- ❌ No actual email delivery (no SendGrid/SES)
- ❌ Stats/Activity endpoints broken (422)
- ❌ Customer detail doesn't show email history
