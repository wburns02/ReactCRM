# RALPH WIGGUM COMMUNICATIONS FUNCTIONALITY
# Buttons exist but do nothing - make entire page functional
# Run with: /ralph-loop communications-functional.md

---

## PHASE 1: AUDIT CURRENT STATE
### Completion Promise: COMMUNICATIONS_AUDITED

#### AGENT 1.1: Map All Broken Features
```prompt
AUDIT AGENT: Inventory all Communications features and their current state.

FROM SCREENSHOTS - FEATURES TO CHECK:

MAIN PAGE (/communications):
- SMS card → should navigate to SMS Inbox
- Email card → should navigate to Email Inbox  
- Templates card → should navigate to Message Templates
- Reminders card → should navigate to Auto-Reminders
- "Send SMS" quick action → should open compose modal
- "Send Email" quick action → should open compose modal
- "Templates" quick action → should navigate to templates
- "Reminders" quick action → should navigate to reminders
- Recent Activity feed → should show real messages

SMS INBOX (/communications/sms):
- "New Message" button → DOES NOTHING (broken)
- Search conversations → should filter list
- Conversation list → should show real SMS threads
- Click conversation → should open thread detail

SIDEBAR ITEMS:
- Inbox & Messages
- SMS Inbox
- Email Inbox
- Call Center
- Phone Dashboard
- Message Templates
- Auto-Reminders
- Integrations

TASKS:
1. Find the Communications feature directory
2. Read each page component - identify what's implemented vs stubbed
3. Check for missing onClick handlers, empty functions, TODO comments
4. List which API endpoints exist vs missing
5. Document: What works? What's broken? What's missing entirely?

Output findings to console, then proceed to fixes.

Output "COMMUNICATIONS_AUDITED" when done.
```

---

## PHASE 2: FIX SMS INBOX
### Completion Promise: SMS_INBOX_FUNCTIONAL
### Depends On: COMMUNICATIONS_AUDITED

#### AGENT 2.1: New Message Button
```prompt
SMS NEW MESSAGE AGENT: Make the "New Message" button functional.

CURRENT STATE: Button exists but onClick does nothing.

REQUIREMENTS:
1. Click "New Message" → opens modal/dialog
2. Modal contains:
   - Customer/phone number selector (searchable)
   - Message textarea
   - Character count (160 SMS limit)
   - Send button
3. Send button → calls SMS API → shows success toast → refreshes inbox
4. Close modal on success or cancel

IMPLEMENTATION APPROACH:
1. Find the New Message button in SMS Inbox component
2. Create or wire up NewMessageModal component
3. Add state for modal open/close
4. Implement send handler with API call
5. Handle loading, success, error states

Test: Click New Message → compose → send → verify appears in inbox.

Output "NEW_MESSAGE_FUNCTIONAL" when done.
```

#### AGENT 2.2: Conversation List
```prompt
SMS CONVERSATIONS AGENT: Make conversation list functional.

CURRENT STATE: Shows "No SMS conversations" empty state.

REQUIREMENTS:
1. Fetch real conversations from API on page load
2. Display list with: customer name, phone, last message preview, timestamp
3. Click conversation → opens conversation detail (right panel or new route)
4. Conversation detail shows full message thread
5. Can reply from detail view
6. Real-time or polling updates for new messages

IMPLEMENTATION APPROACH:
1. Find/create useConversations hook with React Query
2. Check API endpoint exists: GET /api/sms/conversations
3. If no endpoint, check if using Twilio/RingCentral - find correct data source
4. Render conversation list with proper components
5. Add conversation detail view

Test: If no real data, send a test SMS first, then verify it appears.

Output "CONVERSATIONS_FUNCTIONAL" when done.
```

#### AGENT 2.3: Search Functionality
```prompt
SMS SEARCH AGENT: Make search box functional.

CURRENT STATE: Search input exists but doesn't filter.

REQUIREMENTS:
1. Type in search → filters conversation list
2. Search by customer name or phone number
3. Debounce input (300ms)
4. Show "No results" if no matches
5. Clear search restores full list

IMPLEMENTATION:
1. Add search state to SMS Inbox component
2. Filter conversations client-side OR call search API
3. Connect input onChange to filter function

Test: Type customer name → list filters → clear → list restores.

Output "SEARCH_FUNCTIONAL" when done.
```

---

## PHASE 3: FIX EMAIL INBOX
### Completion Promise: EMAIL_INBOX_FUNCTIONAL
### Depends On: SMS_INBOX_FUNCTIONAL

#### AGENT 3.1: Email Compose
```prompt
EMAIL COMPOSE AGENT: Make email functionality work.

REQUIREMENTS:
1. "Send Email" or email compose button → opens compose modal
2. Modal contains:
   - To: customer selector or email input
   - Subject line
   - Rich text body (or plain textarea)
   - Send button
3. Send → calls email API → success feedback

IMPLEMENTATION:
1. Find Email Inbox component
2. Create/wire up EmailComposeModal
3. Implement send with API call
4. Handle all states

Test: Compose email → send → verify in sent or activity log.

Output "EMAIL_COMPOSE_FUNCTIONAL" when done.
```

---

## PHASE 4: FIX TEMPLATES
### Completion Promise: TEMPLATES_FUNCTIONAL
### Depends On: EMAIL_INBOX_FUNCTIONAL

#### AGENT 4.1: Message Templates CRUD
```prompt
TEMPLATES AGENT: Make templates management functional.

REQUIREMENTS:
1. View list of existing templates
2. Create new template:
   - Name
   - Type (SMS/Email)
   - Content with variables ({{customer_name}}, {{appointment_date}}, etc.)
   - Save button
3. Edit existing template
4. Delete template (with confirmation)
5. Use template when composing message

IMPLEMENTATION:
1. Find Message Templates page
2. Implement CRUD operations with API
3. Add template selector to SMS/Email compose modals

Test: Create template → edit → use in compose → delete.

Output "TEMPLATES_FUNCTIONAL" when done.
```

---

## PHASE 5: FIX AUTO-REMINDERS
### Completion Promise: REMINDERS_FUNCTIONAL
### Depends On: TEMPLATES_FUNCTIONAL

#### AGENT 5.1: Auto-Reminders Configuration
```prompt
REMINDERS AGENT: Make auto-reminders functional.

REQUIREMENTS:
1. View/manage reminder rules:
   - Appointment reminder (24h before)
   - Appointment reminder (2h before)
   - Service complete follow-up
   - Payment reminder
2. Each rule has:
   - Enable/disable toggle
   - Template selection
   - Timing configuration
   - Channel (SMS/Email/Both)
3. Save configuration

IMPLEMENTATION:
1. Find Auto-Reminders page
2. Create reminder rule management UI
3. Connect to API for saving settings
4. Show which reminders are active

Test: Enable a reminder → configure → save → verify setting persists.

Output "REMINDERS_FUNCTIONAL" when done.
```

---

## PHASE 6: FIX QUICK ACTIONS & NAVIGATION
### Completion Promise: NAVIGATION_FUNCTIONAL
### Depends On: REMINDERS_FUNCTIONAL

#### AGENT 6.1: Wire Up All Buttons
```prompt
NAVIGATION AGENT: Ensure all cards and buttons navigate/act correctly.

MAIN PAGE CARDS:
- SMS card → /communications/sms
- Email card → /communications/email
- Templates card → /communications/templates
- Reminders card → /communications/reminders

QUICK ACTION BUTTONS:
- Send SMS → open SMS compose modal (not navigate)
- Send Email → open Email compose modal
- Templates → /communications/templates
- Reminders → /communications/reminders

SIDEBAR:
- All items should navigate to correct routes
- Active state should highlight current page

IMPLEMENTATION:
1. Check each card/button has proper onClick or Link
2. Add missing handlers
3. Verify routes exist in router config
4. Test each navigation path

Output "NAVIGATION_FUNCTIONAL" when done.
```

---

## PHASE 7: RECENT ACTIVITY FEED
### Completion Promise: ACTIVITY_FEED_FUNCTIONAL
### Depends On: NAVIGATION_FUNCTIONAL

#### AGENT 7.1: Populate Activity Feed
```prompt
ACTIVITY FEED AGENT: Make Recent Activity show real data.

CURRENT STATE: Shows "No recent messages" empty state.

REQUIREMENTS:
1. Fetch recent communications from all channels
2. Display: type icon, customer name, preview, timestamp, status
3. Click item → navigates to full conversation
4. Auto-refresh or real-time updates
5. Show last 20-50 items

IMPLEMENTATION:
1. Find/create unified activity API endpoint
2. Or aggregate from SMS + Email endpoints
3. Render activity list with proper formatting
4. Add click handlers to navigate

Test: Send SMS → activity feed updates → click → opens conversation.

Output "ACTIVITY_FEED_FUNCTIONAL" when done.
```

---

## PHASE 8: INTEGRATION CHECK
### Completion Promise: INTEGRATIONS_CHECKED

#### AGENT 8.1: Verify Backend Connectivity
```prompt
INTEGRATIONS AGENT: Verify SMS/Email actually sends.

CHECK:
1. SMS Integration:
   - What provider? (Twilio, RingCentral, etc.)
   - Are credentials configured?
   - Test send works end-to-end?

2. Email Integration:
   - What provider? (SendGrid, SES, SMTP?)
   - Credentials configured?
   - Test send works?

3. If integrations not configured:
   - Add clear error message: "SMS not configured - add credentials in Settings"
   - Link to integration settings page

Test: Send real SMS to your phone → verify received.
Test: Send real email → verify received.

Output "INTEGRATIONS_CHECKED" when done.
```

---

## PHASE 9: TEST ALL FLOWS
### Completion Promise: COMMUNICATIONS_TESTED

#### AGENT 9.1: End-to-End Testing
```prompt
TEST AGENT: Test every feature end-to-end.

TEST CHECKLIST:

SMS:
[ ] New Message button opens modal
[ ] Can select customer/enter phone
[ ] Can type message with character count
[ ] Send succeeds (or shows config error)
[ ] Message appears in inbox
[ ] Search filters conversations
[ ] Click conversation opens detail
[ ] Can reply in thread

EMAIL:
[ ] Compose button works
[ ] Can enter recipient, subject, body
[ ] Send succeeds (or shows config error)

TEMPLATES:
[ ] Can view templates list
[ ] Can create new template
[ ] Can edit template
[ ] Can delete template
[ ] Can use template in compose

REMINDERS:
[ ] Can view reminder rules
[ ] Can enable/disable rules
[ ] Can configure timing
[ ] Settings save correctly

NAVIGATION:
[ ] All cards navigate correctly
[ ] All sidebar items work
[ ] Quick actions trigger correct behavior

ACTIVITY:
[ ] Shows recent messages
[ ] Click navigates to detail

Fix any failures found.

Output "COMMUNICATIONS_TESTED" when done.
```

---

## PHASE 10: COMMIT
### Completion Promise: COMMUNICATIONS_COMPLETE

#### AGENT 10.1: Commit All Changes
```prompt
COMMIT AGENT: Commit functional Communications module.

Commit message:
"feat(communications): Make Communications page fully functional

- SMS: New message modal, conversation list, search, reply
- Email: Compose modal, send functionality
- Templates: Full CRUD operations
- Reminders: Configuration UI
- Activity feed: Shows real messages
- Navigation: All buttons and cards work

All features tested end-to-end"

Push to deploy.

Output "COMMUNICATIONS_COMPLETE" when done.
```

---

# COMPLETION

```
COMMUNICATIONS_COMPLETE
COMMUNICATIONS_COMPLETE
COMMUNICATIONS_COMPLETE

Communications module now fully functional:
✓ New Message sends SMS
✓ Conversation list loads and displays
✓ Search filters conversations
✓ Email compose works
✓ Templates CRUD operational
✓ Reminders configurable
✓ Activity feed populates
✓ All navigation works

Test at: https://react.ecbtx.com/communications
```
