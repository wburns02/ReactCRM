# Communications Center Placement Plan - ECBTX CRM

**Document:** `docs/architecture/placement/communications.md`
**Status:** Design Complete
**Generated:** 2026-01-09

---

## Executive Summary

This document outlines the strategic placement of a unified **Communications Center** within the ECBTX CRM ecosystem. The plan consolidates existing communications features under a new `/communications` namespace while maintaining backward compatibility.

**Key Decision:** Expand the existing **Communications group** in the sidebar with new messaging features (SMS Inbox, Email Templates) and create a new route hierarchy under `/communications`.

---

## 1. Sidebar Placement Strategy

### Current State
```
Communications (📞)
├── Call Center → /calls
├── Phone Dashboard → /phone
└── Integrations → /integrations
```

### Recommended Expansion
```
Communications (📞)
├── Inbox & Messages → /communications [NEW]
│   ├── SMS Inbox → /communications/sms
│   ├── Email Inbox → /communications/email-inbox
│   └── Message Threads → /communications/threads
├── Call Center → /calls
├── Phone Dashboard → /phone
├── Templates → /communications/templates [NEW]
├── Auto-Reminders → /communications/reminders [NEW]
└── Integrations → /integrations
```

### Unread Badge Implementation
- Real-time badge showing total unread messages
- Update via WebSocket events

### Role-Based Access
- **Admin, Manager**: Full access
- **Dispatcher**: Limited to /calls, /phone, /communications/sms
- **Technician**: None
- **Phone Agent**: Full access

---

## 2. Route Structure

### New Route Hierarchy
```
/communications                  → CommunicationsOverview.tsx
/communications/sms              → SMSInbox.tsx
/communications/sms/:id          → SMSConversation.tsx
/communications/email-inbox      → EmailInbox.tsx
/communications/email-inbox/:id  → EmailConversation.tsx
/communications/templates        → AllTemplates.tsx
/communications/templates/sms    → SMSTemplates.tsx
/communications/templates/email  → EmailTemplates.tsx
/communications/reminders        → ReminderConfig.tsx
/communications/reminders/:id    → ReminderDetail.tsx
```

### Existing Routes (Keep for Backwards Compatibility)
- `/calls` → CallsPage
- `/phone` → PhonePage
- `/integrations` → IntegrationsPage
- `/email-marketing` → EmailMarketingPage
- `/notifications` → NotificationsListPage

---

## 3. Source Code Organization

### Directory Structure
```
src/features/communications/
├── pages/
│   ├── CommunicationsOverview.tsx
│   ├── SMSInbox.tsx
│   ├── SMSConversation.tsx
│   ├── EmailInbox.tsx
│   ├── EmailConversation.tsx
│   ├── AllTemplates.tsx
│   ├── SMSTemplates.tsx
│   ├── EmailTemplates.tsx
│   ├── ReminderConfig.tsx
│   └── ReminderDetail.tsx
├── components/
│   ├── MessageThread/
│   ├── TemplateEditor/
│   ├── ReminderConfig/
│   ├── InboxView/
│   └── OverviewDashboard/
├── hooks/
│   ├── useSMSInbox.ts
│   ├── useSMSConversation.ts
│   ├── useEmailInbox.ts
│   ├── useMessageTemplates.ts
│   ├── useReminders.ts
│   └── useUnreadCount.ts
├── stores/
│   ├── messagingStore.ts
│   ├── templateStore.ts
│   └── reminderStore.ts
├── types/
│   ├── sms.ts
│   ├── email.ts
│   ├── template.ts
│   └── reminder.ts
└── index.ts
```

---

## 4. Feature Requirements

### SMS Inbox (Two-Way Conversations)
- List all SMS conversations by customer
- Display unread count per conversation
- Search conversations
- Send reply SMS
- Display message status

### Email Templates
- List saved email templates
- WYSIWYG editor for HTML emails
- Variable/merge field support
- Preview with sample data

### Auto-Reminders
- Create reminder for work order
- Set hours before appointment
- Choose channel(s): SMS and/or Email
- Select template for each channel
- View send history

---

## 5. API Endpoints

### SMS
```
GET    /api/v2/sms/conversations
GET    /api/v2/sms/conversations/:id
POST   /api/v2/sms/send
GET    /api/v2/sms/templates
POST   /api/v2/sms/templates
```

### Email
```
GET    /api/v2/email/conversations
GET    /api/v2/email/conversations/:id
POST   /api/v2/email/reply
GET    /api/v2/email/templates
POST   /api/v2/email/templates
```

### Reminders
```
GET    /api/v2/reminders
POST   /api/v2/reminders
PATCH  /api/v2/reminders/:id
DELETE /api/v2/reminders/:id
POST   /api/v2/reminders/:id/send
GET    /api/v2/reminders/:id/history
```

---

## 6. Real-Time Features

### WebSocket Events
```typescript
channel.on('message:new', ...)        // New message received
channel.on('message:status-changed')  // Delivery status update
channel.on('reminder:sent')           // Reminder notification
```

---

## 7. Implementation Phases

### Phase 1: MVP
1. Create communications folder structure
2. Implement `/communications` overview
3. Implement SMS inbox and conversation view
4. Add sidebar items

### Phase 2: Email & Templates
1. Implement email inbox
2. Create template editors
3. Add templates CRUD

### Phase 3: Auto-Reminders
1. Implement reminder config page
2. Add reminder scheduling
3. Set up cronjob integration

### Phase 4: Polish
1. Add message virtualization
2. Implement unread badge
3. Performance optimization

---

## 8. File Checklist

### Files to Create
- [ ] `src/features/communications/pages/*.tsx` (10 pages)
- [ ] `src/features/communications/components/*/` (5 component groups)
- [ ] `src/features/communications/hooks/*.ts` (6 hooks)
- [ ] `src/features/communications/stores/*.ts` (3 stores)
- [ ] `src/features/communications/types/*.ts` (4 type files)

### Files to Modify
- [ ] `src/routes/index.tsx` - Add 10 new routes
- [ ] `src/components/layout/AppLayout.tsx` - Update sidebar

---

**COMMUNICATIONS_PLACEMENT_COMPLETE**
