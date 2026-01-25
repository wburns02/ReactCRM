# Email Send Bug Diagnosis

## Date: 2026-01-25

## Problem Statement
In the Email composer, users can compose an email but it never sends. The send button does nothing or fails silently.

## Network Errors Observed
- GET /api/v2/roles returns 401 (expected - optional endpoint)
- GET /api/v2/email/conversations returns 404 (endpoint doesn't exist)
- POST /api/v2/email/send returns 404 Not Found

## Root Cause Analysis

### Backend Routes (react-crm-api)
The backend has email send at:
- Router prefix: `/api/v2/communications`
- Email send endpoint: `POST /email/send`
- **Full correct path: `POST /api/v2/communications/email/send`**

### Frontend Hooks (ReactCRM)

**File 1: `/src/api/hooks/useCommunications.ts`**
```typescript
export function useSendEmail() {
  return useMutation({
    mutationFn: async (data: SendEmailData): Promise<Communication> => {
      const response = await apiClient.post("/email/send", data);  // WRONG
      return response.data;
    },
    // ...
  });
}
```
- Calls: `/email/send` → becomes `/api/v2/email/send` → **404 NOT FOUND**
- Should call: `/communications/email/send` → becomes `/api/v2/communications/email/send`

**File 2: `/src/features/workorders/Communications/hooks/useCommunications.ts`**
```typescript
export function useSendEmail() {
  return useMutation<SendNotificationResponse, Error, SendEmailParams>({
    mutationFn: async ({ to, subject, body, customerId, templateId }) => {
      const payload: SendEmailData = { /* ... */ };
      const response = await apiClient.post<SendNotificationResponse>(
        "/communications/email",  // ALSO WRONG
        payload,
      );
      return response.data;
    },
    // ...
  });
}
```
- Calls: `/communications/email` → becomes `/api/v2/communications/email` → **404 NOT FOUND**
- Should call: `/communications/email/send` → becomes `/api/v2/communications/email/send`

### Email Composer Components Using These Hooks

1. **`/src/features/communications/components/EmailComposeModal.tsx`**
   - Uses `useSendEmail` from `@/api/hooks/useCommunications`
   - Affected by wrong endpoint

2. **`/src/features/workorders/Communications/EmailComposer.tsx`**
   - Uses `useSendEmail` from local `./hooks/useCommunications.ts`
   - Affected by wrong endpoint

## Summary of Issues

| Frontend Hook | Current Endpoint | Correct Endpoint | Status |
|--------------|------------------|------------------|--------|
| `/src/api/hooks/useCommunications.ts` | `/email/send` | `/communications/email/send` | **WRONG** |
| `/src/features/workorders/Communications/hooks/useCommunications.ts` | `/communications/email` | `/communications/email/send` | **WRONG** |

## Fix Required

1. Update `/src/api/hooks/useCommunications.ts`:
   - Change `"/email/send"` to `"/communications/email/send"`

2. Update `/src/features/workorders/Communications/hooks/useCommunications.ts`:
   - Change `"/communications/email"` to `"/communications/email/send"`

3. Verify payload structure matches backend `SendEmailRequest` schema:
   - `to: string` (email address)
   - `subject: string`
   - `body: string`
   - `customer_id: Optional[int]`
   - `source: Optional[str]`
