# Realtor Dialer & Pipeline — Architecture Plan

## Module Structure

```
src/features/realtor-pipeline/
├── RealtorPipelinePage.tsx          # Main page (list/pipeline view toggle)
├── RealtorDetailPage.tsx            # Single agent detail + history
├── store.ts                         # Zustand + IndexedDB store
├── types.ts                         # Local types
├── scoring.ts                       # Follow-up urgency scoring
├── components/
│   ├── RealtorDialer.tsx            # Adapted PowerDialer for realtor calls
│   ├── RealtorTable.tsx             # Agent list with search/filter
│   ├── RealtorCard.tsx              # Agent info card (screen pop)
│   ├── PipelineBoard.tsx            # Kanban view (cold→intro'd→warm→active)
│   ├── FollowUpQueue.tsx            # Agents due for contact (3+ weeks)
│   ├── ReferralTracker.tsx          # Referral history + revenue per agent
│   ├── DocumentSender.tsx           # One-click document delivery
│   ├── AgentLeaderboard.tsx         # Gamified referral rankings
│   ├── RealtorFilters.tsx           # Filter by status, county, brokerage
│   ├── RealtorForm.tsx              # Add/edit agent form
│   ├── RealtorImportDialog.tsx      # CSV import for agent lists
│   ├── RealtorCallScript.tsx        # Realtor-specific call scripts
│   └── RealtorDisposition.tsx       # Realtor-specific disposition panel
```

## Data Model

### Frontend (Zustand Store)

```typescript
// Relationship stages
type RealtorStage = "cold" | "introd" | "warm" | "active_referrer";

// Disposition codes for realtor calls
type RealtorDisposition =
  | "no_answer" | "left_voicemail" | "callback_scheduled"
  | "intro_complete" | "one_pager_sent" | "not_interested"
  | "has_inspector" | "wants_quote" | "referral_received"
  | "do_not_call" | "wrong_number";

interface RealtorAgent {
  id: string;
  
  // Identity
  first_name: string;
  last_name: string;
  brokerage: string | null;
  license_number: string | null;
  
  // Contact
  phone: string;
  email: string | null;
  cell: string | null;
  preferred_contact: "call" | "text" | "email";
  
  // Location
  coverage_area: string | null;      // "South Nashville", "Williamson County"
  city: string | null;
  state: string | null;
  zip_code: string | null;
  
  // Relationship
  stage: RealtorStage;
  current_inspector: string | null;   // Who they currently use
  relationship_notes: string | null;
  
  // Call tracking
  call_status: string;
  call_attempts: number;
  last_call_date: string | null;
  last_call_duration: number | null;
  last_disposition: RealtorDisposition | null;
  next_follow_up: string | null;
  
  // Referral tracking
  total_referrals: number;
  total_revenue: number;
  last_referral_date: string | null;
  
  // Documents
  one_pager_sent: boolean;
  one_pager_sent_date: string | null;
  
  // Meta
  assigned_rep: string | null;
  priority: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Referral {
  id: string;
  realtor_id: string;
  
  // Property/job info
  property_address: string;
  homeowner_name: string | null;
  service_type: "inspection" | "pumpout" | "maintenance" | "repair";
  
  // Financial
  invoice_amount: number | null;
  status: "pending" | "scheduled" | "completed" | "paid";
  
  // Dates
  referred_date: string;
  completed_date: string | null;
  
  notes: string | null;
}
```

### Backend (SQLAlchemy — if we persist server-side later)

For now, the realtor pipeline will use the **same pattern as outbound campaigns**: frontend-only Zustand + IndexedDB store. This matches the existing architecture and avoids backend changes for MVP.

Backend models (RealtorAgent, Referral) will be added in Phase 2 when we need:
- Multi-user access to the same agent list
- Server-side referral/revenue reporting
- API-driven document delivery

## UI/UX Design

### Main Page (RealtorPipelinePage.tsx)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Realtor Pipeline                    [+ Add Agent]│
│ [Pipeline] [Table] [Follow-Up] [Leaderboard]    │
├─────────────────────────────────────────────────┤
│                                                  │
│  View content based on selected tab:             │
│                                                  │
│  Pipeline → PipelineBoard (kanban)               │
│  Table → RealtorTable (search/filter/sort)       │
│  Follow-Up → FollowUpQueue (agents due)          │
│  Leaderboard → AgentLeaderboard (rankings)       │
│                                                  │
├─────────────────────────────────────────────────┤
│ Stats bar: Total Agents | Active Referrers |     │
│ Referrals This Month | Revenue This Month        │
└─────────────────────────────────────────────────┘
```

### Pipeline Board (Kanban)

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│   COLD   │  │ INTRO'D  │  │   WARM   │  │ACTIVE REFERRER│
│          │  │          │  │          │  │              │
│ Agent A  │  │ Agent D  │  │ Agent F  │  │ Agent H      │
│ Agent B  │  │ Agent E  │  │ Agent G  │  │ Agent I      │
│ Agent C  │  │          │  │          │  │ Agent J      │
│          │  │          │  │          │  │              │
│ (12)     │  │ (8)      │  │ (5)      │  │ (3)          │
└──────────┘  └──────────┘  └──────────┘  └──────────────┘
```

Drag-and-drop to move agents between stages.

### Dialer Integration

The realtor dialer reuses the existing phone infrastructure:
1. User clicks "Start Dialing" on the pipeline page
2. RealtorDialer component renders (adapted PowerDialer)
3. Contacts are sorted by follow-up urgency (scoring.ts)
4. After each call, realtor-specific dispositions are shown
5. Stage auto-advances based on disposition (intro_complete → introd, referral_received → active_referrer)

### Follow-Up Cadence Logic

```typescript
function getFollowUpUrgency(agent: RealtorAgent): number {
  const daysSinceContact = daysSince(agent.last_call_date);
  const daysSinceReferral = daysSince(agent.last_referral_date);
  
  // Active referrers: follow up every 2 weeks
  if (agent.stage === "active_referrer") {
    if (daysSinceContact > 14) return 100; // Overdue
    if (daysSinceContact > 10) return 80;  // Coming due
    return 20; // Recently contacted
  }
  
  // Warm: follow up every 3 weeks
  if (agent.stage === "warm") {
    if (daysSinceContact > 21) return 90;
    if (daysSinceContact > 14) return 70;
    return 15;
  }
  
  // Intro'd: follow up every 3-4 weeks
  if (agent.stage === "introd") {
    if (daysSinceContact > 28) return 85;
    if (daysSinceContact > 21) return 60;
    return 10;
  }
  
  // Cold: not yet contacted, prioritize by source
  return agent.priority || 50;
}
```

### Document Delivery

One-click send via email (using existing email infrastructure or simple mailto):
- **One-pager** → realtor-one-pager.html (converted to PDF or inline email)
- **Quote** → Generate from pricing ($625 pump-out + $200 inspection = $825)
- **Inspection report** → After a referral job is completed

### Leaderboard

```
┌─────────────────────────────────────────┐
│ 🏆 Top Referral Partners (All Time)     │
├─────────────────────────────────────────┤
│ #1  Sarah Johnson   │ 12 referrals │ $9,900 │
│ #2  Mike Williams   │  8 referrals │ $6,600 │
│ #3  Lisa Chen       │  5 referrals │ $4,125 │
│ #4  David Brown     │  3 referrals │ $2,475 │
├─────────────────────────────────────────┤
│ This Month: 4 referrals │ $3,300 total │
└─────────────────────────────────────────┘
```

## Implementation Sequence

### Chunk 1: Store + Types + Route
- Create `store.ts` with RealtorAgent and Referral models
- Create `types.ts` with all type definitions
- Register route in navigation and router
- Empty page renders with "Realtor Pipeline" header

### Chunk 2: Agent Table + CRUD
- RealtorTable with search, filter, sort
- RealtorForm for add/edit
- RealtorFilters by stage, county, brokerage
- Import dialog for CSV

### Chunk 3: Pipeline Board
- PipelineBoard kanban view
- Drag-and-drop stage changes
- Agent count per stage
- Click card to open detail

### Chunk 4: Dialer Integration
- RealtorDialer (adapted PowerDialer)
- RealtorCallScript with the conversation guide scripts
- RealtorDisposition with realtor-specific codes
- Auto-advance stage based on disposition
- Follow-up date auto-set based on stage cadence

### Chunk 5: Follow-Up Queue
- FollowUpQueue showing agents due for contact
- Sorted by urgency score
- One-click dial from queue
- Visual indicators (overdue = red, coming due = orange, recent = green)

### Chunk 6: Referral Tracking
- ReferralTracker component
- Add/edit referrals per agent
- Revenue calculation
- Referral timeline on agent detail page

### Chunk 7: Document Delivery + Leaderboard
- DocumentSender with one-click email
- AgentLeaderboard rankings
- Stats bar on main page

### Chunk 8: Polish + Testing
- Mobile responsive
- Empty states
- Loading states
- E2E tests
