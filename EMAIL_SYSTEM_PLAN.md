# Email System Fix Plan

## Date: 2026-01-25

## Objective
Fix email inbox loading and email sending to work correctly with backend API.

## Implementation Steps

### 1. Fix Email Send - Field Name Mismatch

**File: `/src/api/types/communication.ts`**

Change `SendEmailData` schema from:
```typescript
export const sendEmailSchema = z.object({
  customer_id: z.string().uuid(),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  template_id: z.string().optional(),
});
```

To:
```typescript
export const sendEmailSchema = z.object({
  customer_id: z.number().int().optional(),  // Backend expects int, optional
  to: z.string().email("Invalid email address"),  // Changed from "email"
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),  // Changed from "message"
  template_id: z.string().optional(),
});
```

### 2. Fix EmailComposeModal to Use Correct Field Names

**File: `/src/features/communications/components/EmailComposeModal.tsx`**

Change line 45-50 from:
```typescript
await sendEmail.mutateAsync({
  customer_id: customerId || "",
  email,
  subject,
  message: body,
});
```

To:
```typescript
await sendEmail.mutateAsync({
  customer_id: customerId ? parseInt(customerId) : undefined,
  to: email,
  subject,
  body,
});
```

### 3. Fix Email Inbox - Use Correct Endpoint

**File: `/src/features/communications/pages/EmailInbox.tsx`**

Change line 29 from:
```typescript
const response = await apiClient.get("/email/conversations", { ... });
```

To:
```typescript
const response = await apiClient.get("/communications/history", {
  params: {
    type: "email",
    search: searchQuery || undefined,
    // unread_only not supported by backend, remove or handle differently
  },
});
```

## Testing Checklist

After implementation:
1. [ ] Email inbox loads - shows email history from communications/history
2. [ ] Compose modal opens
3. [ ] Send email - no 422 error
4. [ ] Send returns 200/201 with message data
5. [ ] Success toast appears
6. [ ] Network tab shows correct field names in request
