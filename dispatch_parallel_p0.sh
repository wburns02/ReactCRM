#!/bin/bash
# CRM Parallel Implementation - P0 Critical Items
# Run from: C:\Users\Will\crm-work\ReactCRM (or WSL equivalent)
# WARNING: Only use if items don't have dependencies on each other

# Agent 1: SMS Notification System
claude --dangerously-skip-permissions -p "
=== MISSION: SMS Notification System ===

CONTEXT - READ THESE FILES FIRST:
- /analysis/implementation_queue.md (find item #1)
- /analysis/modules/06_communications_analysis.md
- /analysis/research/fsm_research.md (ServiceTitan notifications section)
- /analysis/automation_opportunities.md (Triggered Workflows section)
- /analysis/integration_matrix.md (Operations → Communications)

REQUIREMENTS:
- Appointment confirmations (48hr, 24hr, 2hr, on-way, complete)
- Two-way SMS with routing to conversation view
- Opt-out/TCPA compliance
- Template system with merge fields (customer name, date, time, tech name)
- Delivery tracking and failure handling
- Triggers from work order lifecycle events

IMPLEMENTATION:
1. Backend: 
   - SMS service (Twilio integration ready)
   - Template model and API
   - Message queue for reliability
   - Webhook for delivery status
   - Opt-out tracking
   
2. Frontend:
   - Template manager UI
   - Conversation view (2-way)
   - Delivery status indicators
   - Opt-out management
   
3. Automation:
   - Work order status → SMS trigger config
   - Scheduled sends
   
4. Tests:
   - Template CRUD
   - Send flow (mock Twilio)
   - Delivery webhook handling
   - Opt-out flow
   - Two-way conversation

OUTPUT:
- Working SMS system
- Evidence in /evidence/sms_notifications/
- Update implementation_queue.md when complete

Read context. Plan in /implementation/sms_notifications/plan.md. Build. Test. Commit.
" &

# Agent 2: Offline-First Mobile
claude --dangerously-skip-permissions -p "
=== MISSION: Offline-First Mobile App ===

CONTEXT - READ THESE FILES FIRST:
- /analysis/implementation_queue.md (find item #2)
- /analysis/modules/05_operations_analysis.md
- /analysis/research/fsm_research.md (Mobile Technician Experience section)
- /analysis/ux_audit.md (Mobile Responsiveness section)

REQUIREMENTS:
- Work orders accessible without connectivity
- Photo capture queued for sync
- Digital signatures work offline
- Time tracking continues offline
- Automatic sync when connectivity returns
- Conflict resolution for concurrent edits
- Clear UI indicators for offline/syncing/online state

IMPLEMENTATION:
1. Service Worker:
   - Cache critical assets
   - API request interception
   - Background sync registration
   
2. IndexedDB:
   - Work order local storage
   - Photo blob storage
   - Sync queue management
   - Conflict tracking
   
3. Sync Engine:
   - Queue management
   - Retry logic
   - Conflict resolution (last-write-wins with notification)
   - Batch sync for efficiency
   
4. UI:
   - Offline indicator (banner/icon)
   - Sync status per record
   - Pending changes indicator
   - Conflict resolution UI
   
5. Tests:
   - Offline work order access
   - Photo capture offline
   - Sync on reconnect
   - Conflict scenario

OUTPUT:
- Working offline mobile
- Evidence in /evidence/offline_mobile/
- Update implementation_queue.md when complete

Read context. Plan in /implementation/offline_mobile/plan.md. Build. Test. Commit.
" &

# Agent 3: Real-Time Technician Tracking
claude --dangerously-skip-permissions -p "
=== MISSION: Real-Time Technician Tracking ===

CONTEXT - READ THESE FILES FIRST:
- /analysis/implementation_queue.md (find item #3)
- /analysis/modules/05_operations_analysis.md
- /analysis/research/fsm_research.md (GPS/Tracking section)
- /analysis/integration_matrix.md (Operations → Dashboard)

REQUIREMENTS:
- GPS capture from mobile app (configurable interval: 30s-5min)
- Live map in dispatch/operations view
- ETA calculation based on current location
- Customer-facing tracking link ('Your technician is X minutes away')
- Location history for route verification
- Geofencing for auto clock-in/out at job site
- Privacy controls (tracking only during work hours)

IMPLEMENTATION:
1. Mobile:
   - Geolocation service
   - Background location (with permission)
   - Battery-efficient intervals
   - Location upload queue
   
2. Backend:
   - Location ingestion API
   - Location history storage
   - ETA calculation service
   - Geofence definitions
   - Customer tracking token generation
   
3. Dispatch Frontend:
   - Live map with technician markers
   - Click tech → see current job, ETA
   - Route visualization
   - Location history playback
   
4. Customer Tracking:
   - Public tracking page (token-based)
   - Live map with tech location
   - ETA countdown
   - Tech name and photo
   
5. Tests:
   - Location capture and upload
   - Map rendering with markers
   - ETA calculation
   - Customer tracking page
   - Geofence trigger

OUTPUT:
- Working tracking system
- Evidence in /evidence/realtime_tracking/
- Update implementation_queue.md when complete

Read context. Plan in /implementation/realtime_tracking/plan.md. Build. Test. Commit.
" &

# Wait for all agents to complete
wait
echo "=== ALL P0 AGENTS COMPLETE ==="
echo "Check /evidence/ folders for results"
echo "Check implementation_queue.md for updated status"
