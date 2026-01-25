# Email Send Fix Plan

## Date: 2026-01-25

## Objective
Make email sending work reliably by fixing incorrect API endpoint paths in frontend hooks.

## Implementation Steps

### 1. Fix `/src/api/hooks/useCommunications.ts`

Change line 87:
```typescript
// FROM:
const response = await apiClient.post("/email/send", data);

// TO:
const response = await apiClient.post("/communications/email/send", data);
```

### 2. Fix `/src/features/workorders/Communications/hooks/useCommunications.ts`

Change line 117-119:
```typescript
// FROM:
const response = await apiClient.post<SendNotificationResponse>(
  "/communications/email",
  payload,
);

// TO:
const response = await apiClient.post<SendNotificationResponse>(
  "/communications/email/send",
  payload,
);
```

### 3. Verify SMS Endpoint (Similar Issue)

Check if SMS has the same issue:
- Backend has: `POST /api/v2/communications/sms/send`
- Frontend currently calls: `/sms/send` or `/communications/sms`

Fix if needed:
```typescript
// FROM:
const response = await apiClient.post("/sms/send", data);

// TO:
const response = await apiClient.post("/communications/sms/send", data);
```

## User Feedback Already Implemented

Both email composers already have:
- Loading state: `sendEmail.isPending` shows "Sending..." spinner
- Success toast: `toastSuccess("Email sent successfully")`
- Error toast: `toastError("Failed to send email")`

No additional UI changes needed.

## Testing Checklist

After implementation:
1. [ ] Login with will@macseptic.com
2. [ ] Navigate to Email/Communications page
3. [ ] Compose email with to, subject, body
4. [ ] Click Send
5. [ ] Verify spinner shows during send
6. [ ] Verify success toast appears
7. [ ] Verify Network tab shows 200 on `/communications/email/send`
8. [ ] Verify no 404 errors
9. [ ] Test from work order page email composer
10. [ ] Repeat with different email content
